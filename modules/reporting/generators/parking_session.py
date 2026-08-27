"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Parking Session Report generator.

All parking sessions (active + historical) with durations and violation flags,
plus aggregate session statistics. Consumes the Integration Layer (sessions,
statistics) and the Analytics Engine (utilization + duration statistics). No
Module 1/2 access.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseGenerator, section
from ..types import PARKING_SESSION
from ..utils import fmt_duration, to_number


class ParkingSessionGenerator(BaseGenerator):
    report_type = PARKING_SESSION

    async def build_sections(self, fetcher, params: Dict[str, Any]) -> List[Any]:
        limit = int(params.get("limit", 200))
        sessions = await fetcher.sessions(limit=limit)
        util = await fetcher.analytics_utilization()
        trends = await fetcher.analytics_trends(history_limit=50)

        active = [s for s in sessions if s.get("is_active")]
        closed = [s for s in sessions if not s.get("is_active")]
        durations = [to_number(s.get("duration_seconds")) for s in closed if to_number(s.get("duration_seconds")) > 0]
        avg_dur = sum(durations) / len(durations) if durations else 0.0
        violations = sum(1 for s in sessions if s.get("violation_flags"))

        metrics = [
            ("Total Sessions", len(sessions)),
            ("Active Sessions", len(active)),
            ("Completed Sessions", len(closed)),
            ("Average Duration", fmt_duration(avg_dur)),
            ("Average Duration (s)", round(avg_dur, 2)),
            ("Turnover Rate", util.get("turnover_rate", 0.0)),
            ("Sessions With Violations", violations),
        ]

        session_rows = [
            {
                "session_uid": s.get("session_uid"),
                "license_plate": s.get("license_plate") or "(unknown)",
                "slot_id": s.get("slot_id"),
                "camera_id": s.get("camera_id"),
                "entry_time": s.get("entry_time"),
                "exit_time": s.get("exit_time") or "—",
                "duration_seconds": round(to_number(s.get("duration_seconds")), 2),
                "is_active": bool(s.get("is_active")),
                "violation_flags": ", ".join(s.get("violation_flags") or []) or "—",
            }
            for s in sessions
        ]

        session_stats = trends.get("session_statistics", {}) or {}
        stats_rows = [
            {"metric": k, "value": v}
            for k, v in session_stats.items()
            if not isinstance(v, (dict, list))
        ]

        return [
            section("metrics", "Session Metrics", metrics),
            section("table", "Sessions", session_rows),
            section("table", "Session Statistics", stats_rows),
        ]


__all__ = ["ParkingSessionGenerator"]
