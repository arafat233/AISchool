"""
RAG response cache — two layers to maximise hit rate:

  Layer 1 — exact match
    Key: SHA-256 of normalised query text, TTL 1 h.
    Catches repeated identical questions (very common in school context).

  Layer 2 — semantic match
    Stores last 200 (embedding, response) pairs per school.
    Returns a cached response when a new query embedding has cosine
    similarity ≥ 0.92 with a stored one.  TTL 6 h.

Both layers are keyed per school_id — tenants are fully isolated.
"""
import hashlib
import json
import logging
import os
from typing import Optional

import numpy as np
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
EXACT_TTL = 3_600       # 1 h
SEM_TTL = 21_600        # 6 h
MAX_SEM_ENTRIES = 200   # rolling window of stored embeddings per school
SIM_THRESHOLD = 0.92    # cosine similarity required for a semantic hit

_redis: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


def _normalise(query: str) -> str:
    return " ".join(query.lower().split())


def _cosine(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


async def get_cached(
    school_id: str,
    query: str,
    query_emb: list[float],
) -> Optional[dict]:
    """Return a cached response dict or None on miss."""
    r = get_redis()

    # Layer 1: exact
    q_hash = hashlib.sha256(_normalise(query).encode()).hexdigest()[:20]
    hit = await r.get(f"rag_exact:{school_id}:{q_hash}")
    if hit:
        logger.debug("RAG exact-cache hit  school=%s", school_id)
        return json.loads(hit)

    # Layer 2: semantic
    raw = await r.get(f"rag_sem:{school_id}")
    if raw:
        entries: list[dict] = json.loads(raw)
        best_sim, best_resp = 0.0, None
        for e in entries:
            sim = _cosine(query_emb, e["emb"])
            if sim > best_sim:
                best_sim, best_resp = sim, e["resp"]
        if best_sim >= SIM_THRESHOLD and best_resp is not None:
            logger.debug(
                "RAG semantic-cache hit  school=%s  sim=%.3f", school_id, best_sim
            )
            return best_resp

    return None


async def set_cached(
    school_id: str,
    query: str,
    query_emb: list[float],
    response: dict,
) -> None:
    """Populate both cache layers for a new response."""
    r = get_redis()

    # Layer 1: exact
    q_hash = hashlib.sha256(_normalise(query).encode()).hexdigest()[:20]
    await r.setex(f"rag_exact:{school_id}:{q_hash}", EXACT_TTL, json.dumps(response))

    # Layer 2: semantic — rolling append, capped at MAX_SEM_ENTRIES
    sem_key = f"rag_sem:{school_id}"
    raw = await r.get(sem_key)
    entries: list[dict] = json.loads(raw) if raw else []
    entries.append({"emb": query_emb, "resp": response})
    if len(entries) > MAX_SEM_ENTRIES:
        entries = entries[-MAX_SEM_ENTRIES:]
    await r.setex(sem_key, SEM_TTL, json.dumps(entries))


async def invalidate_school(school_id: str) -> None:
    """Drop all cached responses for a school (call after re-ingest)."""
    r = get_redis()
    sem_key = f"rag_sem:{school_id}"
    await r.delete(sem_key)
    logger.info("RAG cache invalidated for school %s", school_id)
