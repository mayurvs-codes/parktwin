"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Reporting Service (orchestrator).

The entry point the REST API talks to. For each request it:

  1. pulls data through the **Integration Layer** / **Analytics Engine** only
     (via a :class:`DataFetcher`),
  2. runs the matching **generator** to build a :class:`ReportData`,
  3. applies the matching **template** to produce a :class:`ReportView`,
  4. renders the view with the requested **exporters** (JSON / CSV / PDF),
  5. persists a :class:`ReportRecord` (content + file path) for later download
     and regeneration.

It never imports or calls Module 1 / Module 2 code directly; all raw data flows
through Module 3 / Module 4.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from ..exporters import ensure_format, get_exporter
from ..generators import get_generator
from ..models import ReportData, ReportRecord, ReportView
from ..storage import ReportStore
from ..templates import apply_template
from ..types import EXPORT_FORMATS, FORMAT_FILE_EXT, STATUS_GENERATED, STATUS_REGENERATING
from ..utils import iso_now
from .data_fetcher import DataFetcher


class ReportingService:
    """Orchestrates generation, export, storage, and download of reports."""

    def __init__(
        self,
        analytics: Any,
        integration: Any,
        store: Optional[ReportStore] = None,
        output_dir: Optional[str] = None,
    ) -> None:
        self.analytics = analytics
        self.integration = integration
        self.store = store or ReportStore()
        self.output_dir = output_dir or os.environ.get("REPORTS_DIR", "reports_output")

    # ── Lifecycle ───────────────────────────────────────────────────────────

    async def ensure_initialized(self, db: AsyncSession) -> None:
        """Bootstrap the layers Reporting consumes and the report store."""
        if hasattr(self.integration, "ensure_initialized"):
            await self.integration.ensure_initialized(db)
        if hasattr(self.analytics, "ensure_initialized"):
            await self.analytics.ensure_initialized(db)
        await self.store.init()

    # ── Core pipeline ──────────────────────────────────────────────────────

    async def _build(
        self, db: AsyncSession, report_type: str, params: Optional[Dict[str, Any]]
    ) -> Tuple[ReportData, ReportView]:
        fetcher = DataFetcher(db, self.analytics, self.integration)
        generator = get_generator(report_type)
        data = await generator.generate(fetcher, params)
        view = apply_template(report_type, data)
        return data, view

    async def generate(
        self,
        db: AsyncSession,
        report_type: str,
        formats: Sequence[str] = ("json",),
        params: Optional[Dict[str, Any]] = None,
        report_id: Optional[str] = None,
    ) -> ReportRecord:
        """Generate a report, export it, and persist a record.

        If ``report_id`` is given and matches an existing record, the existing
        record is **regenerated** in place (status -> regenerating -> generated).
        Otherwise a brand-new record is created.
        """
        formats = list(formats) or ["json"]
        for fmt in formats:
            ensure_format(fmt)

        existing = None
        if report_id:
            existing = await self.store.get(report_id)

        data, view = await self._build(db, report_type, params)
        content = data.to_dict()
        generated_at = data.generated_at

        os.makedirs(self.output_dir, exist_ok=True)

        existing = await self.store.get(report_id, db=db) if report_id else None

        primary_path: Optional[str] = None
        primary_fmt: Optional[str] = None
        for fmt in formats:
            exporter = get_exporter(fmt)
            payload = exporter.export(view)
            ext = FORMAT_FILE_EXT.get(fmt, fmt)
            rid = report_id or self._next_id()
            path = os.path.join(self.output_dir, f"{rid}.{ext}")
            with open(path, "wb") as fh:
                fh.write(payload)
            if primary_path is None:
                primary_path, primary_fmt = path, fmt

        meta = {"formats": formats, "params": params or {}}

        if existing is not None:
            await self.store.update(
                existing["id"],
                db=db,
                generated_at=generated_at,
                file_path=primary_path,
                status=STATUS_GENERATED,
                format=primary_fmt,
                content=content,
                meta=meta,
            )
            record = await self.store.get(existing["id"], db=db)
        else:
            record = await self.store.create(
                report_type=report_type,
                generated_at=generated_at,
                status=STATUS_GENERATED,
                file_path=primary_path,
                fmt=primary_fmt,
                content=content,
                meta=meta,
                report_id=report_id,
                db=db,
            )
        return ReportRecord.from_row(record)  # type: ignore[arg-type]

    async def regenerate(
        self,
        db: AsyncSession,
        report_id: str,
        formats: Optional[Sequence[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> ReportRecord:
        """Regenerate an existing report (recompute, keep its id)."""
        record = await self.store.get(report_id, db=db)
        if record is None:
            raise ValueError(f"Report '{report_id}' not found")
        await self.store.update(report_id, status=STATUS_REGENERATING, db=db)
        try:
            report_type = record["type"]
            fmts = formats or record.get("format") or ("json",)
            if isinstance(fmts, str):
                fmts = [fmts]
            return await self.generate(
                db, report_type, formats=fmts, params=params, report_id=report_id
            )
        except Exception:
            await self.store.update(report_id, status="failed", db=db)
            raise

    # ── Read / export-on-demand ────────────────────────────────────────────

    async def list_reports(
        self, report_type: Optional[str] = None, limit: Optional[int] = None, db: Optional[AsyncSession] = None
    ) -> List[ReportRecord]:
        rows = await self.store.list(report_type=report_type, limit=limit, order="DESC", db=db)
        return [ReportRecord.from_row(r) for r in rows]

    async def get_report(self, report_id: str, include_content: bool = True, db: Optional[AsyncSession] = None) -> Optional[ReportRecord]:
        row = await self.store.get(report_id, db=db)
        if row is None:
            return None
        rec = ReportRecord.from_row(row)
        if not include_content:
            rec.content = None
        return rec

    async def history(
        self, report_type: Optional[str] = None, limit: Optional[int] = None, db: Optional[AsyncSession] = None
    ) -> List[ReportRecord]:
        """Full generation history (all reports), newest first."""
        rows = await self.store.list(report_type=report_type, limit=limit, order="DESC", db=db)
        return [ReportRecord.from_row(r) for r in rows]

    async def download(
        self, report_id: str, format: Optional[str] = None, db: Optional[AsyncSession] = None
    ) -> Tuple[bytes, str, str]:
        """Return ``(bytes, media_type, filename)`` for a stored report.

        Serves the exported file if it already exists for the requested format;
        otherwise it re-renders the stored content on the fly (so a report can
        always be exported to any supported format, even one not saved before).
        """
        record = await self.store.get(report_id, db=db)
        if record is None:
            raise ValueError(f"Report '{report_id}' not found")

        fmt = format or record.get("format") or "json"
        ensure_format(fmt)

        # Prefer the on-disk file when it matches the requested format.
        if (
            fmt == record.get("format")
            and record.get("file_path")
            and os.path.isfile(record["file_path"])
        ):
            with open(record["file_path"], "rb") as fh:
                payload = fh.read()
            filename = os.path.basename(record["file_path"])
        else:
            # Re-render from stored content.
            content = record.get("content")
            if isinstance(content, str):
                import json

                content = json.loads(content)
            if not content:
                raise ValueError("Report has no stored content to export")
            data = ReportData.from_dict(content)
            view = apply_template(data.report_type, data)
            exporter = get_exporter(fmt)
            payload = exporter.export(view)
            filename = f"{report_id}.{FORMAT_FILE_EXT.get(fmt, fmt)}"

        from ..types import FORMAT_MEDIA_TYPES

        media = FORMAT_MEDIA_TYPES.get(fmt, "application/octet-stream")
        return payload, media, filename

    # ── Helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _next_id() -> str:
        from ..utils import new_report_id

        return new_report_id()


__all__ = ["ReportingService"]
