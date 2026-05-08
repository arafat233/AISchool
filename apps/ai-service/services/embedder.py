"""
Local text embedding service using FastEmbed (ONNX runtime, no PyTorch).
Model: BAAI/bge-small-en-v1.5  —  384-dim, ~130 MB, auto-downloaded on first use.
CPU inference runs in a thread-pool executor so it never blocks the asyncio loop.
Zero external API cost.
"""
import asyncio
import logging
from functools import partial

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384
_MODEL_NAME = "BAAI/bge-small-en-v1.5"
_model = None


def _get_model():
    global _model
    if _model is None:
        from fastembed import TextEmbedding
        logger.info("Loading local embedding model %s …", _MODEL_NAME)
        _model = TextEmbedding(_MODEL_NAME)
        logger.info("Embedding model ready (dim=%d)", EMBEDDING_DIM)
    return _model


def _embed_sync(texts: list[str]) -> list[list[float]]:
    return [emb.tolist() for emb in _get_model().embed(texts)]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. CPU-bound inference runs off the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_embed_sync, texts))


async def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    results = await embed_texts([text])
    return results[0]
