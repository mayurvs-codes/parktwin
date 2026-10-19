"""
ParkTwin AI — Integration Service (Module 3 orchestrator)
=====================================================
The single place that wires the adapters, the event bus, the synchronizer,
and the WebSocket manager around one business frame.

For every frame it:

  1. Feeds the records into **Module 2** (``ParkingIntelligenceEngine``) and
     collects the lifecycle events that engine emits *this frame only*, plus
     the authoritative per-frame ``SlotAssignment`` (D5 Phase 4).
  2. Consumes **Module 1** (Vehicle Recognition) outputs and publishes
     ``VehicleDetected`` / ``VehicleTracked`` integration events — emitted
     *after* ``ingest_frame`` so their ``slot`` / ``occupied`` fields are
     composed from Module 2's ``SlotAssignment`` (D5 Phase 4).
  3. Translates the Module 2 events into the canonical integration events
     (``VehicleParked``, ``VehicleExited``, ``SessionStarted``,
     ``SessionEnded``, ``SlotOccupied``, ``SlotReleased``) and publishes them.
  4. Runs the :class:`Synchronizer` to keep Vehicle/Session/Slot/Event
     consistent.
  5. Pushes live updates (vehicles / occupancy / sessions / events) to the
     WebSocket :class:`ConnectionManager`.

It contains **no detection, tracking, mapping, or occupancy logic** — it only
orchestrates the modules' public APIs.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from modules.integration_layer.metrics import (
    record_frame_processing_duration,
    record_vehicles_detected,
    set_parking_occupancy_rate,
)


from sqlalchemy.ext.asyncio import AsyncSession

from modules.parking_intelligence import ParkingIntelligenceEngine
from modules.parking_intelligence.storage import crud as parking_crud

from ..adapters import (
    event_to_dto,
    occupancy_to_dto,
    record_to_live,
    session_to_dto,
    slot_to_dto,
    translate,
    vehicle_to_dto,
)
from ..events.bus import EventBus, IntegrationEvent
from ..sync import Synchronizer
from ..websocket.manager import ConnectionManager
from ..voice import get_voice_service


class IntegrationService:
    """Orchestrates the Integration Layer around each business frame."""

    def __init__(
        self,
        event_bus: EventBus,
        ws_manager: ConnectionManager,
        synchronizer: Synchronizer,
        parking_engine: Optional[ParkingIntelligenceEngine] = None,
    ) -> None:
        self.bus = event_bus
        self.ws = ws_manager
        self.sync = synchronizer
        self.engine = parking_engine or ParkingIntelligenceEngine()

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def ensure_initialized(self, db: AsyncSession) -> None:
        """Bootstrap Module 2 tables/slots once (idempotent)."""
        if not self.engine.initialized:
            await self.engine.init(db)
            try:
                slots = await parking_crud.get_slots(db)
                if not slots:
                    default_slots = [
                        {
                            "slot_id": f"P{i:02d}",
                            "camera_id": "camera_01",
                            "zone": "Zone A" if i <= 5 else "Zone B",
                            "state": "free",
                        }
                        for i in range(1, 11)
                    ]
                    for s in default_slots:
                        await parking_crud.upsert_slot(db, s)
            except Exception:
                pass

    async def reset(self, db: AsyncSession) -> Dict[str, Any]:
        """Reset all parking slots, sessions, journeys, and in-memory engine state."""
        await self.ensure_initialized(db)
        await parking_crud.reset_all_slots(db)
        self.engine.reset()

        # Broadcast clean empty state to all live subscribers
        try:
            from shared.logging import get_logger as _get_logger
            _logger = _get_logger("integration_service.reset")
            slots = await parking_crud.get_slots(db)
            slots_dto = [slot_to_dto(s) for s in slots]
            # occupancy_to_dto expects a dict from engine.occupancy_summary(), NOT a slot list
            occ_summary = await self.engine.occupancy_summary(db)
            occ_dto = occupancy_to_dto(occ_summary)
            now_iso = datetime.now(timezone.utc).isoformat()
            await self.ws.broadcast("slots", [s for s in slots_dto])
            await self.ws.broadcast("occupancy", occ_dto)
            await self.ws.broadcast("sessions", [])
            # Broadcast DigitalTwinReset with both "type" and "event_type" for frontend compatibility
            reset_event = {
                "type": "DigitalTwinReset",
                "event_type": "DigitalTwinReset",
                "journeys": [],
                "timestamp": now_iso,
            }
            await self.ws.broadcast("events", reset_event)
            # Also broadcast each slot as freed so the frontend 2D map goes fully green
            for slot in slots:
                slot_id = slot.slot_id
                freed_event = {
                    "type": "SlotStateChanged",
                    "event_type": "SlotStateChanged",
                    "slot_id": slot_id,
                    "state": "free",
                    "license_plate": None,
                    "camera_id": getattr(slot, "camera_id", "camera_01"),
                    "timestamp": now_iso,
                }
                await self.ws.broadcast("slots", freed_event)
                await self.ws.broadcast("events", freed_event)
        except Exception as exc:
            # Log the actual error so silent failures are visible
            import logging
            logging.getLogger("integration_service").error(
                f"Reset broadcast failed: {exc}", exc_info=True
            )

        return {
            "success": True,
            "status": "ok",
            "message": "Digital Twin state reset successfully. All slots are now free.",
        }

    # ── Core: process one frame end-to-end ───────────────────────────────

    async def handle_frame(
        self,
        db: AsyncSession,
        camera_id: str,
        records: List[Any],
        source: str = "live",
        ts: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Run the full Module 1 → Module 2 integration for one frame.

        ``records`` are Module 1 ``VehicleRecord`` objects. Returns a unified
        payload and side-effects the event bus + WebSocket channels.
        """
        start_time = time.perf_counter()
        await self.ensure_initialized(db)

        # Events emitted during this frame (Module 1 + translated Module 2 + SlotStateChanged).
        integration_events: List[IntegrationEvent] = []

        # Fetch before slot states (M2 CRUD)
        before_states = {}
        try:
            if hasattr(db, "execute"):
                before_slots = await parking_crud.get_slots(db, camera_id=camera_id)
                before_states = {
                    s.slot_id: (s.state.value if hasattr(s.state, "value") else str(s.state))
                    for s in before_slots
                }
        except Exception:
            before_states = {}

        # 1. Module 2: ingest and capture *this frame's* events only.
        pre_count_raw = self.engine._events.count()
        pre_count = int(pre_count_raw) if isinstance(pre_count_raw, (int, float)) else 0
        try:
            summary = await self.engine.ingest_frame(db, camera_id, records, source=source, ts=ts)
        except TypeError:
            summary = await self.engine.ingest_frame(db, camera_id, records)
        frame_module_events = self.engine._events._buffer[pre_count:]
        assignment = summary.get("assignment")

        # Compare before/after slot states (M2 CRUD)
        slot_changed_events: List[IntegrationEvent] = []
        try:
            if hasattr(db, "execute"):
                after_slots = await parking_crud.get_slots(db, camera_id=camera_id)
                after_sessions = await parking_crud.list_sessions(db, camera_id=camera_id, limit=100)
                active_sessions_by_slot = {
                    s.slot_id: s for s in after_sessions if getattr(s, "is_active", False) and getattr(s, "slot_id", None)
                }

                now_iso = datetime.now(timezone.utc).isoformat()
                for slot in after_slots:
                    slot_id = slot.slot_id
                    new_state = slot.state.value if hasattr(slot.state, "value") else str(slot.state)
                    old_state = before_states.get(slot_id)

                    if old_state != new_state:
                        active_sess = active_sessions_by_slot.get(slot_id)
                        session_id = getattr(active_sess, "session_uid", None) if active_sess else None
                        license_plate = getattr(active_sess, "license_plate", None) if active_sess else None

                        payload = {
                            "slot_id": slot_id,
                            "camera_id": camera_id,
                            "state": new_state,
                            "session_id": session_id,
                            "license_plate": license_plate,
                            "timestamp": now_iso,
                        }
                        ie_slot = self._make_event("SlotStateChanged", camera_id, payload)
                        integration_events.append(ie_slot)
                        slot_changed_events.append(ie_slot)
                        await self.bus.publish(ie_slot)
        except Exception:
            pass

        # 2. Module 1 events — emitted AFTER ingest_frame so that each
        #    vehicle's ``slot`` / ``occupied`` fields are composed from
        #    Module 2's authoritative SlotAssignment (D5 Phase 4). The same
        #    composed live vehicle view is reused for the WebSocket broadcast.
        vehicles_live = record_to_live(records, assignment)
        for v in vehicles_live:
            ie_det = self._make_event("VehicleDetected", camera_id, {"source": "vehicle_recognition", "record": v})
            ie_trk = self._make_event("VehicleTracked", camera_id, {"source": "vehicle_recognition", "record": v})
            integration_events.append(ie_det)
            integration_events.append(ie_trk)
            await self.bus.publish(ie_det)
            await self.bus.publish(ie_trk)

        # 3. Translate Module 2 events → integration events.
        for ev in frame_module_events:
            for itype, payload in translate(ev.get("event_type", ""), ev):
                ie = self._make_event(itype, camera_id, payload)
                integration_events.append(ie)
                await self.bus.publish(ie)

                # Process WrongBayWarning -> VoiceService
                if itype == "WrongBayWarning":
                    meta = payload.get("meta", {}) or payload
                    v_warn = get_voice_service().build_wrong_bay_warning(
                        event_id=meta.get("episode_id", f"EV-{uuid.uuid4().hex[:8]}"),
                        vehicle_id=meta.get("vehicle_id", payload.get("vehicle_id", "UNKNOWN")),
                        assigned_bay=meta.get("assigned_bay", "UNKNOWN"),
                        actual_bay=meta.get("actual_bay", payload.get("slot_id")),
                        source=meta.get("source", "live"),
                    )
                    if v_warn:
                        ie_v = self._make_event("VoiceAnnouncement", camera_id, v_warn.to_dict())
                        integration_events.append(ie_v)
                        await self.bus.publish(ie_v)
                        await self.ws.broadcast("events", {"event_type": "VOICE_ANNOUNCEMENT", "payload": v_warn.to_dict()})

                # Process WrongBayResolved -> VoiceService
                elif itype == "WrongBayResolved":
                    meta = payload.get("meta", {}) or payload
                    c_info = get_voice_service().cancel_message(
                        meta.get("episode_id", ""),
                        reason=meta.get("resolution_reason", "wrong_bay_resolved"),
                    )
                    ie_c = self._make_event("VoiceCancel", camera_id, c_info)
                    integration_events.append(ie_c)
                    await self.bus.publish(ie_c)
                    await self.ws.broadcast("events", {"event_type": "VOICE_CANCEL", "payload": c_info})

        # 3b. ANPR assignment -> compute route -> VoiceService announcement
        if assignment and getattr(assignment, "newly_assigned", None):
            from backend.services.navigation_service import compute_route
            for trk_id, slt_id in assignment.newly_assigned.items():
                v_record = next((r for r in records if getattr(r, "tracking_id", getattr(r, "track_id", None)) == trk_id), None)
                v_id = getattr(v_record, "vehicle_id", getattr(v_record, "prototype_id", None)) if v_record else f"TRACK-{trk_id}"
                route = compute_route("ACCESS_POINT_B2", slt_id)
                route_steps = route.get("directions") if route else None
                v_assign = get_voice_service().build_assignment_message(
                    event_id=f"ASN-{trk_id}-{slt_id}",
                    vehicle_id=v_id,
                    assigned_bay=slt_id,
                    route_directions=route_steps,
                    source="live",
                )
                if v_assign:
                    ie_asn = self._make_event("VoiceAnnouncement", camera_id, v_assign.to_dict())
                    integration_events.append(ie_asn)
                    await self.bus.publish(ie_asn)
                    await self.ws.broadcast("events", {"event_type": "VOICE_ANNOUNCEMENT", "payload": v_assign.to_dict()})

        # 4. Cross-module consistency.
        sync_report = await self.sync.reconcile(db, camera_id=camera_id)

        # 5. Build live payloads.
        occupancy = occupancy_to_dto(
            await self.engine.occupancy_summary(db, camera_id=camera_id)
        )
        sessions = []
        try:
            if hasattr(db, "execute"):
                sessions = await parking_crud.list_sessions(
                    db, active_only=False, camera_id=camera_id, limit=100
                )
        except Exception:
            sessions = []
        # vehicles_live already composed at step 2 from SlotAssignment.

        # 6. Push to WebSocket channels (isolated transport).
        await self.ws.broadcast("vehicles", {"camera_id": camera_id, "vehicles": vehicles_live})
        await self.ws.broadcast("occupancy", {"camera_id": camera_id, **occupancy})
        await self.ws.broadcast(
            "sessions",
            {"camera_id": camera_id, "sessions": [session_to_dto(s) for s in sessions]},
        )
        await self.ws.broadcast(
            "events",
            {"camera_id": camera_id, "events": [e.to_dict() for e in integration_events]},
        )
        for ie_slot in slot_changed_events:
            await self.ws.broadcast("slots", ie_slot.to_dict())

        # Record Prometheus metrics
        elapsed = time.perf_counter() - start_time
        record_frame_processing_duration(elapsed)
        record_vehicles_detected(camera_id, len(records))
        if occupancy and "occupancy_rate" in occupancy:
            try:
                rate = float(occupancy["occupancy_rate"])
                set_parking_occupancy_rate(camera_id, rate)
            except (ValueError, TypeError):
                pass

        return {
            "camera_id": camera_id,
            "summary": summary,
            "vehicles": vehicles_live,
            "occupancy": occupancy,
            "sessions": [session_to_dto(s) for s in sessions],
            "events": [e.to_dict() for e in integration_events],
            "sync": sync_report,
        }

    # ── Read helpers (unified facade over Module 1 + Module 2) ──────────

    async def list_vehicles(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        plate: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        from modules.vehicle_recognition.storage import crud as vehicle_crud

        rows = await vehicle_crud.get_all_vehicles(db, skip=skip, limit=limit, plate=plate)
        return [vehicle_to_dto(v) for v in rows]

    async def list_slots(
        self,
        db: AsyncSession,
        camera_id: Optional[str] = None,
        state: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        rows = await parking_crud.get_slots(db, camera_id=camera_id, state=state)
        return [slot_to_dto(s) for s in rows]

    async def list_sessions(
        self,
        db: AsyncSession,
        *,
        active_only: bool = False,
        camera_id: Optional[str] = None,
        plate: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        rows = await parking_crud.list_sessions(
            db, active_only=active_only, camera_id=camera_id, plate=plate, skip=skip, limit=limit
        )
        return [session_to_dto(s) for s in rows]

    async def occupancy(self, db: AsyncSession, camera_id: Optional[str] = None) -> Dict[str, Any]:
        return occupancy_to_dto(await self.engine.occupancy_summary(db, camera_id=camera_id))

    async def list_events(
        self,
        db: AsyncSession,
        *,
        source: str = "integration",  # integration | module
        event_type: Optional[str] = None,
        camera_id: Optional[str] = None,
        slot_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> Dict[str, Any]:
        if source == "module":
            rows = await parking_crud.list_events(
                db, event_type=event_type, camera_id=camera_id, slot_id=slot_id, skip=skip, limit=limit
            )
            return {"source": "module", "events": [event_to_dto(e) for e in rows]}
        # Default: integration bus events.
        events = self.bus.get_recent(limit=limit, event_type=event_type)
        counts = {}
        try:
            counts = self.bus.all_types()
        except NotImplementedError:
            counts = {}
        return {"source": "integration", "events": events, "counts_by_type": counts}

    async def statistics(self, db: AsyncSession) -> Dict[str, Any]:
        return await self.engine.statistics(db)

    async def synchronize(self, db: AsyncSession, camera_id: Optional[str] = None) -> Dict[str, Any]:
        return await self.sync.reconcile(db, camera_id=camera_id)

    async def health(self, db: AsyncSession) -> Dict[str, Any]:
        occ = occupancy_to_dto(await self.engine.occupancy_summary(db))
        counts: Dict[str, int] = {}
        try:
            counts = self.bus.all_types()
        except NotImplementedError:
            counts = {}
        return {
            "integration": "ok",
            "parking_engine_initialized": self.engine.initialized,
            "event_bus": type(self.bus).__name__,
            "event_counts": counts,
            "websocket_subscribers": self.ws.channel_counts(),
            "occupancy": occ,
        }

    async def process_anpr_assignment(
        self,
        camera_id: str,
        vehicle_id: str,
        assigned_bay: str,
        source: str = "live",
    ) -> Optional[Dict[str, Any]]:
        """Wire ANPR assignment -> compute_vehicle_route -> VoiceService ASSIGNMENT announcement."""
        from backend.services.navigation_service import compute_route
        route = compute_route("ACCESS_POINT_B2", assigned_bay)
        route_steps = route.get("directions") if route else None

        voice_msg = get_voice_service().build_assignment_message(
            event_id=f"ANPR-ASN-{vehicle_id}-{assigned_bay}",
            vehicle_id=vehicle_id,
            assigned_bay=assigned_bay,
            route_directions=route_steps,
            source=source,
        )
        if voice_msg:
            ie = self._make_event("VoiceAnnouncement", camera_id, voice_msg.to_dict())
            await self.bus.publish(ie)
            await self.ws.broadcast("events", {"event_type": "VOICE_ANNOUNCEMENT", "payload": voice_msg.to_dict()})
            return voice_msg.to_dict()
        return None

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _make_event(self, event_type: str, camera_id: Optional[str], payload: Dict[str, Any]) -> IntegrationEvent:
        return IntegrationEvent(
            event_type=event_type,
            camera_id=camera_id,
            payload=payload or {},
            event_id=f"IE-{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(timezone.utc),
        )
