"""
ParkTwin AI — Parking Intelligence Adapter (Module 2 → Integration)
=================================================================
Maps Module 2 ORM rows / summaries into integration-layer DTOs. Reads the
public ORM models and the engine's summary dicts only.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def slot_to_dto(slot) -> Dict[str, Any]:
    """Adapt a Module 2 ``ParkingSlot`` ORM row."""
    return {
        "id": str(slot.id) if getattr(slot, "id", None) is not None else None,
        "slot_id": getattr(slot, "slot_id", None),
        "camera_id": getattr(slot, "camera_id", None),
        "zone": getattr(slot, "zone", "general"),
        "state": _state(getattr(slot, "state", None)),
        "is_reserved": bool(getattr(slot, "is_reserved", False)),
        "reserved_for": getattr(slot, "reserved_for", None),
        "position": getattr(slot, "position", None),
        "created_at": _iso(getattr(slot, "created_at", None)),
        "updated_at": _iso(getattr(slot, "updated_at", None)),
    }


def session_to_dto(session) -> Dict[str, Any]:
    """Adapt a Module 2 ``ParkingSession`` ORM row."""
    return {
        "session_uid": getattr(session, "session_uid", None),
        "camera_id": getattr(session, "camera_id", None),
        "slot_id": getattr(session, "slot_id", None),
        "license_plate": getattr(session, "license_plate", None),
        "tracking_id": getattr(session, "tracking_id", None),
        "entry_time": _iso(getattr(session, "entry_time", None)),
        "exit_time": _iso(getattr(session, "exit_time", None)),
        "duration_seconds": float(getattr(session, "duration_seconds", 0.0) or 0.0),
        "is_active": bool(getattr(session, "is_active", True)),
        "violation_flags": list(getattr(session, "violation_flags", []) or []),
    }


def event_to_dto(event) -> Dict[str, Any]:
    """Adapt a Module 2 ``ParkingEvent`` ORM row."""
    return {
        "event_uid": getattr(event, "event_uid", None),
        "event_type": getattr(event, "event_type", None),
        "camera_id": getattr(event, "camera_id", None),
        "slot_id": getattr(event, "slot_id", None),
        "tracking_id": getattr(event, "tracking_id", None),
        "license_plate": getattr(event, "license_plate", None),
        "timestamp": _iso(getattr(event, "timestamp", None)),
        "meta": getattr(event, "meta", {}) or {},
    }


def occupancy_to_dto(summary: Dict[str, Any]) -> Dict[str, Any]:
    """Adapt a Module 2 ``occupancy_summary`` dict (pass-through with docs)."""
    return {
        "total_slots": summary.get("total_slots", 0),
        "free": summary.get("free", 0),
        "occupied": summary.get("occupied", 0),
        "reserved": summary.get("reserved", 0),
        "unknown": summary.get("unknown", 0),
        "occupancy_rate": summary.get("occupancy_rate", 0.0),
        "per_camera": summary.get("per_camera", {}),
    }


def _state(value: Any) -> Optional[str]:
    return value.value if hasattr(value, "value") else value


def _iso(value: Any) -> Optional[str]:
    return value.isoformat() if value is not None else None
