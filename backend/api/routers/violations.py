"""
ParkTwin AI — Violation Intelligence Router (Phase 3)
======================================================
REST endpoints for monitoring violation episodes:
  GET /violations/episodes?active=true
  GET /parking/violations/episodes?active=true
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, require_viewer
from backend.api.routers.parking import get_parking_engine
from modules.parking_intelligence import ParkingIntelligenceEngine
from modules.parking_intelligence.storage import crud


router = APIRouter(prefix="/violations", tags=["Violation Intelligence"])


@router.get(
    "/episodes",
    summary="List active or historical violation episodes",
    response_description="Array of violation episodes with state, timers, and resolution reason",
)
async def list_violation_episodes(
    active: bool = Query(True, description="Filter for currently active (unresolved) episodes only"),
    vehicle_id: Optional[str] = Query(None, description="Optional filter by vehicle plate or ID"),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[Dict[str, Any]]:
    """
    Returns active violation episodes from the in-memory engine, merged with
    persisted database episodes.
    """
    # In-memory engine episodes (fastest, authoritative for live state)
    in_memory = engine.violations.get_episodes(active_only=active)

    if vehicle_id:
        in_memory = [ep for ep in in_memory if ep["vehicle_id"] == vehicle_id or ep.get("license_plate") == vehicle_id]

    # Also query DB for historical/persisted episodes
    try:
        db_episodes = await crud.list_violation_episodes(
            db, active_only=active, vehicle_id=vehicle_id
        )
        db_mapped = [
            {
                "episode_id": ep.episode_id,
                "vehicle_id": ep.vehicle_id,
                "license_plate": ep.license_plate,
                "assigned_bay": ep.assigned_bay,
                "actual_bay": ep.actual_bay,
                "started_at": ep.started_at.isoformat() if ep.started_at else None,
                "resolved_at": ep.resolved_at.isoformat() if ep.resolved_at else None,
                "state": ep.state,
                "resolution_reason": ep.resolution_reason,
                "duration_seconds": round(ep.duration_seconds or 0.0, 1),
                "source": ep.source or "live",
            }
            for ep in db_episodes
        ]
        # Merge by episode_id
        seen = {ep["episode_id"] for ep in in_memory}
        for dep in db_mapped:
            if dep["episode_id"] not in seen:
                in_memory.append(dep)
                seen.add(dep["episode_id"])
    except Exception:
        pass

    return in_memory
