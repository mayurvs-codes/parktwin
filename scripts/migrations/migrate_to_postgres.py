"""
ParkTwin AI — SQLite to PostgreSQL Migration Tool
===================================================
Migrates records from the SQLite database to a PostgreSQL database.
Idempotent: skips rows whose primary key already exists in the target database.

Usage:
  python scripts/migrations/migrate_to_postgres.py \
      --sqlite-url sqlite+aiosqlite:///./parktwin.db \
      --postgres-url postgresql+asyncpg://parktwin:secret@localhost:5432/parktwin_db
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from typing import Any, List, Type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.database.models import Base, Camera, DetectionLog, Vehicle
from modules.parking_intelligence.storage.models import ParkingEvent, ParkingSession, ParkingSlot
from modules.analytics.storage.models import AnalyticsSnapshot
from modules.reporting.storage.models import ReportRecord
from shared.logging import get_logger

logger = get_logger("migrate_to_postgres")


def _get_pk_attr(model_cls: Type[Any]) -> str:
    """Return primary key attribute name for a given model."""
    mapper = model_cls.__mapper__
    return mapper.primary_key[0].name


async def migrate_model(
    sqlite_session: AsyncSession,
    pg_session: AsyncSession,
    model_cls: Type[Any],
) -> int:
    """Copy rows from sqlite to postgres, skipping existing rows by primary key."""
    pk_attr = _get_pk_attr(model_cls)

    # 1. Fetch existing PKs in Postgres
    pg_res = await pg_session.execute(select(getattr(model_cls, pk_attr)))
    existing_pks = set(pg_res.scalars().all())

    # 2. Fetch all rows from SQLite
    sqlite_res = await sqlite_session.execute(select(model_cls))
    rows = sqlite_res.scalars().all()

    inserted_count = 0
    for row in rows:
        pk_val = getattr(row, pk_attr)
        if pk_val in existing_pks:
            continue

        # Convert row instance to dictionary of column values
        data = {c.name: getattr(row, c.name) for c in model_cls.__table__.columns}
        new_row = model_cls(**data)
        pg_session.add(new_row)
        inserted_count += 1

    if inserted_count > 0:
        await pg_session.commit()

    return inserted_count


async def run_migration(sqlite_url: str, postgres_url: str) -> None:
    # Ensure scheme compatibility
    if sqlite_url.startswith("sqlite://") and not sqlite_url.startswith("sqlite+aiosqlite://"):
        sqlite_url = sqlite_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    if postgres_url.startswith("postgresql://") or postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)

    print(f"[*] Source SQLite:     {sqlite_url}")
    print(f"[*] Target PostgreSQL: {postgres_url}")

    sqlite_engine = create_async_engine(sqlite_url)
    pg_engine = create_async_engine(postgres_url, echo=False)

    # Ensure tables exist in Postgres
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SqliteSession = async_sessionmaker(sqlite_engine, class_=AsyncSession, expire_on_commit=False)
    PgSession = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

    models_to_migrate = [
        Camera,
        Vehicle,
        DetectionLog,
        ParkingSlot,
        ParkingSession,
        ParkingEvent,
        AnalyticsSnapshot,
        ReportRecord,
    ]

    async with SqliteSession() as s_db, PgSession() as p_db:
        for m in models_to_migrate:
            count = await migrate_model(s_db, p_db, m)
            print(f"[+] {m.__name__}: migrated {count} new row(s).")

    await sqlite_engine.dispose()
    await pg_engine.dispose()
    print("[✓] Migration completed successfully.")


def main():
    parser = argparse.ArgumentParser(description="Migrate ParkTwin AI SQLite DB to PostgreSQL")
    parser.add_argument(
        "--sqlite-url",
        default=os.getenv("SQLITE_URL", "sqlite+aiosqlite:///./parktwin.db"),
        help="Source SQLite DATABASE_URL",
    )
    parser.add_argument(
        "--postgres-url",
        default=os.getenv("POSTGRES_URL", os.getenv("DATABASE_URL", "")),
        help="Target PostgreSQL DATABASE_URL",
    )
    args = parser.parse_args()

    if not args.postgres_url or "postgres" not in args.postgres_url:
        print("[!] Error: --postgres-url (or POSTGRES_URL/DATABASE_URL) must be a valid PostgreSQL connection string.")
        sys.exit(1)

    asyncio.run(run_migration(args.sqlite_url, args.postgres_url))


if __name__ == "__main__":
    main()
