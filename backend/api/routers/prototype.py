"""
ParkTwin — Prototype APIs
=========================
Exposes top-level endpoints mandated by the Monday Prototype Scope Contract:
  - GET /slots & GET /slots/{slot_id}
  - GET /sessions & GET /sessions/{session_uid}
  - GET /events
  - GET /navigation/route
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.api.dependencies import get_db, require_viewer
from modules.parking_intelligence.storage import crud as parking_crud
from modules.parking_intelligence.storage.models import ParkingSlot, ParkingSession, ParkingEvent, SlotState
from backend.services.navigation_service import compute_route, compute_vehicle_route, NAV_NODES

router = APIRouter(tags=["Prototype Contract APIs"])



# ─── Top-level /slots ─────────────────────────────────────────────────────────

@router.get("/slots", summary="List parking slots")
async def list_slots(
    camera_id: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[Dict[str, Any]]:
    slots = await parking_crud.get_slots(db, camera_id=camera_id, state=state)
    return [
        {
            "id": str(s.id),
            "slot_id": s.slot_id,
            "camera_id": s.camera_id,
            "zone": s.zone,
            "state": s.state.value if hasattr(s.state, "value") else str(s.state),
            "is_reserved": s.is_reserved,
            "position": s.position,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in slots
    ]


@router.get("/slots/{slot_id}", summary="Get slot by ID")
async def get_slot(
    slot_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    slot = await parking_crud.get_slot(db, slot_id.upper())
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot '{slot_id}' not found.",
        )
    return {
        "id": str(slot.id),
        "slot_id": slot.slot_id,
        "camera_id": slot.camera_id,
        "zone": slot.zone,
        "state": slot.state.value if hasattr(slot.state, "value") else str(slot.state),
        "is_reserved": slot.is_reserved,
        "position": slot.position,
        "created_at": slot.created_at.isoformat() if slot.created_at else None,
        "updated_at": slot.updated_at.isoformat() if slot.updated_at else None,
    }


# ─── Top-level /sessions ──────────────────────────────────────────────────────

@router.get("/sessions", summary="List parking sessions")
async def list_sessions(
    active_only: bool = False,
    camera_id: Optional[str] = None,
    plate: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[Dict[str, Any]]:
    sessions = await parking_crud.list_sessions(
        db, active_only=active_only, camera_id=camera_id, plate=plate, skip=skip, limit=limit
    )
    return [
        {
            "id": str(s.id),
            "session_uid": s.session_uid,
            "camera_id": s.camera_id,
            "slot_id": s.slot_id,
            "vehicle_id": str(s.vehicle_id) if s.vehicle_id else None,
            "license_plate": s.license_plate,
            "tracking_id": s.tracking_id,
            "entry_time": s.entry_time.isoformat() if s.entry_time else None,
            "exit_time": s.exit_time.isoformat() if s.exit_time else None,
            "duration_seconds": s.duration_seconds,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}", summary="Get session by ID or UID")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    sess = await parking_crud.get_session(db, session_id)
    if not sess:
        # Try finding by plate or prefix
        stmt = select(ParkingSession).where(
            (ParkingSession.session_uid == session_id) |
            (ParkingSession.license_plate == session_id.upper())
        ).limit(1)
        res = await db.execute(stmt)
        sess = res.scalar_one_or_none()

    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return {
        "id": str(sess.id),
        "session_uid": sess.session_uid,
        "camera_id": sess.camera_id,
        "slot_id": sess.slot_id,
        "vehicle_id": str(sess.vehicle_id) if sess.vehicle_id else None,
        "license_plate": sess.license_plate,
        "tracking_id": sess.tracking_id,
        "entry_time": sess.entry_time.isoformat() if sess.entry_time else None,
        "exit_time": sess.exit_time.isoformat() if sess.exit_time else None,
        "duration_seconds": sess.duration_seconds,
        "is_active": sess.is_active,
        "created_at": sess.created_at.isoformat() if sess.created_at else None,
    }


# ─── Top-level /events ────────────────────────────────────────────────────────

@router.get("/events", summary="List parking lifecycle events")
async def list_events(
    event_type: Optional[str] = None,
    camera_id: Optional[str] = None,
    slot_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[Dict[str, Any]]:
    stmt = select(ParkingEvent).order_by(desc(ParkingEvent.timestamp))
    if event_type:
        stmt = stmt.where(ParkingEvent.event_type == event_type)
    if camera_id:
        stmt = stmt.where(ParkingEvent.camera_id == camera_id)
    if slot_id:
        stmt = stmt.where(ParkingEvent.slot_id == slot_id)
    stmt = stmt.offset(skip).limit(limit)

    res = await db.execute(stmt)
    events = res.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_uid": e.event_uid,
            "event_type": e.event_type,
            "camera_id": e.camera_id,
            "slot_id": e.slot_id,
            "vehicle_id": str(e.vehicle_id) if e.vehicle_id else None,
            "tracking_id": e.tracking_id,
            "license_plate": e.license_plate,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "meta": e.meta or {},
            "source_type": (e.meta or {}).get("source_type", "observed"),
        }
        for e in events
    ]


# ─── Navigation Route Endpoint ───────────────────────────────────────────────

@router.get("/navigation/route", summary="Calculate shortest path route to parking slot")
async def get_navigation_route(
    from_node: str = Query("ENTRY_GATE", description="Origin node (default ENTRY_GATE)"),
    to_slot: str = Query("P02", description="Destination slot (e.g. P02, P04, P07)"),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    route = compute_route(source=from_node, destination=to_slot)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No route found between '{from_node}' and '{to_slot}'. Available slots: P01-P10.",
        )
    return route


@router.get("/navigation/vehicle/{vehicle_id}", summary="Calculate individual navigation route for a vehicle")
async def get_vehicle_navigation(
    vehicle_id: str,
    from_node: str = Query("ENTRY_GATE", description="Origin node (default ENTRY_GATE)"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """
    Resolve individual vehicle's destination parking slot and compute optimal Dijkstra route.
    Works for any vehicle by UUID, prototype ID (e.g. VH-001), or license plate.
    """
    route = await compute_vehicle_route(db, vehicle_id_or_plate=vehicle_id, source=from_node)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active parking destination found for vehicle '{vehicle_id}'.",
        )
    return route



# ─── Scenario Replay Controls ────────────────────────────────────────────────

@router.post("/prototype/replay/run", summary="Trigger scenario replay")
async def trigger_replay(
    scenario: str = Query("monday", description="Scenario name"),
    reset: bool = Query(True, description="Reset existing state before replay"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    from backend.services.replay_service import replay_scenario
    try:
        report = await replay_scenario(db, scenario_name=scenario, do_reset=reset)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Replay failed: {str(e)}",
        )


@router.post("/prototype/replay/reset", summary="Reset prototype scenario state")
async def trigger_reset(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    from backend.services.replay_service import reset_scenario
    try:
        report = await reset_scenario(db)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reset failed: {str(e)}",
        )


@router.get("/prototype/replay/status", summary="Get current prototype replay summary")
async def get_replay_status(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    from backend.database.models import Vehicle
    from modules.parking_intelligence.storage.models import ParkingSlot, ParkingSession, ParkingEvent, SlotState
    from sqlalchemy import func

    slots = (await db.execute(select(ParkingSlot))).scalars().all()
    vehicles = (await db.execute(select(Vehicle))).scalars().all()
    sessions = (await db.execute(select(ParkingSession))).scalars().all()
    evt_count = (await db.execute(select(func.count()).select_from(ParkingEvent))).scalar_one()

    occupied = [s.slot_id for s in slots if s.state == SlotState.OCCUPIED]
    free = [s.slot_id for s in slots if s.state == SlotState.FREE]
    active_sess = [s.session_uid for s in sessions if s.is_active]

    return {
        "status": "active" if len(vehicles) > 0 else "uninitialized",
        "vehicles_count": len(vehicles),
        "parked_vehicles": [v.prototype_id for v in vehicles if v.status == "parked"],
        "exited_vehicles": [v.prototype_id for v in vehicles if v.status == "exited"],
        "total_slots": len(slots),
        "occupied_slots_count": len(occupied),
        "free_slots_count": len(free),
        "occupied_slots": sorted(occupied),
        "free_slots": sorted(free),
        "active_sessions_count": len(active_sess),
        "total_sessions_count": len(sessions),
        "events_count": evt_count,
    }

