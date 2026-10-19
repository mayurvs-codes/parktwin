"""
ParkTwin AI — Duration Tracker
================================
Accurate parking-duration accounting.

``duration_seconds`` is pure and accepts an injectable ``now`` so it is
deterministic under test. ``format_duration`` renders HH:MM:SS for humans
and the API.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def _as_aware(dt: datetime) -> datetime:
    """Coerce a naive datetime to UTC (SQLite drops tzinfo on round-trip)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def duration_seconds(
    entry_time: datetime,
    exit_time: Optional[datetime] = None,
    now: Optional[datetime] = None,
) -> float:
    """Seconds between entry and exit (or now, for an active session)."""
    if entry_time is None:
        return 0.0
    end = exit_time or now or datetime.now(timezone.utc)
    delta = (_as_aware(end) - _as_aware(entry_time)).total_seconds()
    return max(0.0, float(delta))


from shared.helpers.time_utils import format_duration

PARKING_DURATION_THRESHOLD_SECONDS = 600.0  # 10 minutes
PARKING_DURATION_WARNING_THRESHOLD_SECONDS = 480.0  # 8 minutes


def evaluate_long_stay_alert(
    entry_time: datetime,
    assigned_or_parked_space_id: str,
    current_observed_space_id: Optional[str],
    now: Optional[datetime] = None,
) -> dict:
    """
    Evaluates whether an active parking session triggers a Long-Stay Alert.
    CRITICAL RULE:
    The alert ONLY triggers if the vehicle is STILL in the exact same parking space.
    If the vehicle moved, unparked, exited, or changed spaces, alert does NOT trigger.
    """
    if not current_observed_space_id or current_observed_space_id != assigned_or_parked_space_id:
        return {
            "is_alert": False,
            "status": "NORMAL",
            "duration_seconds": 0.0,
            "duration_formatted": "00:00:00",
            "message": "Vehicle is no longer in the same space. Duration re-evaluated.",
            "space_id": assigned_or_parked_space_id,
        }

    dur = duration_seconds(entry_time, now=now)
    fmt = format_duration(dur)

    if dur >= PARKING_DURATION_THRESHOLD_SECONDS:
        return {
            "is_alert": True,
            "status": "LONG_STAY_ALERT",
            "duration_seconds": dur,
            "duration_formatted": fmt,
            "message": f"Long-stay alert: Vehicle continuous occupancy in {assigned_or_parked_space_id} exceeded 10 minutes ({fmt}).",
            "space_id": assigned_or_parked_space_id,
        }
    elif dur >= PARKING_DURATION_WARNING_THRESHOLD_SECONDS:
        return {
            "is_alert": False,
            "status": "WARNING",
            "duration_seconds": dur,
            "duration_formatted": fmt,
            "message": f"Warning: Vehicle parking duration approaching 10-minute limit ({fmt}).",
            "space_id": assigned_or_parked_space_id,
        }
    else:
        return {
            "is_alert": False,
            "status": "NORMAL",
            "duration_seconds": dur,
            "duration_formatted": fmt,
            "message": f"Normal parking duration ({fmt}).",
            "space_id": assigned_or_parked_space_id,
        }
