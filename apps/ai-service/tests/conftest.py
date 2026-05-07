"""
Shared fixtures for AI service tests.

Uses FastAPI's TestClient with dependency-overrides to replace
the real AsyncSession (get_db) with an async mock, so no actual
database connection is required.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

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

db_module.get_db = _get_db
sys.modules["services.db"] = db_module

# Now import the app
from main import app  # noqa: E402 — must be after stub


@pytest.fixture
def client():
    """TestClient with DB overridden to empty results."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def mock_db():
    """Return the shared fake session so tests can set ._rows."""
    return _session
