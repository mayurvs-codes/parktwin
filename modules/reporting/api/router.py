"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
REST API router.

Exposes the Reporting Engine over a single ``/reports`` router:

  * ``GET  /reports``           — list stored reports (metadata)
  * ``GET  /reports/{id}``      — fetch one report (incl. content)
  * ``POST /reports/generate``  — generate (or regenerate) a report
  * ``GET  /reports/download``  — download a report file (json/csv/pdf)
  * ``GET  /reports/history``   — full generation history, newest first

Every endpoint resolves the Reporting Service (which consumes the Analytics
Engine + Integration Layer only) and returns the result. The router contains no
business logic — it is a thin transport over :class:`ReportingService`.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, require_admin, require_viewer

from ..services.registry import get_reporting_service
from ..integration_client import get_integration_service_dep
from ..types import EXPORT_FORMATS
from .schemas import (
    GenerateRequest,
    GenerateResponse,
    ReportDetail,
    ReportSummary,
)


router = APIRouter(prefix="/reports", tags=["Reporting Engine"])


# ─── Dependency ───────────────────────────────────────────────────────────────

async def get_reporting_service_dep(db: AsyncSession = Depends(get_db)):
    """Resolve the Reporting Service, bootstrapping its dependencies."""
    # Bootstrap the Integration Layer (Module 3 -> Module 2 tables) — the only
    # external initialization Reporting needs.
    await get_integration_service_dep(db=db)
    svc = get_reporting_service()
    await svc.ensure_initialized(db)
    return svc


# ─── Endpoints ──────────────────────────────────────────────────────────────

# NOTE: literal sub-paths (`/history`, `/generate`, `/download`) MUST be
# declared *before* the `/{report_id}` catch-all route, otherwise Starlette
# matches `/reports/download` as `/reports/{report_id}` (report_id="download").

@router.get("", summary="List reports")
async def list_reports(
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    limit: int = Query(100, ge=1, le=1000),
    svc=Depends(get_reporting_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[ReportSummary]:
    """List stored reports (metadata only)."""
    records = await svc.list_reports(report_type=report_type, limit=limit, db=db)
    return [
        ReportSummary(
            id=r.id, type=r.type, generated_at=r.generated_at,
            status=r.status, file_path=r.file_path, format=r.format,
        )
        for r in records
    ]


@router.get("/history", summary="Report generation history")
async def report_history(
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    limit: int = Query(500, ge=1, le=5000),
    svc=Depends(get_reporting_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[ReportSummary]:
    """Return the full report generation history, newest first."""
    records = await svc.history(report_type=report_type, limit=limit, db=db)
    return [
        ReportSummary(
            id=r.id, type=r.type, generated_at=r.generated_at,
            status=r.status, file_path=r.file_path, format=r.format,
        )
        for r in records
    ]


@router.post("/generate", summary="Generate a report")
async def generate_report(
    body: GenerateRequest,
    svc=Depends(get_reporting_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_admin),
) -> GenerateResponse:
    """Generate (or regenerate) a report and persist it."""
    unknown = [f for f in body.formats if f not in EXPORT_FORMATS]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format(s): {unknown}. Supported: {list(EXPORT_FORMATS)}",
        )
    try:
        record = await svc.generate(
            db,
            report_type=body.report_type,
            formats=body.formats,
            params=body.params,
            report_id=body.report_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    formats = (record.meta or {}).get("formats", body.formats)
    primary = record.format or (formats[0] if formats else "json")
    return GenerateResponse(
        id=record.id, type=record.type, status=record.status,
        generated_at=record.generated_at, format=primary,
        file_path=record.file_path, formats=list(formats),
        download_url=f"/reports/download?report_id={record.id}&format={primary}",
    )


@router.get("/download", summary="Download a report file")
async def download_report(
    report_id: str = Query(..., description="Report id"),
    format: Optional[str] = Query(None, description="Export format (json|csv|pdf)"),
    svc=Depends(get_reporting_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Response:
    """Stream a report file (served from disk or re-rendered on demand)."""
    try:
        payload, media, filename = await svc.download(report_id, format=format, db=db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return Response(
        content=payload,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{report_id}", summary="Get a report")
async def get_report(
    report_id: str,
    svc=Depends(get_reporting_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> ReportDetail:
    """Fetch one report, including its stored content."""
    record = await svc.get_report(report_id, include_content=True, db=db)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")
    return ReportDetail(
        id=record.id, type=record.type, generated_at=record.generated_at,
        status=record.status, file_path=record.file_path, format=record.format,
        meta=record.meta, content=record.content,
    )


__all__ = ["router", "get_reporting_service_dep"]
