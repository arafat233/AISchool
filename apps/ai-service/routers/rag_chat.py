"""
RAG chat endpoint — multi-turn conversation.

Cost optimisations applied:
  • Local FastEmbed replaces OpenAI for message embedding  — $0 embedding cost
  • top_k reduced 4 → 3                                   — shorter context
  • max_tokens reduced 1024 → 512                         — ~30% cheaper per turn
  • Trivial-message bypass (greetings / ack)              — skips retrieval + Claude call
  • Re-uses the same Redis client as the cache layer
"""
import json
import logging
import os
import re
import uuid
from typing import Optional

import numpy as np
from anthropic import Anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from services.cache import get_redis
from services.db import AsyncSessionLocal
from services.embedder import embed_query

logger = logging.getLogger(__name__)
router = APIRouter()

claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

SESSION_TTL = 86_400   # 24 h
MAX_HISTORY = 10       # complete turns kept in Claude context

# Short messages that need no retrieval — answer directly from history
_TRIVIAL_RE = re.compile(
    r"^(ok|okay|thanks|thank you|got it|understood|sure|great|nice|alright|hmm|yes|no|hi|hello|bye)[\s!.]*$",
    re.IGNORECASE,
)


# ─── Models ─────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    message: str
    school_id: str
    tenant_id: str
    user_id: str
    session_id: Optional[str] = None
    context: str = "GENERAL"
    top_k: int = 3   # reduced from 4


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    sources: list[dict]
    history: list[ChatMessage]


# ─── Helpers ────────────────────────────────────────────────────────────────


def _cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


async def _retrieve_chunks(
    query_emb: list[float], school_id: str, tenant_id: str,
    doc_type: Optional[str], top_k: int,
) -> list[dict]:
    sql = """
        SELECT kc.id, kc.chunk_index, kc.content, kc.embedding_json,
               kd.title AS doc_title, kd.id AS document_id
        FROM knowledge_chunks kc
        JOIN knowledge_documents kd ON kd.id = kc.document_id
        WHERE kc.school_id = :sid AND kc.tenant_id = :tid AND kd.status = 'READY'
    """
    params: dict = {"sid": school_id, "tid": tenant_id}
    if doc_type and doc_type != "GENERAL":
        sql += " AND kd.doc_type = :dtype"
        params["dtype"] = doc_type

    async with AsyncSessionLocal() as session:
        rows = (await session.execute(text(sql), params)).fetchall()

    scored = []
    for row in rows:
        try:
            scored.append((_cosine(query_emb, json.loads(row.embedding_json)), row))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {"id": str(r.id), "document_id": str(r.document_id), "doc_title": r.doc_title,
         "chunk_index": r.chunk_index, "content": r.content, "score": round(s, 4)}
        for s, r in scored[:top_k]
    ]


async def _load_history(session_id: str) -> list[dict]:
    r = get_redis()
    cached = await r.get(f"rag_chat:{session_id}")
    if cached:
        return json.loads(cached)
    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            text("SELECT messages FROM rag_chat_sessions WHERE id = :id"), {"id": session_id}
        )).fetchone()
    return row.messages if row else []


async def _save_history(session_id: str, history: list[dict]) -> None:
    payload = json.dumps(history)
    r = get_redis()
    await r.setex(f"rag_chat:{session_id}", SESSION_TTL, payload)
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("UPDATE rag_chat_sessions SET messages = :msgs::jsonb, updated_at = NOW() WHERE id = :id"),
            {"msgs": payload, "id": session_id},
        )
        await db.commit()


# ─── Endpoints ──────────────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=422, detail="Message must not be empty")

    # Session setup
    if req.session_id:
        session_id = req.session_id
        history = await _load_history(session_id)
    else:
        session_id = str(uuid.uuid4())
        history = []
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO rag_chat_sessions
                        (id, school_id, tenant_id, user_id, context, messages, created_at, updated_at)
                    VALUES (:id, :sid, :tid, :uid, :ctx, '[]'::jsonb, NOW(), NOW())
                """),
                {"id": session_id, "sid": req.school_id, "tid": req.tenant_id,
                 "uid": req.user_id, "ctx": req.context},
            )
            await db.commit()

    # Trivial-message bypass — no retrieval, no embeddings, simple Claude call
    is_trivial = bool(_TRIVIAL_RE.match(req.message.strip())) and len(history) > 0
    chunks: list[dict] = []

    if is_trivial:
        context_block = ""
    else:
        query_emb = await embed_query(req.message)
        doc_type = req.context if req.context != "GENERAL" else None
        chunks = await _retrieve_chunks(query_emb, req.school_id, req.tenant_id, doc_type, req.top_k)
        context_block = (
            "\n\n---\n\n".join(
                f"[Source {i+1}: {c['doc_title']}]\n{c['content']}" for i, c in enumerate(chunks)
            ) if chunks else ""
        )

    recent = history[-(MAX_HISTORY * 2):]
    user_content = req.message
    if context_block:
        user_content = f"[Knowledge base excerpts]\n{context_block}\n\n[Question]\n{req.message}"

    claude_messages = recent + [{"role": "user", "content": user_content}]

    system_prompt = (
        "You are a helpful school assistant. "
        "Answer questions using any provided document excerpts. "
        "Cite sources as [Source 1], [Source 2], etc. when referencing them. "
        "If no excerpts are provided, use the conversation history. "
        "Keep answers concise."
    )

    try:
        response = claude_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,   # reduced from 1024
            system=system_prompt,
            messages=claude_messages,
        )
        answer = response.content[0].text
    except Exception as exc:
        logger.error("Claude chat failed: %s", exc)
        answer = "I'm having trouble responding right now. Please try again."

    history.append({"role": "user", "content": req.message})
    history.append({"role": "assistant", "content": answer})
    await _save_history(session_id, history)

    return ChatResponse(
        session_id=session_id,
        answer=answer,
        sources=chunks,
        history=[ChatMessage(role=m["role"], content=m["content"]) for m in history],
    )


@router.get("/chat/{session_id}")
async def get_session_history(session_id: str):
    history = await _load_history(session_id)
    if not history:
        async with AsyncSessionLocal() as db:
            exists = (await db.execute(
                text("SELECT 1 FROM rag_chat_sessions WHERE id = :id"), {"id": session_id}
            )).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "history": history}
