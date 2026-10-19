"""
ParkTwin AI — Module 2 CRUD Operations
=======================================
Async DB access for parking slots, sessions, and events.

All functions take an ``AsyncSession``. Table creation is idempotent
(``Base.metadata.create_all``) so this module can be wired into the
application without touching Module 1's schema bootstrap.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine
from sqlalchemy.orm import selectinload

from backend.database.models import Base, Vehicle
from backend.core.config import get_settings

from .models import ParkingSlot, ParkingSession, ParkingEvent, SlotState, ViolationEpisode
from .config_loader import load_slot_definitions


# ─── Schema bootstrap ─────────────────────────────────────────────────────────

async def init_module2_db(engine: AsyncEngine) -> None:
    """Create all Module 2 tables (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_slots(db: AsyncSession, settings=None) -> int:
    """
    Ensure every configured slot exists in the DB.

    Returns the number of slot rows created. Existing rows are left untouched
    (we never clobber a live occupancy state or reservation).
    """
    if settings is None:
        settings = get_settings()

    created = 0
    camera_ids = [c.id for c in settings.cameras.sources] or ["camera_01"]
    for camera_id in camera_ids:
        defs = load_slot_definitions(settings, camera_id)
        for d in defs:
            existing = await db.execute(
                select(ParkingSlot).where(
                    ParkingSlot.slot_id == d["slot_id"],
                    ParkingSlot.camera_id == camera_id,
                )
            )
            if existing.scalar_one_or_none() is None:
                db.add(ParkingSlot(
                    slot_id=d["slot_id"],
                    camera_id=camera_id,
                    zone=d.get("zone", "general"),
                    state=SlotState.FREE,
                    is_reserved=bool(d.get("is_reserved", False)),
                    reserved_for=d.get("reserved_for"),
                    position=d.get("position"),
                    meta={},
                ))
                created += 1
    if created:
        await db.flush()
    return created


# ─── Slot CRUD ────────────────────────────────────────────────────────────────

async def get_slot_configs(db: AsyncSession, camera_id: str) -> List[dict]:
    """All slot rows for a camera as plain dicts (for the mapper)."""
    result = await db.execute(
        select(ParkingSlot).where(ParkingSlot.camera_id == camera_id)
    )
    return [
        {
            "slot_id": s.slot_id,
            "camera_id": s.camera_id,
            "zone": s.zone,
            "is_reserved": s.is_reserved,
            "reserved_for": s.reserved_for,
            "position": s.position,
        }
        for s in result.scalars().all()
    ]


async def get_slots(
    db: AsyncSession,
    camera_id: Optional[str] = None,
    state: Optional[str] = None,
) -> List[ParkingSlot]:
    query = select(ParkingSlot)
    if camera_id:
        query = query.where(ParkingSlot.camera_id == camera_id)
    if state:
        query = query.where(ParkingSlot.state == state)
    query = query.order_by(ParkingSlot.camera_id, ParkingSlot.slot_id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_slot(db: AsyncSession, slot_id: str, camera_id: Optional[str] = None):
    query = select(ParkingSlot).where(ParkingSlot.slot_id == slot_id)
    if camera_id:
        query = query.where(ParkingSlot.camera_id == camera_id)
    return (await db.execute(query)).scalar_one_or_none()


async def upsert_slot(db: AsyncSession, data: dict) -> ParkingSlot:
    """Create or update a slot by (slot_id, camera_id)."""
    existing = await get_slot(db, data["slot_id"], data.get("camera_id"))
    if existing:
        for k, v in data.items():
            if k in ("slot_id", "camera_id", "id"):
                continue
            setattr(existing, k, v)
        await db.flush()
        await db.refresh(existing)
        return existing
    slot = ParkingSlot(**data)
    db.add(slot)
    await db.flush()
    await db.refresh(slot)
    return slot


async def update_slot_states(
    db: AsyncSession,
    camera_id: str,
    states: dict,  # slot_id -> SlotState
) -> None:
    """Bulk-apply computed occupancy states for a camera's slots."""
    if not states:
        return
    for slot_id, state in states.items():
        await db.execute(
            update(ParkingSlot)
            .where(
                ParkingSlot.slot_id == slot_id,
                ParkingSlot.camera_id == camera_id,
            )
            .values(state=state)
        )


async def close_all_sessions(db: AsyncSession) -> None:
    """Close all active parking sessions on reset."""
    await db.execute(
        update(ParkingSession)
        .where(ParkingSession.is_active == True)  # noqa: E712
        .values(
            is_active=False,
            exit_time=datetime.now(timezone.utc),
        )
    )
    await db.flush()


async def reset_all_slots(db: AsyncSession) -> int:
    """Reset all slots to FREE status, clear reservations and delete all active sessions/journeys."""
    from sqlalchemy import delete
    res = await db.execute(
        update(ParkingSlot).values(
            state=SlotState.FREE,
            is_reserved=False,
            reserved_for=None,
        )
    )
    # End all active parking sessions
    await db.execute(
        update(ParkingSession)
        .where(ParkingSession.is_active == True)  # noqa: E712
        .values(
            is_active=False,
            exit_time=datetime.now(timezone.utc),
        )
    )
    # Delete all vehicle journeys for a full clean reset
    try:
        from backend.database.models import VehicleJourney
        await db.execute(delete(VehicleJourney))
    except Exception:
        pass
    await db.commit()
    return getattr(res, "rowcount", 0)


# ─── Session CRUD ──────────────────────────────────────────────────────────────

async def open_session(db: AsyncSession, data: dict) -> ParkingSession:
    sess = ParkingSession(**data)
    db.add(sess)
    await db.flush()
    return sess


async def get_active_session_by_track(
    db: AsyncSession, camera_id: str, tracking_id: int
):
    result = await db.execute(
        select(ParkingSession)
        .where(
            ParkingSession.camera_id == camera_id,
            ParkingSession.tracking_id == int(tracking_id),
            ParkingSession.is_active == True,  # noqa: E712
        )
        .order_by(ParkingSession.entry_time.desc())
    )
    return result.scalar_one_or_none()


async def get_session(db: AsyncSession, session_uid: str):
    return (
        await db.execute(
            select(ParkingSession).where(ParkingSession.session_uid == session_uid)
        )
    ).scalar_one_or_none()


async def close_session(
    db: AsyncSession,
    session_uid: str,
    *,
    exit_time: Optional[datetime] = None,
    duration_seconds: float = 0.0,
    violation_flags: Optional[list] = None,
) -> Optional[ParkingSession]:
    sess = await get_session(db, session_uid)
    if not sess:
        return None
    sess.exit_time = exit_time or datetime.now(timezone.utc)
    sess.duration_seconds = float(duration_seconds)
    sess.is_active = False
    if violation_flags is not None:
        sess.violation_flags = list(violation_flags)
    await db.flush()
    return sess


async def list_sessions(
    db: AsyncSession,
    *,
    active_only: bool = False,
    camera_id: Optional[str] = None,
    plate: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[ParkingSession]:
    query = select(ParkingSession)
    if active_only:
        query = query.where(ParkingSession.is_active == True)  # noqa: E712
    if camera_id:
        query = query.where(ParkingSession.camera_id == camera_id)
    if plate:
        query = query.where(ParkingSession.license_plate.ilike(f"%{plate}%"))
    query = query.order_by(ParkingSession.entry_time.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def count_sessions(db: AsyncSession, active_only: bool = False) -> int:
    query = select(ParkingSession)
    if active_only:
        query = query.where(ParkingSession.is_active == True)  # noqa: E712
    result = await db.execute(query)
    return len(result.scalars().all())


# ─── Event CRUD ───────────────────────────────────────────────────────────────

async def create_event(db: AsyncSession, data: dict) -> ParkingEvent:
    event = ParkingEvent(**data)
    db.add(event)
    await db.flush()
    return event


async def list_events(
    db: AsyncSession,
    *,
    event_type: Optional[str] = None,
    camera_id: Optional[str] = None,
    slot_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[ParkingEvent]:
    query = select(ParkingEvent)
    if event_type:
        query = query.where(ParkingEvent.event_type == event_type)
    if camera_id:
        query = query.where(ParkingEvent.camera_id == camera_id)
    if slot_id:
        query = query.where(ParkingEvent.slot_id == slot_id)
    query = query.order_by(ParkingEvent.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def count_events(db: AsyncSession, event_type: Optional[str] = None) -> int:
    query = select(ParkingEvent)
    if event_type:
        query = query.where(ParkingEvent.event_type == event_type)
    result = await db.execute(query)
    return len(result.scalars().all())


# ─── Violation Episode CRUD (Phase 3) ─────────────────────────────────────────

async def record_violation_episode(db: AsyncSession, data: dict) -> ViolationEpisode:
    ep = ViolationEpisode(**data)
    db.add(ep)
    await db.flush()
    return ep


async def update_violation_episode(
    db: AsyncSession,
    episode_id: str,
    *,
    state: Optional[str] = None,
    resolution_reason: Optional[str] = None,
    resolved_at: Optional[datetime] = None,
    duration_seconds: Optional[float] = None,
) -> Optional[ViolationEpisode]:
    res = await db.execute(
        select(ViolationEpisode).where(ViolationEpisode.episode_id == episode_id)
    )
    ep = res.scalar_one_or_none()
    if not ep:
        return None
    if state is not None:
        ep.state = state
    if resolution_reason is not None:
        ep.resolution_reason = resolution_reason
    if resolved_at is not None:
        ep.resolved_at = resolved_at
    if duration_seconds is not None:
        ep.duration_seconds = float(duration_seconds)
    await db.flush()
    return ep


async def list_violation_episodes(
    db: AsyncSession,
    *,
    active_only: bool = False,
    vehicle_id: Optional[str] = None,
    actual_bay: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[ViolationEpisode]:
    query = select(ViolationEpisode)
    if active_only:
        query = query.where(ViolationEpisode.state != "RESOLVED")
    if vehicle_id:
        query = query.where(ViolationEpisode.vehicle_id == vehicle_id)
    if actual_bay:
        query = query.where(ViolationEpisode.actual_bay == actual_bay)
    query = query.order_by(ViolationEpisode.started_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())

