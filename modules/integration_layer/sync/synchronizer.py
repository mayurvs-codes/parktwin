"""
ParkTwin AI — Cross-Module Synchronizer (Module 3)
=================================================
Ensures consistency across the four integration entities:

    Vehicle  ──▶  Parking Session  ──▶  Slot Status  ──▶  Events

The synchronizer is **read-mostly and corrective**: it never invents business
state; it repairs dangling references left by timing gaps (e.g. a session
that lost its vehicle link, or an OCCUPIED slot with no active session).

It reuses the public CRUD of Module 1 (``vehicle_recognition.storage.crud``)
and Module 2 (``parking_intelligence.storage.crud``) plus their shared ORM
models — no business logic is duplicated.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from modules.parking_intelligence.storage import crud as parking_crud
from modules.parking_intelligence.storage.models import SlotState
from modules.vehicle_recognition.storage import crud as vehicle_crud


class Synchronizer:
    """Repairs cross-module consistency and reports what it fixed."""

    async def reconcile(
        self,
        db: AsyncSession,
        camera_id: str | None = None,
    ) -> Dict[str, Any]:
        """Reconcile Vehicle ↔ Session ↔ Slot ↔ Event links.

        Returns a report of every correction made (counts + sampled ids).
        """
        report: Dict[str, Any] = {
            "linked_vehicles": 0,
            "closed_orphan_sessions": 0,
            "released_dangling_slots": 0,
            "corrected": 0,
            "samples": {"sessions_closed": [], "slots_released": [], "vehicles_linked": []},
        }

        # 1. Link active sessions to their vehicles by tracking_id.
        active = await parking_crud.list_sessions(
            db, active_only=True, camera_id=camera_id, limit=10000
        )
        for sess in active:
            if sess.vehicle_id is None and sess.tracking_id is not None:
                veh = await vehicle_crud.get_vehicle_by_tracking_id(db, sess.tracking_id)
                if veh is not None:
                    sess.vehicle_id = veh.id
                    await db.flush()
                    report["linked_vehicles"] += 1
                    report["corrected"] += 1
                    report["samples"]["vehicles_linked"].append(sess.session_uid)

        # 2. Slot <-> active-session consistency.
        slots = await parking_crud.get_slots(db, camera_id=camera_id)
        active_by_slot: Dict[str, list] = {}
        for s in active:
            if s.slot_id:
                active_by_slot.setdefault(s.slot_id, []).append(s)

        now = datetime.now(timezone.utc)
        for slot in slots:
            sess_for_slot = active_by_slot.get(slot.slot_id, [])
            if slot.state == SlotState.OCCUPIED and not sess_for_slot:
                # Occupied slot with no active session → release it.
                await parking_crud.upsert_slot(
                    db,
                    {
                        "slot_id": slot.slot_id,
                        "camera_id": slot.camera_id,
                        "state": SlotState.FREE.value,
                    },
                )
                report["released_dangling_slots"] += 1
                report["corrected"] += 1
                report["samples"]["slots_released"].append(slot.slot_id)
            elif slot.state == SlotState.FREE and sess_for_slot:
                # Active session on a FREE slot → close the orphan(s).
                for s in sess_for_slot:
                    await parking_crud.close_session(
                        db,
                        s.session_uid,
                        exit_time=now,
                        duration_seconds=0.0,
                    )
                    report["closed_orphan_sessions"] += 1
                    report["corrected"] += 1
                    report["samples"]["sessions_closed"].append(s.session_uid)

        return report
