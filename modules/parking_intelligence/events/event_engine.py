"""
ParkTwin AI — Event Engine
=============================
Builds and buffers parking lifecycle events. The engine emits six event
types required by the spec; the orchestrating engine persists them via the
storage CRUD while this class keeps an in-memory ring buffer for fast
read APIs and analytics without a DB round-trip.

    vehicle_entered    : a vehicle entered the monitored area / got a slot
    vehicle_parked     : a vehicle settled into a slot (session opened)
    vehicle_left       : a vehicle departed and its slot was released
    slot_occupied     : a slot transitioned to OCCUPIED
    slot_released      : a slot transitioned back to FREE
    vehicle_reidentified: a plate re-appeared on a new track id
"""

from __future__ import annotations

import uuid

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


from shared.helpers.ring_buffer import RingBuffer


class EventEngine:
    """Builds, validates, and buffers parking events."""

    EVENT_VEHICLE_ENTERED = "vehicle_entered"
    EVENT_VEHICLE_PARKED = "vehicle_parked"
    EVENT_VEHICLE_LEFT = "vehicle_left"
    EVENT_SLOT_OCCUPIED = "slot_occupied"
    EVENT_SLOT_RELEASED = "slot_released"
    EVENT_VEHICLE_REIDENTIFIED = "vehicle_reidentified"
    EVENT_WRONG_BAY_ENTRY_WARNING = "wrong_bay_entry_warning"
    EVENT_WRONG_BAY_DURATION_WARNING = "wrong_bay_duration_warning"
    EVENT_WRONG_BAY_ESCALATED = "wrong_bay_escalated"
    EVENT_WRONG_BAY_RESOLVED = "wrong_bay_resolved"

    ALL_TYPES = (
        EVENT_VEHICLE_ENTERED,
        EVENT_VEHICLE_PARKED,
        EVENT_VEHICLE_LEFT,
        EVENT_SLOT_OCCUPIED,
        EVENT_SLOT_RELEASED,
        EVENT_VEHICLE_REIDENTIFIED,
        EVENT_WRONG_BAY_ENTRY_WARNING,
        EVENT_WRONG_BAY_DURATION_WARNING,
        EVENT_WRONG_BAY_ESCALATED,
        EVENT_WRONG_BAY_RESOLVED,
    )


    def __init__(self, max_buffer: int = 2000) -> None:
        self._buffer: RingBuffer[Dict[str, Any]] = RingBuffer(max_buffer)

    def build(
        self,
        event_type: str,
        camera_id: Optional[str] = None,
        *,
        slot_id: Optional[str] = None,
        tracking_id: Optional[int] = None,
        license_plate: Optional[str] = None,
        vehicle_id: Optional = None,
        timestamp: Optional[datetime] = None,
        meta: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Construct a normalized event dict (does not buffer or persist)."""
        if event_type not in self.ALL_TYPES:
            raise ValueError(f"Unknown parking event type: {event_type!r}")
        return {
            "event_uid": f"PE-{uuid.uuid4().hex[:12]}",
            "event_type": event_type,
            "camera_id": camera_id,
            "slot_id": slot_id,
            "tracking_id": None if tracking_id is None else int(tracking_id),
            "license_plate": license_plate,
            "vehicle_id": vehicle_id,
            "timestamp": (timestamp or datetime.now(timezone.utc)),
            "meta": dict(meta or {}),
        }

    def record(self, event_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Append an event to the in-memory ring buffer (most-recent last)."""
        self._buffer.append(event_dict)
        return event_dict

    def recent(self, limit: int = 100, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return the most-recent events, optionally filtered by type."""
        out = self._buffer.to_list()
        if event_type:
            out = [e for e in out if e["event_type"] == event_type]
        return out[-max(1, int(limit)):]

    def count(self, event_type: Optional[str] = None) -> int:
        if not event_type:
            return len(self._buffer)
        return sum(1 for e in self._buffer if e["event_type"] == event_type)

    def clear(self) -> None:
        self._buffer.clear()
