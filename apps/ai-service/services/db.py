"""Async PostgreSQL connection via SQLAlchemy + asyncpg."""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

_raw_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://school_erp:secret_change_in_production@localhost:5432/school_erp")
# Convert sync postgres URL to async and strip Prisma-only query params
if _raw_url.startswith("postgresql://"):
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
# Remove Prisma-specific params that asyncpg doesn't understand
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
_parsed = urlparse(_raw_url)
_params = {k: v for k, v in parse_qs(_parsed.query).items() if k not in ("schema", "connection_limit", "pool_timeout", "connect_timeout", "sslmode")}
_clean_query = urlencode({k: v[0] for k, v in _params.items()})
DATABASE_URL = urlunparse(_parsed._replace(query=_clean_query))

engine = create_async_engine(DATABASE_URL, pool_size=10, max_overflow=20, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Validate connection on startup."""
    async with engine.begin() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
