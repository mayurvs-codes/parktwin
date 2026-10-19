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


# ─── Test-Only Acceleration & Trigger Hooks (Disabled outside test mode) ─────

@router.post(
    "/test/advance-time",
    summary="Test-only hook to accelerate episode clock for 8-min and 10-min escalation verification",
)
async def advance_time_for_testing(
    payload: Dict[str, Any],
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timedelta, timezone
    from backend.core.config import get_settings
    from modules.integration_layer.services.registry import get_integration_service

    settings = get_settings()
    env = getattr(getattr(settings, "app", None), "environment", "development")
    if env not in ("development", "test"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test hooks disabled outside development/test mode",
        )

    advance_seconds = float(payload.get("advance_seconds", 0.0))
    target_seconds = payload.get("target_duration_seconds")
    ep_id = payload.get("episode_id")

    active_eps = engine.violations._episodes
    if ep_id and ep_id in active_eps:
        target_list = [active_eps[ep_id]]
    else:
        target_list = [ep for ep in active_eps.values() if ep["state"] != "RESOLVED"]

    now = datetime.now(timezone.utc)
    for ep in target_list:
        if target_seconds is not None:
            ep["started_at"] = now - timedelta(seconds=float(target_seconds))
        else:
            ep["started_at"] = ep["started_at"] - timedelta(seconds=advance_seconds)

    events = engine.violations.evaluate_episodes(now=now)

    integration = get_integration_service()
    for ev in events:
        itype = "WrongBayEscalated" if ev["event_type"] == engine.violations.EVENT_WRONG_BAY_ESCALATED else "WrongBayDurationWarning"
        ie = integration._make_event(itype, "CAM-02", ev)
        await integration.bus.publish(ie)
        await integration.ws.broadcast("events", {"event_type": ev["event_type"], "payload": ev})

    return {
        "success": True,
        "advanced_count": len(target_list),
        "emitted_events": events,
        "episodes": engine.violations.get_episodes(active_only=True),
    }


@router.post(
    "/test/trigger-entry",
    summary="Test-only hook to trigger a wrong-bay entry event from backend",
)
async def trigger_wrong_bay_entry_test(
    payload: Dict[str, Any],
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    from backend.core.config import get_settings
    from modules.integration_layer.services.registry import get_integration_service
    from modules.integration_layer.voice import get_voice_service

    settings = get_settings()
    env = getattr(getattr(settings, "app", None), "environment", "development")
    if env not in ("development", "test"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test hooks disabled outside development/test mode",
        )

    track_id = int(payload.get("track_id", 1))
    actual_bay = str(payload.get("actual_bay", "SP-11"))
    assigned_bay = str(payload.get("assigned_bay", "SP-07"))
    vehicle_id = str(payload.get("vehicle_id", "VEH-001"))
    plate = payload.get("license_plate", "KA04MH1234")
    camera_id = payload.get("camera_id", "CAM-02")
    source = payload.get("source", "demo")

    now = datetime.now(timezone.utc)
    v_ident = vehicle_id or plate
    if v_ident in engine.violations._active_by_vehicle:
        engine.violations.resolve_episode(
            engine.violations._active_by_vehicle[v_ident],
            reason="test_reentry",
            timestamp=now,
        )

    v_events = engine.violations.on_bay_entry(
        track_id=track_id,
        bay_id=actual_bay,
        vehicle_id=vehicle_id,
        assigned_bay=assigned_bay,
        license_plate=plate,
        timestamp=now,
        source=source,
    )

    integration = get_integration_service()
    voice_announcements = []

    for ve in v_events:
        if ve.get("event_type") == engine.violations.EVENT_WRONG_BAY_ENTRY_WARNING:
            v_warn = get_voice_service().build_wrong_bay_warning(
                event_id=ve["episode_id"],
                vehicle_id=vehicle_id,
                assigned_bay=assigned_bay,
                actual_bay=actual_bay,
                source=source,
            )
            if v_warn:
                ie_v = integration._make_event("VoiceAnnouncement", camera_id, v_warn.to_dict())
                await integration.bus.publish(ie_v)
                await integration.ws.broadcast("events", {"event_type": "VOICE_ANNOUNCEMENT", "payload": v_warn.to_dict()})
                voice_announcements.append(v_warn.to_dict())

            ie_w = integration._make_event("WrongBayWarning", camera_id, ve)
            await integration.bus.publish(ie_w)
            await integration.ws.broadcast("events", {"event_type": "WRONG_BAY_ENTRY_WARNING", "payload": ve})

    return {
        "success": True,
        "violation_events": v_events,
        "voice_announcements": voice_announcements,
        "episodes": engine.violations.get_episodes(active_only=True),
    }


@router.post(
    "/test/trigger-anpr-assignment",
    summary="Test-only hook to trigger ANPR gate assignment and voice route directions",
)
async def trigger_anpr_assignment_test(
    payload: Dict[str, Any],
):
    from backend.core.config import get_settings
    from modules.integration_layer.services.registry import get_integration_service

    settings = get_settings()
    env = getattr(getattr(settings, "app", None), "environment", "development")
    if env not in ("development", "test"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test hooks disabled outside development/test mode",
        )

    camera_id = payload.get("camera_id", "CAM-01")
    vehicle_id = payload.get("vehicle_id", "VEH-001")
    assigned_bay = payload.get("assigned_bay", "SP-07")
    source = payload.get("source", "demo")

    integration = get_integration_service()
    res = await integration.process_anpr_assignment(
        camera_id=camera_id,
        vehicle_id=vehicle_id,
        assigned_bay=assigned_bay,
        source=source,
    )
    return {"success": True, "announcement": res}


@router.post(
    "/test/reset",
    summary="Test-only hook to reset violation engine episodes",
)
async def reset_violations_for_testing(
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
):
    from backend.core.config import get_settings

    settings = get_settings()
    env = getattr(getattr(settings, "app", None), "environment", "development")
    if env not in ("development", "test"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test hooks disabled outside development/test mode",
        )

    engine.violations.reset()
    return {"success": True, "message": "Violation episodes reset"}

