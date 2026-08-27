"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Analytics history storage.

Persists analytics snapshots into the canonical parktwin.db database
via SQLAlchemy async session.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.database.session import AsyncSessionLocal
from ..metrics.base import iso_now, parse_ts
from .models import AnalyticsSnapshot


class _SessionWrapper:
    def __init__(self, session: AsyncSession, close_on_exit: bool) -> None:
        self.session = session
        self.close_on_exit = close_on_exit

    async def __aenter__(self) -> AsyncSession:
        return self.session

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self.close_on_exit:
            await self.session.close()


import os

class AnalyticsStore:
    """Async key/value time-series store for analytics snapshots."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        path = db_path or os.environ.get("ANALYTICS_DB_PATH")
        self._db_path = path
        self._engine = None
        self._session_factory = None
        if path:
            self._engine = create_async_engine(f"sqlite+aiosqlite:///{path}", echo=False)
            self._session_factory = async_sessionmaker(bind=self._engine, class_=AsyncSession, expire_on_commit=False)

    async def init(self) -> None:
        if self._engine:
            async with self._engine.begin() as conn:
                await conn.run_sync(AnalyticsSnapshot.metadata.create_all)

    async def close(self) -> None:
        if self._engine:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None

    def _get_session_ctx(self, db: Optional[AsyncSession]):
        if self._session_factory is not None:
            return _SessionWrapper(self._session_factory(), close_on_exit=True)
        if db is not None:
            return _SessionWrapper(db, close_on_exit=False)
        return _SessionWrapper(AsyncSessionLocal(), close_on_exit=True)

    async def save_snapshot(
        self,
        metric_type: str,
        payload: Dict[str, Any],
        timestamp: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> None:
        """Persist one snapshot (timestamped now if not supplied)."""
        ts = timestamp or iso_now()
        snap = AnalyticsSnapshot(
            metric_type=metric_type,
            timestamp=ts,
            payload=json.dumps(payload, default=str),
        )
        async with self._get_session_ctx(db) as session:
            session.add(snap)
            await session.commit()

    async def get_history(
        self,
        metric_type: str,
        limit: int = 200,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        db: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Return stored snapshots (oldest→newest) for a metric type."""
        limit = max(1, int(limit))
        stmt = select(AnalyticsSnapshot).where(AnalyticsSnapshot.metric_type == metric_type)

        if start is not None:
            start_iso = start.isoformat() if isinstance(start, datetime) else str(start)
            stmt = stmt.where(AnalyticsSnapshot.timestamp >= start_iso)
        if end is not None:
            end_iso = end.isoformat() if isinstance(end, datetime) else str(end)
            stmt = stmt.where(AnalyticsSnapshot.timestamp <= end_iso)

        stmt = stmt.order_by(AnalyticsSnapshot.timestamp.asc()).limit(limit)

        async with self._get_session_ctx(db) as session:
            result = await session.execute(stmt)
            rows = result.scalars().all()

        out = []
        for row in rows:
            row_dt = parse_ts(row.timestamp)
            if start is not None and row_dt is not None:
                start_utc = start if start.tzinfo else start.replace(tzinfo=timezone.utc)
                if row_dt < start_utc:
                    continue
            if end is not None and row_dt is not None:
                end_utc = end if end.tzinfo else end.replace(tzinfo=timezone.utc)
                if row_dt > end_utc:
                    continue
            out.append({"timestamp": row.timestamp, "payload": json.loads(row.payload)})
        return out

    async def get_snapshots(
        self,
        metric_type: str,
        limit: int = 200,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        db: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Alias for get_history."""
        return await self.get_history(metric_type, limit=limit, start=start, end=end, db=db)

    async def get_latest(
        self,
        metric_type: str,
        db: Optional[AsyncSession] = None,
    ) -> Optional[Dict[str, Any]]:
        """Return the most recent snapshot for a metric type, or None."""
        stmt = (
            select(AnalyticsSnapshot)
            .where(AnalyticsSnapshot.metric_type == metric_type)
            .order_by(AnalyticsSnapshot.timestamp.desc())
            .limit(1)
        )
        async with self._get_session_ctx(db) as session:
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()

        if row is None:
            return None
        return {"timestamp": row.timestamp, "payload": json.loads(row.payload)}

    async def count(
        self,
        metric_type: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> int:
        """Total snapshots (optionally for a single metric type)."""
        stmt = select(func.count(AnalyticsSnapshot.id))
        if metric_type:
            stmt = stmt.where(AnalyticsSnapshot.metric_type == metric_type)

        async with self._get_session_ctx(db) as session:
            result = await session.execute(stmt)
            val = result.scalar()

        return val or 0

    async def clear(self, db: Optional[AsyncSession] = None) -> None:
        """Drop all stored snapshots (used by tests)."""
        stmt = delete(AnalyticsSnapshot)
        async with self._get_session_ctx(db) as session:
            await session.execute(stmt)
            await session.commit()


__all__ = ["AnalyticsStore"]
