"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Violation Report generator.

Parking-rule violations derived entirely from Integration Layer outputs:
sessions carrying ``violation_flags`` and Module-2 lifecycle events whose type
indicates a violation. Consumes the Integration Layer (sessions, events) only.
No Module 1/2 access.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseGenerator, section
from ..types import VIOLATION
from ..utils import to_number


def _is_violation_event(event_type: Any) -> bool:
    if not event_type:
        return False
    return "violation" in str(event_type).lower()


class ViolationGenerator(BaseGenerator):
    report_type = VIOLATION

    async def build_sections(self, fetcher, params: Dict[str, Any]) -> List[Any]:
        limit = int(params.get("limit", 200))
        sessions = await fetcher.sessions(limit=limit)
        events_resp = await fetcher.events(source="module", limit=int(params.get("event_limit", 500)))
        events = events_resp.get("events", []) if isinstance(events_resp, dict) else []

        flagged_sessions = [s for s in sessions if s.get("violation_flags")]
        violation_events = [e for e in events if _is_violation_event(e.get("event_type"))]

        # Unique plates involved in flagged sessions.
        plates = {
            s.get("license_plate")
            for s in flagged_sessions
            if s.get("license_plate")
        }

        flag_total = sum(len(s.get("violation_flags") or []) for s in flagged_sessions)
        metrics = [
            ("Sessions With Violations", len(flagged_sessions)),
            ("Total Violation Flags (sessions)", flag_total),
            ("Distinct Plates Flagged", len(plates)),
            ("Violation Events (module)", len(violation_events)),
        ]

        violation_rows = [
            {
                "source": "session",
                "session_uid": s.get("session_uid"),
                "license_plate": s.get("license_plate") or "(unknown)",
                "slot_id": s.get("slot_id"),
                "camera_id": s.get("camera_id"),
                "flags": ", ".join(s.get("violation_flags") or []),
                "entry_time": s.get("entry_time"),
            }
            for s in flagged_sessions
        ]
        for e in violation_events:
            violation_rows.append(
                {
                    "source": "event",
                    "session_uid": e.get("event_uid"),
                    "license_plate": e.get("license_plate") or "(unknown)",
                    "slot_id": e.get("slot_id"),
                    "camera_id": e.get("camera_id"),
                    "flags": str(e.get("event_type")),
                    "entry_time": e.get("timestamp"),
                }
            )

        # Count by flag type.
        flag_counter: Dict[str, int] = {}
        for s in flagged_sessions:
            for f in s.get("violation_flags") or []:
                flag_counter[str(f)] = flag_counter.get(str(f), 0) + 1
        flag_rows = [
            {"violation_type": k, "count": v}
            for k, v in sorted(flag_counter.items(), key=lambda kv: -kv[1])
        ]

        return [
            section("metrics", "Violation Metrics", metrics),
            section("table", "Violations", violation_rows),
            section("table", "Violations By Type", flag_rows),
        ]


__all__ = ["ViolationGenerator"]
