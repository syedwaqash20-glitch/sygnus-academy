import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base

logger = logging.getLogger("sygnus.database")

# Resolve absolute path to .env
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "")
FORCE_SQLITE = os.getenv("FORCE_SQLITE", "false").lower() in ("true", "1", "yes")

def get_engine():
    """
    Creates an asynchronous engine configured for PostgreSQL, CockroachDB, Turso, or SQLite.
    Includes security best practices: SSL mode enforcement, pool pre-ping, pool recycle.
    """
    url = DATABASE_URL.strip() if DATABASE_URL else ""
    
    if FORCE_SQLITE or not url:
        logger.info("Using SQLite database (sqlite+aiosqlite:///./sygnus.db)")
        return create_async_engine(
            "sqlite+aiosqlite:///./sygnus.db",
            echo=False,
            connect_args={"check_same_thread": False}
        )

    # Format postgresql URLs for asyncpg if standard driver prefix is used
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("cockroachdb://"):
        url = url.replace("cockroachdb://", "cockroachdb+asyncpg://", 1)

    if "sqlite" in url:
        return create_async_engine(
            url,
            echo=False,
            connect_args={"check_same_thread": False}
        )

    # PostgreSQL / Layerbase / CockroachDB async engine with security & pool recycling
    import urllib.parse

    connect_args = {"timeout": 15}
    if "ssl=require" in url or "sslmode=require" in url or os.getenv("DB_SSL_REQUIRE", "false").lower() in ("true", "1"):
        connect_args["ssl"] = True

    # Parse and remove query parameters unsupported by asyncpg (e.g. sslmode)
    if "postgresql+asyncpg://" in url or "cockroachdb+asyncpg://" in url:
        parsed = urllib.parse.urlsplit(url)
        q_params = urllib.parse.parse_qs(parsed.query)
        if "sslmode" in q_params:
            q_params.pop("sslmode", None)
            connect_args["ssl"] = True
        if "ssl" in q_params:
            q_params.pop("ssl", None)
            connect_args["ssl"] = True
        if "-pooler." in parsed.netloc:
            connect_args["statement_cache_size"] = 0
        clean_query = urllib.parse.urlencode(q_params, doseq=True)
        url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, clean_query, parsed.fragment))

    try:
        return create_async_engine(
            url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,      # Prevents stale/broken connections
            pool_recycle=1800,       # Recycles connections after 30 minutes
            connect_args=connect_args
        )
    except Exception as e:
        logger.warning(f"Failed to create PostgreSQL engine ({e}). Falling back to SQLite.")
        return create_async_engine(
            "sqlite+aiosqlite:///./sygnus.db",
            echo=False,
            connect_args={"check_same_thread": False}
        )

engine = get_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    """Dependency for obtaining an asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()