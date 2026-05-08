"""
RAG query endpoint — single-turn Q&A over the school knowledge base.

Cost optimisations applied:
  • Local FastEmbed replaces OpenAI for query embedding  — $0 embedding cost
  • Two-layer response cache (exact + semantic)          — ~50% fewer Claude calls
  • top_k reduced 5 → 3                                 — shorter context = fewer tokens
  • max_tokens reduced 1024 → 512                       — ~30% cheaper per call
"""
import json
import logging
import os
from typing import Optional

import numpy as np
from anthropic import Anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from services.cache import get_cached, set_cached
from services.db import AsyncSessionLocal
from services.embedder import embed_query

logger = logging.getLogger(__name__)
router = APIRouter()

claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


# ─── Models ─────────────────────────────────────────────────────────────────


class QueryRequest(BaseModel):
    query: str
    school_id: str
    tenant_id: str
    doc_type: Optional[str] = None
    top_k: int = 3   # reduced from 5


class SourceChunk(BaseModel):
    chunk_id: str
    document_id: str
    doc_title: str
    chunk_index: int
    content: str
    score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    query: str
    cached: bool = False


# ─── Helpers ────────────────────────────────────────────────────────────────


def _cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


async def _retrieve(
    query_emb: list[float],
    school_id: str,
    tenant_id: str,
    doc_type: Optional[str],
    top_k: int,
) -> list[tuple[float, object]]:
    sql = """
        SELECT kc.id, kc.document_id, kc.chunk_index,
               kc.content, kc.embedding_json, kd.title AS doc_title
        FROM knowledge_chunks kc
        JOIN knowledge_documents kd ON kd.id = kc.document_id
        WHERE kc.school_id = :sid
          AND kc.tenant_id = :tid
          AND kd.status = 'READY'
    """
    params: dict = {"sid": school_id, "tid": tenant_id}
    if doc_type:
        sql += " AND kd.doc_type = :dtype"
        params["dtype"] = doc_type

    async with AsyncSessionLocal() as session:
        rows = (await session.execute(text(sql), params)).fetchall()

    scored: list[tuple[float, object]] = []
    for row in rows:
        try:
            scored.append((_cosine(query_emb, json.loads(row.embedding_json)), row))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]


# ─── Endpoint ───────────────────────────────────────────────────────────────


@router.post("/query", response_model=QueryResponse)
async def query_knowledge_base(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=422, detail="Query must not be empty")

    # Embed locally — free
    query_emb = await embed_query(req.query)

    # Cache check — skip Claude if we have a hit
    cached = await get_cached(req.school_id, req.query, query_emb)
    if cached:
        return QueryResponse(**cached, cached=True)

    top = await _retrieve(query_emb, req.school_id, req.tenant_id, req.doc_type, req.top_k)

    if not top:
        return QueryResponse(
            answer="No knowledge base documents have been ingested for your school yet.",
            sources=[],
            query=req.query,
        )

    context_parts: list[str] = []
    sources: list[SourceChunk] = []
    for rank, (score, row) in enumerate(top, 1):
        context_parts.append(f"[Source {rank}: {row.doc_title}]\n{row.content}")
        sources.append(SourceChunk(
            chunk_id=str(row.id),
            document_id=str(row.document_id),
            doc_title=row.doc_title,
            chunk_index=row.chunk_index,
            content=row.content,
            score=round(score, 4),
        ))

    prompt = (
        "You are a school assistant. Answer using ONLY the context documents below. "
        "Cite sources as [Source 1], [Source 2], etc. "
        "If the answer is not in the context: \"I don't have that information in the available documents.\"\n\n"
        f"CONTEXT:\n{chr(10).join(context_parts)}\n\n"
        f"QUESTION: {req.query}"
    )

    try:
        message = claude_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,   # reduced from 1024
            messages=[{"role": "user", "content": prompt}],
        )
        answer = message.content[0].text
    except Exception as exc:
        logger.error("Claude generation failed: %s", exc)
        answer = "Unable to generate an answer right now. Please try again."

    response_data = {"answer": answer, "sources": [s.model_dump() for s in sources], "query": req.query}
    await set_cached(req.school_id, req.query, query_emb, response_data)

    return QueryResponse(answer=answer, sources=sources, query=req.query, cached=False)
