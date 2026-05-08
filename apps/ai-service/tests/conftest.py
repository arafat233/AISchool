"""
Shared fixtures for AI service tests.

Uses FastAPI's TestClient with dependency-overrides to replace
the real AsyncSession (get_db) with an async mock, so no actual
database connection is required.
"""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

# Set required env vars before importing main so module-level code picks them up
os.environ.setdefault("AI_SERVICE_API_KEY", "test-key")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")

# Patch init_db to be a no-op before importing main
import sys, types

# Stub out services.db before main.py imports it
db_module = types.ModuleType("services.db")

class _FakeSession:
    """Minimal async SQLAlchemy session stub."""
    def __init__(self, rows=None):
        self._rows = rows or []

    async def execute(self, *args, **kwargs):
        result = MagicMock()
        result.mappings.return_value.fetchone.return_value = self._rows[0] if self._rows else None
        result.mappings.return_value.__iter__ = lambda s: iter(self._rows)
        result.mappings.return_value.fetchall.return_value = self._rows
        return result

async def _noop_init_db():
    pass

db_module.init_db = _noop_init_db

_session = _FakeSession()

async def _get_db():
    yield _session

class _FakeSessionLocal:
    """Async context manager that yields the shared fake session."""
    def __init__(self):
        self._s = _FakeSession()

    async def __aenter__(self):
        return self._s

    async def __aexit__(self, *_):
        return False

    def __call__(self):
        return self

db_module.get_db = _get_db
db_module.AsyncSessionLocal = _FakeSessionLocal()
sys.modules["services.db"] = db_module

# Stub services.embedder — prevents fastembed model download during tests
embedder_module = types.ModuleType("services.embedder")
embedder_module.EMBEDDING_DIM = 384

async def _fake_embed_texts(texts):
    return [[0.01] * 384 for _ in texts]

async def _fake_embed_query(text):
    return [0.01] * 384

embedder_module.embed_texts = _fake_embed_texts
embedder_module.embed_query = _fake_embed_query
sys.modules["services.embedder"] = embedder_module

# Stub services.cache — prevents Redis connection during tests
cache_module = types.ModuleType("services.cache")
_fake_redis = AsyncMock()
_fake_redis.get = AsyncMock(return_value=None)
_fake_redis.setex = AsyncMock(return_value=True)
cache_module.get_redis = MagicMock(return_value=_fake_redis)

async def _noop_get_cached(*args, **kwargs):
    return None

async def _noop_set_cached(*args, **kwargs):
    pass

async def _noop_invalidate(*args, **kwargs):
    pass

cache_module.get_cached = _noop_get_cached
cache_module.set_cached = _noop_set_cached
cache_module.invalidate_school = _noop_invalidate
sys.modules["services.cache"] = cache_module

# Now import the app
from main import app  # noqa: E402 — must be after stubs


@pytest.fixture
def client():
    """TestClient with DB overridden to empty results. API key pre-set."""
    with TestClient(app, raise_server_exceptions=True, headers={"X-AI-Service-Key": "test-key"}) as c:
        yield c


@pytest.fixture
def mock_db():
    """Return the shared fake session so tests can set ._rows."""
    return _session
