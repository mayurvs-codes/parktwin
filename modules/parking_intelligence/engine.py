"""
ParkTwin AI — Parking Intelligence Engine (Orchestrator)
=====================================================
The single integration point for Module 2. It consumes Module 1 outputs
(``VehicleRecord``-style objects) frame-by-frame and drives the full
lifecycle:

    records ──▶ SlotMapper (stable vehicle↔slot mapping)
                 ─▶ Occupancy   (FREE / OCCUPIED / RESERVED / UNKNOWN)
                 ─▶ Sessions    (open on arrival, close on departure)
                 ─▶ Duration    (accurate seconds + HH:MM:SS)
                 ─▶ Violations  (overstay / reserved / unauthorized)
                 ─▶ Events      (6 lifecycle events, persisted + buffered)

The engine owns no AI models and imports nothing from Module 1's business
code — it only adapts the duck-typed record into a ``VehicleTrack`` at the
boundary, reusing the detection/tracking results Module 1 produced.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.database.session import engine as db_engine
from backend.database.models import Base

from .storage import crud
from .storage.models import ParkingSlot, ParkingSession, SlotState
from .slot_detection.slot_config import SlotConfig
from .occupancy.occupancy_manager import compute_states
from .mapping.slot_mapper import SlotMapper, VehicleTrack, SlotAssignment
from .duration.duration_tracker import duration_seconds, format_duration
from .sessions.session_manager import open_session_data
from .violations.violation_engine import ViolationEngine
from .events.event_engine import EventEngine

logger = None  # lazy import to avoid loguru config side-effects on import


def _log():
    global logger
    if logger is None:
        from shared.logging import get_logger
        logger = get_logger("parking_engine")
    return logger


class ParkingIntelligenceEngine:
    """Stateful orchestrator for one deployment's parking intelligence."""

    def __init__(self) -> None:
        settings = get_settings()
        self._mapper = SlotMapper(
            release_after=int(settings.tracking.track_buffer),
            distance_threshold=0.35,
        )
        self._events = EventEngine()
        self._violations = ViolationEngine(
            max_duration_hours=float(settings.parking.max_duration_hours)
        )
        self._initialized = False
        self._settings = settings

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def init(self, db: AsyncSession) -> None:
        """Create Module 2 tables (idempotent) and seed configured slots."""
        await crud.init_module2_db(db_engine)
        created = await crud.seed_slots(db, self._settings)
        if created:
            _log().info(f"Seeded {created} parking slot(s) into the database.")
        self._initialized = True

    @property
    def initialized(self) -> bool:
        return self._initialized

    # ── Per-frame ingestion ────────────────────────────────────────────────

    async def ingest_frame(
        self,
        db: AsyncSession,
        camera_id: str,
        records: List,
    ) -> Dict:
        """
        Process one frame's Module-1 records and persist the resulting
        occupancy / sessions / events.

        Args:
            db: active async session (committed by the calling dependency).
            camera_id: source camera id.
            records: list of Module-1 ``VehicleRecord``-like objects.

        Returns a compact per-frame summary dict.
        """
        if not self._initialized:
            await self.init(db)

        now = datetime.now(timezone.utc)

        # Adapt Module 1 outputs into the mapper's neutral input.
        tracks = [VehicleTrack.from_record(r) for r in records]
        tracks = [t for t in tracks if t is not None]
        tracks_by_id = {t.track_id: t for t in tracks}

        # Load slot configuration for this camera.
        slot_rows = await crud.get_slot_configs(db, camera_id)
        slot_configs = [SlotConfig(**s) for s in slot_rows]
        slot_lookup = {
            s.slot_id: (s.is_reserved, s.reserved_for) for s in slot_configs
        }

        # 1. Stable mapping.
        result = self._mapper.update(camera_id, tracks, slot_configs)
        assignment = SlotAssignment(
            camera_id=camera_id,
            assignments=result.assignments,
            newly_assigned=result.newly_assigned,
            released=result.released,
        )

        # 2. Newly assigned → open sessions + emit entry events.
        for track_id, slot_id in result.newly_assigned.items():
            rec = tracks_by_id[track_id]
            sess_data = open_session_data(
                camera_id, track_id, slot_id,
                entry_time=now,
                license_plate=rec.license_plate,
                vehicle_id=rec.vehicle_id,
            )
            await crud.open_session(db, sess_data)
            await self._emit(
                db, self._events.EVENT_VEHICLE_ENTERED, camera_id,
                slot_id=slot_id, tracking_id=track_id,
                license_plate=rec.license_plate, vehicle_id=rec.vehicle_id,
            )
            await self._emit(
                db, self._events.EVENT_SLOT_OCCUPIED, camera_id,
                slot_id=slot_id, tracking_id=track_id,
                license_plate=rec.license_plate,
            )
            await self._emit(
                db, self._events.EVENT_VEHICLE_PARKED, camera_id,
                slot_id=slot_id, tracking_id=track_id,
                license_plate=rec.license_plate, vehicle_id=rec.vehicle_id,
            )

        # 3. Re-identified vehicles (same plate, new track id).
        for track_id in result.reidentified:
            rec = tracks_by_id.get(track_id)
            await self._emit(
                db, self._events.EVENT_VEHICLE_REIDENTIFIED, camera_id,
                slot_id=result.assignments.get(track_id),
                tracking_id=track_id,
                license_plate=rec.license_plate if rec else None,
                vehicle_id=rec.vehicle_id if rec else None,
            )

        # 4. Released → close sessions + emit departure events.
        for track_id, slot_id in result.released:
            sess = await crud.get_active_session_by_track(db, camera_id, track_id)
            flags: List[str] = []
            if sess:
                dur = duration_seconds(sess.entry_time, now)
                is_res, res_for = slot_lookup.get(slot_id, (False, None))
                flags = self._violations.evaluate(
                    duration_seconds=dur,
                    is_reserved_slot=bool(is_res),
                    reserved_for=res_for,
                    license_plate=sess.license_plate,
                )
                await crud.close_session(
                    db, sess.session_uid,
                    exit_time=now, duration_seconds=dur,
                    violation_flags=flags,
                )
            await self._emit(
                db, self._events.EVENT_VEHICLE_LEFT, camera_id,
                slot_id=slot_id, tracking_id=track_id,
            )
            await self._emit(
                db, self._events.EVENT_SLOT_RELEASED, camera_id,
                slot_id=slot_id, tracking_id=track_id,
            )

        # 5. Occupancy states.
        states = compute_states(slot_configs, result.assignments)
        await crud.update_slot_states(db, camera_id, states)

        # 6. Live violation sweep on active sessions (reserved / overstay).
        await self._sweep_active_violations(db, camera_id, slot_lookup, now)

        # 7. Compact summary.
        occupied = sum(1 for s in states.values() if s == SlotState.OCCUPIED)
        reserved = sum(1 for s in states.values() if s == SlotState.RESERVED)
        free = sum(1 for s in states.values() if s == SlotState.FREE)
        unknown = sum(1 for s in states.values() if s == SlotState.UNKNOWN)
        total = max(1, len(states))
        return {
            "camera_id": camera_id,
            "assignment": assignment,
            "slots_total": len(states),
            "free": free,
            "occupied": occupied,
            "reserved": reserved,
            "unknown": unknown,
            "occupancy_rate": round(occupied / total, 4),
            "active_vehicles": len(result.assignments),
            "events_this_frame": (
                len(result.newly_assigned) * 3
                + len(result.reidentified)
                + len(result.released) * 2
            ),
        }

    def get_current_assignment(self, camera_id: str, track_id: int) -> Optional[str]:
        """Read-only lookup of the slot currently owned by a track.

        Returns the slot_id from Module 2's live mapping without running a
        frame ingest or writing to the database. Used by REST/snapshot paths
        that need ownership but do not drive ingestion.
        """
        return self._mapper.get_assignment(camera_id, track_id)

    async def _sweep_active_violations(
        self,
        db: AsyncSession,
        camera_id: str,
        slot_lookup: Dict[str, tuple],
        now: datetime,
    ) -> None:
        """Re-evaluate violation flags on still-open sessions (live)."""
        active = await crud.list_sessions(db, active_only=True, camera_id=camera_id, limit=1000)
        for sess in active:
            dur = duration_seconds(sess.entry_time, now)
            is_res, res_for = slot_lookup.get(sess.slot_id or "", (False, None))
            flags = self._violations.evaluate(
                duration_seconds=dur,
                is_reserved_slot=bool(is_res),
                reserved_for=res_for,
                license_plate=sess.license_plate,
            )
            if flags:
                merged = ViolationEngine.merge(sess.violation_flags, flags)
                if merged != list(sess.violation_flags or []):
                    sess.violation_flags = merged
                    await db.flush()

    async def _emit(self, db, event_type, camera_id, **kw) -> None:
        event = self._events.build(event_type, camera_id, **kw)
        self._events.record(event)
        await crud.create_event(db, event)

    # ── Read helpers (used by the REST API) ──────────────────────────────

    async def occupancy_summary(
        self, db: AsyncSession, camera_id: Optional[str] = None
    ) -> Dict:
        slots = await crud.get_slots(db, camera_id=camera_id)
        by_state = {s.value: 0 for s in SlotState}
        for slot in slots:
            by_state[slot.state.value] = by_state.get(slot.state.value, 0) + 1
        total = max(1, len(slots))
        occupied = by_state.get(SlotState.OCCUPIED.value, 0)
        per_camera: Dict[str, Dict] = {}
        for slot in slots:
            cam = per_camera.setdefault(slot.camera_id, {
                "free": 0, "occupied": 0, "reserved": 0, "unknown": 0, "total": 0
            })
            cam[slot.state.value] += 1
            cam["total"] += 1
        return {
            "total_slots": len(slots),
            "free": by_state.get(SlotState.FREE.value, 0),
            "occupied": occupied,
            "reserved": by_state.get(SlotState.RESERVED.value, 0),
            "unknown": by_state.get(SlotState.UNKNOWN.value, 0),
            "occupancy_rate": round(occupied / total, 4),
            "per_camera": per_camera,
        }

    async def statistics(self, db: AsyncSession) -> Dict:
        active = await crud.count_sessions(db, active_only=True)
        total_sessions = await crud.count_sessions(db)
        events = {t: await crud.count_events(db, t) for t in self._events.ALL_TYPES}

        # Aggregate closed-session durations.
        result = await db.execute(
            select(
                func.count(ParkingSession.id),
                func.coalesce(func.avg(ParkingSession.duration_seconds), 0.0),
                func.coalesce(func.max(ParkingSession.duration_seconds), 0.0),
            ).where(ParkingSession.is_active == False)  # noqa: E712
        )
        closed_count, avg_dur, max_dur = result.one()
        closed_count = int(closed_count or 0)

        # Top plates by visit count.
        plate_res = await db.execute(
            select(
                ParkingSession.license_plate,
                func.count(ParkingSession.id).label("visits"),
            )
            .where(ParkingSession.license_plate.isnot(None))
            .group_by(ParkingSession.license_plate)
            .order_by(func.count(ParkingSession.id).desc())
            .limit(10)
        )
        top_plates = [
            {"license_plate": p, "visits": int(v)}
            for p, v in plate_res.all()
        ]

        # Violation tallies.
        vres = await db.execute(
            select(ParkingSession.violation_flags).where(
                ParkingSession.violation_flags.isnot(None)
            )
        )
        violation_counts: Dict[str, int] = {}
        for (flags,) in vres.all():
            for f in (flags or []):
                violation_counts[f] = violation_counts.get(f, 0) + 1

        return {
            "active_sessions": active,
            "total_sessions": total_sessions,
            "closed_sessions": closed_count,
            "average_duration_seconds": round(float(avg_dur or 0.0), 2),
            "average_duration": format_duration(float(avg_dur or 0.0)),
            "max_duration_seconds": round(float(max_dur or 0.0), 2),
            "max_duration": format_duration(float(max_dur or 0.0)),
            "events": events,
            "total_events": sum(events.values()),
            "top_plates": top_plates,
            "violations": violation_counts,
        }

    def reset_camera(self, camera_id: str) -> None:
        """Drop in-memory mapping for a camera (e.g. on reconnect)."""
        self._mapper.reset_camera(camera_id)

    def reset(self) -> None:
        """Reset all in-memory mapper state and slot assignments."""
        from .mapping.slot_mapper import SlotMapper
        self._mapper = SlotMapper()
