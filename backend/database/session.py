"""
ParkTwin AI — Async SQLAlchemy Session Factory
==============================================
Provides the async engine, session factory, and FastAPI dependency.

The single async engine is shared across all backend modules (the canonical
``Base`` is imported here and ``init_db`` creates every module's tables). The
database backend is selected via ``DATABASE_URL`` (aiosqlite for local dev,
asyncpg/PostgreSQL in production).
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine


from backend.core.config import get_settings
from backend.database.models import Base, Camera, CameraStatus
from shared.logging import get_logger

logger = get_logger("database")


def create_app_engine(raw_url: str, echo: bool = False) -> AsyncEngine:
    """Create an AsyncEngine dynamically for SQLite (aiosqlite) or PostgreSQL (asyncpg)."""
    url = raw_url.strip() if raw_url else "sqlite+aiosqlite:///./data/parktwin.db"

    # Normalize scheme for async drivers
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    if "sqlite" in url:
        db_file = url.split(":///")[-1]
        if db_file and db_file != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(db_file)), exist_ok=True)
        eng = create_async_engine(
            url,
            echo=echo,
            pool_pre_ping=True,
            connect_args={"timeout": 30.0},
        )
        from sqlalchemy import event

        @event.listens_for(eng.sync_engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, _):
            cursor = dbapi_conn.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA busy_timeout=15000")
                cursor.execute("PRAGMA synchronous=NORMAL")
            except Exception:
                pass
            finally:
                cursor.close()

        return eng
    else:
        return create_async_engine(
            url,
            echo=echo,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
        )



settings = get_settings()
engine = create_app_engine(settings.database.url, echo=settings.database.echo)

# ─── Session factory ──────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ─── FastAPI Dependency ───────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session and close it after request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all Module 1 tables and seed cameras from settings."""
    from sqlalchemy.exc import OperationalError
    from sqlalchemy import text, select

    # Connection retry (tolerant of slow-starting Postgres).
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except OperationalError as e:
        raise RuntimeError(f"Database connection failed: {e}") from e

    import modules.analytics.storage.models  # noqa: F401
    import modules.reporting.storage.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Camera).limit(1))
            if result.scalar_one_or_none() is None:
                for source in settings.cameras.sources:
                    db.add(Camera(
                        camera_id=source.id,
                        name=source.name,
                        url=str(source.url),
                        zone=source.zone or "general",
                        status=CameraStatus.ONLINE if source.enabled else CameraStatus.OFFLINE,
                        fps_target=source.fps_target or 25,
                        is_enabled=source.enabled,
                    ))
                await db.commit()
                logger.info(f"Seeded {len(settings.cameras.sources)} camera(s) into the database.")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error seeding database: {e}")
