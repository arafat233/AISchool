"""
RAG document ingestion pipeline.
Accepts PDF / DOCX / plain-text uploads, chunks them, generates local
embeddings (BAAI/bge-small-en-v1.5, 384-dim, zero API cost), and persists
chunks to the knowledge_chunks table.

Cost optimisations applied:
  • Local FastEmbed model replaces OpenAI — $0 embedding cost
  • Content-hash dedup — skip re-embedding identical files (SQL copy instead)
  • RAG semantic cache invalidated on successful ingest
"""
import hashlib
import io
import json
import logging
from typing import Optional

import tiktoken
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import text

from services.cache import invalidate_school
from services.db import AsyncSessionLocal
from services.embedder import embed_texts

logger = logging.getLogger(__name__)
router = APIRouter()

CHUNK_TOKENS = 512
CHUNK_OVERLAP = 64
enc = tiktoken.get_encoding("cl100k_base")


# ─── Text extraction ────────────────────────────────────────────────────────


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(para.text for para in doc.paragraphs)


# ─── Chunking ───────────────────────────────────────────────────────────────


def _chunk_text(full_text: str) -> list[str]:
    tokens = enc.encode(full_text)
    chunks: list[str] = []
    start = 0
    while start < len(tokens):
        end = min(start + CHUNK_TOKENS, len(tokens))
        chunks.append(enc.decode(tokens[start:end]))
        if end >= len(tokens):
            break
        start += CHUNK_TOKENS - CHUNK_OVERLAP
    return [c for c in chunks if c.strip()]


# ─── Endpoint ───────────────────────────────────────────────────────────────


@router.post("/ingest")
async def ingest_document(
    document_id: str = Form(...),
    school_id: str = Form(...),
    tenant_id: str = Form(...),
    doc_type: str = Form("GENERAL"),
    file: UploadFile = File(...),
):
    raw = await file.read()
    filename = file.filename or ""
    mime = file.content_type or ""

    # ── Content-hash dedup ──────────────────────────────────────────────────
    content_hash = hashlib.sha256(raw).hexdigest()

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(
                text("""
                    SELECT id FROM knowledge_documents
                    WHERE school_id = :sid
                      AND content_hash = :hash
                      AND status = 'READY'
                      AND id != :did
                    LIMIT 1
                """),
                {"sid": school_id, "hash": content_hash, "did": document_id},
            )
        ).fetchone()

        if existing:
            # Clone chunks from the existing document via a single SQL INSERT
            await session.execute(
                text("""
                    INSERT INTO knowledge_chunks
                        (id, document_id, tenant_id, school_id, chunk_index,
                         content, embedding_json, token_count, created_at)
                    SELECT gen_random_uuid(), :new_did, tenant_id, school_id,
                           chunk_index, content, embedding_json, token_count, NOW()
                    FROM knowledge_chunks
                    WHERE document_id = :src_did
                """),
                {"new_did": document_id, "src_did": str(existing.id)},
            )
            chunk_count_row = (
                await session.execute(
                    text("SELECT COUNT(*) AS n FROM knowledge_chunks WHERE document_id = :did"),
                    {"did": document_id},
                )
            ).fetchone()
            chunk_count = chunk_count_row.n if chunk_count_row else 0
            await session.execute(
                text("""
                    UPDATE knowledge_documents
                    SET status = 'READY', chunk_count = :n,
                        content_hash = :hash, updated_at = NOW()
                    WHERE id = :id
                """),
                {"n": chunk_count, "hash": content_hash, "id": document_id},
            )
            await session.commit()
            logger.info(
                "Dedup: document %s cloned %d chunks from %s",
                document_id, chunk_count, existing.id,
            )
            return {"document_id": document_id, "chunks_created": chunk_count, "status": "READY", "deduped": True}

    # ── Extract text ────────────────────────────────────────────────────────
    try:
        if mime == "application/pdf" or filename.lower().endswith(".pdf"):
            full_text = _extract_pdf(raw)
        elif (
            mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            or filename.lower().endswith(".docx")
        ):
            full_text = _extract_docx(raw)
        else:
            full_text = raw.decode("utf-8", errors="replace")
    except Exception as exc:
        await _mark_failed(document_id, f"Extraction error: {exc}")
        raise HTTPException(status_code=422, detail=f"Text extraction failed: {exc}")

    if not full_text.strip():
        await _mark_failed(document_id, "Document contains no extractable text")
        raise HTTPException(status_code=422, detail="Document contains no extractable text")

    # ── Chunk ───────────────────────────────────────────────────────────────
    chunks = _chunk_text(full_text)
    if not chunks:
        await _mark_failed(document_id, "No chunks produced")
        raise HTTPException(status_code=422, detail="Document produced no chunks after tokenisation")

    # ── Embed (local model, no API cost) ────────────────────────────────────
    try:
        embeddings = await embed_texts(chunks)
    except Exception as exc:
        await _mark_failed(document_id, f"Embedding error: {exc}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    # ── Persist ─────────────────────────────────────────────────────────────
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("UPDATE knowledge_documents SET status = 'PROCESSING', updated_at = NOW() WHERE id = :id"),
            {"id": document_id},
        )
        await session.execute(
            text("DELETE FROM knowledge_chunks WHERE document_id = :did"),
            {"did": document_id},
        )
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            await session.execute(
                text("""
                    INSERT INTO knowledge_chunks
                        (id, document_id, tenant_id, school_id, chunk_index,
                         content, embedding_json, token_count, created_at)
                    VALUES
                        (gen_random_uuid(), :did, :tid, :sid, :idx,
                         :content, :emb, :tc, NOW())
                """),
                {
                    "did": document_id,
                    "tid": tenant_id,
                    "sid": school_id,
                    "idx": idx,
                    "content": chunk,
                    "emb": json.dumps(embedding),
                    "tc": len(enc.encode(chunk)),
                },
            )
        await session.execute(
            text("""
                UPDATE knowledge_documents
                SET status = 'READY', chunk_count = :n,
                    content_hash = :hash, updated_at = NOW()
                WHERE id = :id
            """),
            {"n": len(chunks), "hash": content_hash, "id": document_id},
        )
        await session.commit()

    # Invalidate cached RAG responses so new content is immediately queryable
    try:
        await invalidate_school(school_id)
    except Exception:
        pass  # non-critical

    logger.info("Ingested document %s: %d chunks", document_id, len(chunks))
    return {"document_id": document_id, "chunks_created": len(chunks), "status": "READY", "deduped": False}


async def _mark_failed(document_id: str, error_msg: str) -> None:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(
                text("""
                    UPDATE knowledge_documents
                    SET status = 'FAILED', error_msg = :msg, updated_at = NOW()
                    WHERE id = :id
                """),
                {"msg": error_msg[:500], "id": document_id},
            )
            await session.commit()
    except Exception as exc:
        logger.error("Could not mark document %s as FAILED: %s", document_id, exc)
