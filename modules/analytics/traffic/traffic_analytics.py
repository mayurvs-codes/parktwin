"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Traffic analytics.

Consumes the Integration Layer session list (``/integration/sessions``) and
the Module 2 lifecycle events (``/integration/events?source=module``) — never
Module 1 / Module 2 internals. Produces:

  - vehicle entries      (parking sessions opened)
  - vehicle exits        (parking sessions closed)
  - peak hours           (hour-of-day with the most entries)
  - hourly traffic       (entries bucketed by hour-of-day)
  - daily traffic        (entries bucketed by calendar date)
  - vehicle counts       (total / distinct / active vehicles)
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List, Optional

from ..metrics.base import aggregate_by_day, aggregate_by_hour, date_key, hour_of, round2


def _distinct_vehicles(sessions: List[Dict[str, Any]]) -> int:
    """Count distinct vehicles across sessions (plate first, then track id)."""
    seen: set = set()
    for s in sessions:
        plate = s.get("license_plate")
        if plate:
            seen.add(("plate", str(plate)))
            continue
        tid = s.get("tracking_id")
        if tid is not None:
            seen.add(("track", tid))
    return len(seen)


def compute_traffic(
    sessions: List[Dict[str, Any]],
    events: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Compute traffic analytics from Integration Layer outputs.

    ``sessions`` is the list of session DTOs. ``events`` is the list of
    Module 2 lifecycle-event DTOs (``vehicle_parked`` / ``vehicle_left`` / …).
    The event list is optional and, when supplied, cross-checks the
    session-derived entry / exit counts.
    """
    sessions = sessions or []
    events = events or []

    entries = sum(1 for s in sessions if s.get("entry_time"))
    exits = sum(1 for s in sessions if s.get("exit_time"))
    active = sum(1 for s in sessions if s.get("is_active"))

    # Hourly / daily entry distribution derived from session entry times.
    hourly = aggregate_by_hour(sessions, "entry_time")
    daily = aggregate_by_day(sessions, "entry_time")

    # Peak hour = hour-of-day with the most entries (None if no data).
    peak_hour: Optional[int] = None
    peak_count = -1
    for h, c in hourly.items():
        if c > peak_count:
            peak_count = c
            peak_hour = h

    # Cross-check with lifecycle events when present (vehicle_parked = entry,
    # vehicle_left = exit). These are reported as ``event_*`` for transparency.
    event_entries = sum(
        1 for e in events if (e.get("event_type") in ("vehicle_parked", "vehicle_entered"))
    )
    event_exits = sum(1 for e in events if e.get("event_type") == "vehicle_left")

    # Full 24-hour frame (00..23) so charts have no gaps.
    hourly_full = {h: int(hourly.get(h, 0)) for h in range(24)}

    # Daily timeline sorted ascending by date.
    daily_timeline = [
        {"date": d, "entries": int(c)}
        for d, c in sorted(daily.items(), key=lambda kv: kv[0])
    ]

    return {
        "vehicle_entries": entries,
        "vehicle_exits": exits,
        "active_vehicles": active,
        "peak_hours": [peak_hour] if peak_hour is not None else [],
        "peak_hour": peak_hour,
        "peak_hour_entries": max((peak_count, 0)),
        "hourly_traffic": hourly_full,
        "daily_traffic": daily_timeline,
        "vehicle_counts": {
            "total": len(sessions),
            "distinct": _distinct_vehicles(sessions),
            "active": active,
        },
        "event_crosscheck": {
            "entries": event_entries,
            "exits": event_exits,
        },
    }


__all__ = ["compute_traffic"]
