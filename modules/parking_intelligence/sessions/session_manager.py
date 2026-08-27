"""
ParkTwin AI — Parking Session Manager
=====================================
Helpers for building and closing parking-session records. The persistent work
(upsert into the DB, emitting events) lives in the orchestrating engine and
the storage CRUD; this module owns the *shape* of a session so it stays
consistent everywhere a session is created or closed.
"""

from __future__ import annotations

import uuid

from datetime import datetime, timezone
from typing import Dict, Optional


def build_session_uid(camera_id: str, tracking_id: int, entry_time: Optional[datetime] = None) -> str:
    """Stable, human-readable unique id for a session."""
    stamp = (entry_time or datetime.now(timezone.utc)).strftime("%Y%m%dT%H%M%S")
    return f"PS-{camera_id}-{tracking_id}-{stamp}-{uuid.uuid4().hex[:6]}"


def open_session_data(
    camera_id: str,
    tracking_id: int,
    slot_id: str,
    *,
    entry_time: Optional[datetime] = None,
    license_plate: Optional[str] = None,
    vehicle_id: Optional = None,
) -> Dict:
    """Build the column dict for a freshly opened session."""
    entry = entry_time or datetime.now(timezone.utc)
    return {
        "session_uid": build_session_uid(camera_id, tracking_id, entry),
        "camera_id": camera_id,
        "slot_id": slot_id,
        "tracking_id": int(tracking_id),
        "license_plate": license_plate,
        "vehicle_id": vehicle_id,
        "entry_time": entry,
        "exit_time": None,
        "duration_seconds": 0.0,
        "is_active": True,
        "violation_flags": [],
    }


def close_session_data(
    session: Dict,
    *,
    exit_time: Optional[datetime] = None,
    duration_seconds: float = 0.0,
    violation_flags: Optional[list] = None,
) -> Dict:
    """Mutate a session dict to a closed state (returns the same dict)."""
    exit = exit_time or datetime.now(timezone.utc)
    session["exit_time"] = exit
    session["duration_seconds"] = float(duration_seconds)
    session["is_active"] = False
    if violation_flags is not None:
        session["violation_flags"] = list(violation_flags)
    return session
