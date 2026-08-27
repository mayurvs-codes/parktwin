"""
ParkTwin AI — Analytics Engine REST API (Module 4)
=================================================
Exposes the Analytics Engine over a single ``/analytics`` router.

Every endpoint resolves the Analytics Service (which consumes the Integration
Layer only) and returns the computed metrics. The router itself contains no
business logic — it is a thin transport over :class:`AnalyticsService`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, require_viewer
from ..integration_client import get_integration_service_dep
from ..services.registry import get_analytics_service
from .schemas import (
    AnalyticsDashboardResponse,
    OccupancyAnalyticsResponse,
    TrafficAnalyticsResponse,
    TrendsAnalyticsResponse,
    UtilizationAnalyticsResponse,
)

router = APIRouter(prefix="/analytics", tags=["Analytics Engine", "Analytics"])


def _validate_date_range(start: Optional[datetime], end: Optional[datetime]) -> None:
    if start is not None and end is not None and end < start:
        raise HTTPException(
            status_code=422,
            detail="end datetime must be greater than start datetime",
        )


# ─── Dependency ─────────────────────────────────────────────────────────────

async def get_analytics_service_dep(db: AsyncSession = Depends(get_db)):
    """Resolve the Analytics Service, bootstrapping the Integration Layer + store."""
    # ``get_integration_service_dep`` ensures Module 2 tables exist for the
    # Integration Service the Analytics Engine consumes.
    await get_integration_service_dep(db=db)
    svc = get_analytics_service()
    await svc.ensure_initialized(db)
    return svc


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get(
    "/occupancy",
    response_model=OccupancyAnalyticsResponse,
    tags=["Analytics Engine", "Analytics"],
    summary="Current occupancy analytics",
)
async def analytics_occupancy(
    store: bool = Query(True, description="Persist a snapshot for trend history"),
    start: Optional[datetime] = Query(None, description="Start datetime for date range (ISO-8601)"),
    end: Optional[datetime] = Query(None, description="End datetime for date range (ISO-8601)"),
    svc=Depends(get_analytics_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> OccupancyAnalyticsResponse:
    """Current occupancy, percentage, free/reserved slots, average occupancy."""
    _validate_date_range(start, end)
    data = await svc.occupancy(db, store=store, start=start, end=end)
    return OccupancyAnalyticsResponse.model_validate(data)


@router.get(
    "/traffic",
    response_model=TrafficAnalyticsResponse,
    tags=["Analytics Engine", "Analytics"],
    summary="Traffic analytics",
)
async def analytics_traffic(
    store: bool = Query(True, description="Persist a snapshot for trend history"),
    start: Optional[datetime] = Query(None, description="Start datetime for date range (ISO-8601)"),
    end: Optional[datetime] = Query(None, description="End datetime for date range (ISO-8601)"),
    svc=Depends(get_analytics_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> TrafficAnalyticsResponse:
    """Vehicle entries/exits, peak hours, hourly/daily traffic, vehicle counts."""
    _validate_date_range(start, end)
    data = await svc.traffic(db, store=store, start=start, end=end)
    return TrafficAnalyticsResponse.model_validate(data)


@router.get(
    "/utilization",
    response_model=UtilizationAnalyticsResponse,
    tags=["Analytics Engine", "Analytics"],
    summary="Utilization analytics",
)
async def analytics_utilization(
    store: bool = Query(True, description="Persist a snapshot for trend history"),
    start: Optional[datetime] = Query(None, description="Start datetime for date range (ISO-8601)"),
    end: Optional[datetime] = Query(None, description="End datetime for date range (ISO-8601)"),
    svc=Depends(get_analytics_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> UtilizationAnalyticsResponse:
    """Slot utilization, avg duration, most/least used slots, turnover rate."""
    _validate_date_range(start, end)
    data = await svc.utilization(db, store=store, start=start, end=end)
    return UtilizationAnalyticsResponse.model_validate(data)


@router.get(
    "/trends",
    response_model=TrendsAnalyticsResponse,
    tags=["Analytics Engine", "Analytics"],
    summary="Trends analytics",
)
async def analytics_trends(
    history_limit: int = Query(200, ge=1, le=2000, description="Max snapshots per timeline"),
    start: Optional[datetime] = Query(None, description="Start datetime for date range (ISO-8601)"),
    end: Optional[datetime] = Query(None, description="End datetime for date range (ISO-8601)"),
    svc=Depends(get_analytics_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> TrendsAnalyticsResponse:
    """Occupancy/traffic timelines plus session & duration statistics."""
    _validate_date_range(start, end)
    data = await svc.trends(db, history_limit=history_limit, start=start, end=end)
    return TrendsAnalyticsResponse.model_validate(data)


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
    tags=["Analytics Engine", "Analytics"],
    summary="Combined analytics dashboard",
)
async def analytics_dashboard(
    start: Optional[datetime] = Query(None, description="Start datetime for date range (ISO-8601)"),
    end: Optional[datetime] = Query(None, description="End datetime for date range (ISO-8601)"),
    svc=Depends(get_analytics_service_dep),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> AnalyticsDashboardResponse:
    """Compute + persist every metric and return the combined dashboard."""
    _validate_date_range(start, end)
    data = await svc.dashboard(db, start=start, end=end)
    return AnalyticsDashboardResponse.model_validate(data)


__all__ = ["router", "get_analytics_service_dep"]

