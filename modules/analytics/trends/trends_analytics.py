"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Trends analytics.

Two families of outputs:

  1. Timelines — built from *stored* analytics history (the snapshots the
     Analytics Engine persists via its storage layer). Each history item is a
     ``{timestamp, payload}`` record; the builders reshape it into a clean
     time series.

  2. Session / duration statistics — computed live from the current
     Integration Layer session list (``/integration/sessions``) and the
     Module 2 statistics DTO.

Nothing here reads Module 1 / Module 2 internals directly; timelines read the
Analytics Engine's own storage and the rest reads Integration Layer DTOs.
"""

from __future__ import annotations

from typing import Any, Dict, List, Sequence

from ..metrics.base import mean, median, percentile, round2, safe_div
from ..utilization.utilization_analytics import format_duration


# ─── Timelines (from stored history) ─────────────────────────────────────────

def build_occupancy_timeline(history: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Reshape occupancy snapshots into an ascending time series.

    Each ``history`` item is ``{"timestamp": <iso>, "payload": {...}}`` where
    ``payload`` is the output of :func:`compute_occupancy`.
    """
    series: List[Dict[str, Any]] = []
    for item in history:
        ts = item.get("timestamp")
        p = item.get("payload", {}) or {}
        series.append({
            "timestamp": ts,
            "current_occupancy": p.get("current_occupancy", 0),
            "occupancy_percentage": p.get("occupancy_percentage", 0.0),
            "free_slots": p.get("free_slots", 0),
            "reserved_slots": p.get("reserved_slots", 0),
        })
    series.sort(key=lambda r: str(r.get("timestamp") or ""))
    return series


def build_traffic_timeline(history: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Reshape traffic snapshots into an ascending time series.

    Each ``history`` item is ``{"timestamp": <iso>, "payload": {...}}`` where
    ``payload`` is the output of :func:`compute_traffic`.
    """
    series: List[Dict[str, Any]] = []
    for item in history:
        ts = item.get("timestamp")
        p = item.get("payload", {}) or {}
        series.append({
            "timestamp": ts,
            "vehicle_entries": p.get("vehicle_entries", 0),
            "vehicle_exits": p.get("vehicle_exits", 0),
            "active_vehicles": p.get("active_vehicles", 0),
        })
    series.sort(key=lambda r: str(r.get("timestamp") or ""))
    return series


# ─── Live statistics (from Integration Layer DTOs) ───────────────────────────

def compute_session_statistics(
    sessions: List[Dict[str, Any]],
    statistics: Dict[str, Any],
) -> Dict[str, Any]:
    """Session-level statistics from the Integration Layer outputs."""
    sessions = sessions or []
    total = len(sessions)
    active = sum(1 for s in sessions if s.get("is_active"))
    closed = total - active
    durations = [float(s.get("duration_seconds", 0.0) or 0.0) for s in sessions if s.get("duration_seconds")]

    return {
        "total_sessions": total,
        "active_sessions": active,
        "closed_sessions": closed,
        "average_duration_seconds": round2(mean(durations)),
        "average_duration": format_duration(mean(durations)),
        "max_duration_seconds": round2(max(durations) if durations else 0.0),
        "max_duration": format_duration(max(durations) if durations else 0.0),
        "module2_crosscheck": {
            "active_sessions": statistics.get("active_sessions"),
            "total_sessions": statistics.get("total_sessions"),
            "average_duration_seconds": statistics.get("average_duration_seconds"),
        },
    }


def compute_duration_statistics(sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Distribution + percentile summary of parking durations (seconds)."""
    sessions = sessions or []
    durations = sorted(float(s.get("duration_seconds", 0.0) or 0.0) for s in sessions if s.get("duration_seconds"))

    if not durations:
        return {
            "count": 0,
            "min_seconds": 0.0,
            "max_seconds": 0.0,
            "mean_seconds": 0.0,
            "median_seconds": 0.0,
            "p25_seconds": 0.0,
            "p75_seconds": 0.0,
            "p90_seconds": 0.0,
            "distribution": [],
        }

    # Bucket durations into 5-minute (300s) bins for a quick histogram.
    bucket_size = 300.0
    buckets: Dict[int, int] = {}
    for d in durations:
        idx = int(d // bucket_size)
        buckets[idx] = buckets.get(idx, 0) + 1
    distribution = [
        {
            "bucket_seconds": idx * int(bucket_size),
            "bucket_label": format_duration(idx * bucket_size),
            "count": count,
        }
        for idx, count in sorted(buckets.items())
    ]

    return {
        "count": len(durations),
        "min_seconds": round2(durations[0]),
        "max_seconds": round2(durations[-1]),
        "mean_seconds": round2(mean(durations)),
        "median_seconds": round2(median(durations)),
        "p25_seconds": round2(percentile(durations, 25)),
        "p75_seconds": round2(percentile(durations, 75)),
        "p90_seconds": round2(percentile(durations, 90)),
        "distribution": distribution,
    }


__all__ = [
    "build_occupancy_timeline",
    "build_traffic_timeline",
    "compute_session_statistics",
    "compute_duration_statistics",
]
