"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Utilization analytics.

Consumes the Integration Layer session list (``/integration/sessions``) and
slot list (``/integration/slots``) — never Module 1 / Module 2 internals.
Produces:

  - slot utilization         (share of slots used at least once)
  - average parking duration (mean of closed-session durations)
  - most used slots          (top slots by session count)
  - least used slots         (slots with fewest sessions, zeros first)
  - turnover rate            (total sessions per slot)
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List, Optional

from ..metrics.base import clamp01, mean, round2, safe_div


from shared.helpers.time_utils import format_duration


def compute_utilization(
    sessions: List[Dict[str, Any]],
    slots: List[Dict[str, Any]],
    statistics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute utilization analytics from Integration Layer outputs.

    ``sessions`` and ``slots`` are Integration Layer DTO lists. ``statistics``
    is the optional Module 2 statistics DTO, used only to cross-check the
    average duration.
    """
    sessions = sessions or []
    slots = slots or []
    total_slots = len(slots)

    # Per-slot session counts (only sessions bound to a slot).
    by_slot: Counter = Counter()
    for s in sessions:
        sid = s.get("slot_id")
        if sid:
            by_slot[sid] += 1

    used_slots = len(by_slot)
    slot_utilization = clamp01(safe_div(used_slots, total_slots))

    # Average parking duration over sessions that have a recorded duration.
    durations = [float(s.get("duration_seconds", 0.0) or 0.0) for s in sessions if s.get("duration_seconds")]
    avg_duration = mean(durations)

    # Most / least used slots.
    most_used = sorted(by_slot.items(), key=lambda kv: (-kv[1], kv[0]))[:10]
    # Least used: every slot, zeros first, then ascending counts.
    all_slot_ids = [s.get("slot_id") for s in slots if s.get("slot_id")]
    zero_used = [sid for sid in all_slot_ids if by_slot.get(sid, 0) == 0]
    used_sorted = sorted(by_slot.items(), key=lambda kv: (kv[1], kv[0]))
    least_items = ([(sid, 0) for sid in zero_used] + used_sorted)[:10]

    turnover_rate = round2(safe_div(len(sessions), total_slots))

    # Cross-check average duration against Module 2 statistics if provided.
    stats_avg = None
    if statistics:
        stats_avg = statistics.get("average_duration_seconds")

    return {
        "slot_utilization": round2(slot_utilization),
        "slot_utilization_percentage": round2(slot_utilization * 100.0),
        "used_slots": used_slots,
        "total_slots": total_slots,
        "average_parking_duration_seconds": round2(avg_duration),
        "average_parking_duration": format_duration(avg_duration),
        "turnover_rate": turnover_rate,
        "most_used_slots": [{"slot_id": k, "usage_count": v} for k, v in most_used],
        "least_used_slots": [{"slot_id": k, "usage_count": v} for k, v in least_items],
        "statistics_crosscheck": {
            "average_duration_seconds": round2(stats_avg) if stats_avg is not None else None,
        },
    }


__all__ = ["compute_utilization", "format_duration"]
