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
