"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Report storage.

Persists generated report records into the canonical parktwin.db database
via SQLAlchemy async session.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import select, delete, func, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.database.session import AsyncSessionLocal
from ..utils import new_report_id
from .models import Report


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

class ReportStore:
    """Async store for generated report records using SQLAlchemy."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        path = db_path or os.environ.get("REPORTS_DB_PATH")
        self._db_path = path
        self._engine = None
        self._session_factory = None
        if path:
            self._engine = create_async_engine(f"sqlite+aiosqlite:///{path}", echo=False)
            self._session_factory = async_sessionmaker(bind=self._engine, class_=AsyncSession, expire_on_commit=False)

    async def init(self) -> None:
        if self._engine:
            async with self._engine.begin() as conn:
                await conn.run_sync(Report.metadata.create_all)

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

    # ── Writes ──────────────────────────────────────────────────────────────

    async def create(
        self,
        *,
        report_type: str,
        generated_at: str,
        status: str,
        file_path: Optional[str] = None,
        fmt: Optional[str] = None,
        content: Optional[Dict[str, Any]] = None,
        meta: Optional[Dict[str, Any]] = None,
        report_id: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        rid = report_id or new_report_id()
        report = Report(
            id=rid,
            type=report_type,
            generated_at=generated_at,
            file_path=file_path,
            status=status,
            format=fmt,
            content=json.dumps(content, default=str) if content is not None else None,
            meta=json.dumps(meta or {}, default=str),
        )
        async with self._get_session_ctx(db) as session:
            session.add(report)
            await session.commit()
            ret = await self.get(rid, db=session)
            assert ret is not None
            return ret

    async def update(
        self,
        report_id: str,
        db: Optional[AsyncSession] = None,
        **fields: Any,
    ) -> Optional[Dict[str, Any]]:
        allowed = {"type", "generated_at", "file_path", "status", "format", "content", "meta"}
        sets = {k: v for k, v in fields.items() if k in allowed}
        if "content" in sets and isinstance(sets["content"], dict):
            sets["content"] = json.dumps(sets["content"], default=str)
        if "meta" in sets and isinstance(sets["meta"], dict):
            sets["meta"] = json.dumps(sets["meta"], default=str)

        if not sets:
            return await self.get(report_id, db=db)

        stmt = sa_update(Report).where(Report.id == report_id).values(**sets)

        async with self._get_session_ctx(db) as session:
            await session.execute(stmt)
            await session.commit()
            return await self.get(report_id, db=session)

    # ── Reads ───────────────────────────────────────────────────────────────

    async def get(
        self, report_id: str, db: Optional[AsyncSession] = None
    ) -> Optional[Dict[str, Any]]:
        stmt = select(Report).where(Report.id == report_id)
        async with self._get_session_ctx(db) as session:
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()

        if row is None:
            return None
        return self._report_to_dict(row)

    async def list(
        self,
        report_type: Optional[str] = None,
        limit: Optional[int] = None,
        order: str = "DESC",
        db: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        stmt = select(Report)
        if report_type:
            stmt = stmt.where(Report.type == report_type)

        if order.upper() == "ASC":
            stmt = stmt.order_by(Report.generated_at.asc(), Report.id.asc())
        else:
            stmt = stmt.order_by(Report.generated_at.desc(), Report.id.desc())

        if limit:
            stmt = stmt.limit(int(limit))

        async with self._get_session_ctx(db) as session:
            result = await session.execute(stmt)
            rows = result.scalars().all()

        return [self._report_to_dict(r) for r in rows]

    async def count(
        self, report_type: Optional[str] = None, db: Optional[AsyncSession] = None
    ) -> int:
        stmt = select(func.count(Report.id))
        if report_type:
            stmt = stmt.where(Report.type == report_type)

        async with self._get_session_ctx(db) as session:
            result = await session.execute(stmt)
            val = result.scalar()

        return val or 0

    async def delete(self, report_id: str, db: Optional[AsyncSession] = None) -> bool:
        stmt = delete(Report).where(Report.id == report_id)
        async with self._get_session_ctx(db) as session:
            await session.execute(stmt)
            await session.commit()
        return True

    async def clear(self, db: Optional[AsyncSession] = None) -> None:
        stmt = delete(Report)
        async with self._get_session_ctx(db) as session:
            await session.execute(stmt)
            await session.commit()

    @staticmethod
    def _report_to_dict(r: Report) -> Dict[str, Any]:
        return {
            "id": r.id,
            "type": r.type,
            "generated_at": r.generated_at,
            "file_path": r.file_path,
            "status": r.status,
            "format": r.format,
            "content": r.content,
            "meta": r.meta,
        }


__all__ = ["ReportStore"]
