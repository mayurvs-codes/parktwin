"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Parking Summary generator.

High-level snapshot of the whole facility: occupancy, active vehicles/sessions,
and recent activity. Consumes the Integration Layer (occupancy, slots, sessions,
vehicles) and the Analytics Engine (traffic). No Module 1/2 access.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseGenerator, section
from ..types import PARKING_SUMMARY
from ..utils import to_number


class ParkingSummaryGenerator(BaseGenerator):
    report_type = PARKING_SUMMARY

    async def build_sections(self, fetcher, params: Dict[str, Any]) -> List[Any]:
        occ = await fetcher.occupancy()
        sessions = await fetcher.sessions(limit=int(params.get("session_limit", 50)))
        vehicles = await fetcher.vehicles(limit=int(params.get("vehicle_limit", 50)))
        traffic = await fetcher.analytics_traffic()

        total_slots = to_number(occ.get("total_slots"))
        occupied = to_number(occ.get("occupied"))
        free = to_number(occ.get("free"))
        reserved = to_number(occ.get("reserved"))
        occupancy_rate = to_number(occ.get("occupancy_rate"))
        if total_slots > 0 and occupancy_rate == 0 and occupied > 0:
            occupancy_rate = round(occupied / total_slots * 100.0, 2)

        vc = traffic.get("vehicle_counts", {}) or {}
        active_sessions = sum(1 for s in sessions if s.get("is_active"))

        metrics = [
            ("Total Slots", int(total_slots)),
            ("Occupied", int(occupied)),
            ("Free", int(free)),
            ("Reserved", int(reserved)),
            ("Occupancy Rate (%)", occupancy_rate),
            ("Active Vehicles", int(vc.get("active", 0))),
            ("Active Sessions", active_sessions),
            ("Total Vehicles Recorded", int(vc.get("total", 0))),
            ("Distinct Vehicles", int(vc.get("distinct", 0))),
        ]

        per_camera = occ.get("per_camera", {}) or {}
        cam_rows = [
            {
                "camera_id": cam,
                "total": int(c.get("total", 0)),
                "occupied": int(c.get("occupied", 0)),
                "free": int(c.get("free", 0)),
                "reserved": int(c.get("reserved", 0)),
            }
            for cam, c in per_camera.items()
        ]

        recent = [
            {
                "session_uid": s.get("session_uid"),
                "license_plate": s.get("license_plate") or "(unknown)",
                "slot_id": s.get("slot_id"),
                "camera_id": s.get("camera_id"),
                "entry_time": s.get("entry_time"),
                "exit_time": s.get("exit_time") or "—",
                "duration_seconds": round(to_number(s.get("duration_seconds")), 2),
                "is_active": bool(s.get("is_active")),
            }
            for s in sessions[: int(params.get("recent_limit", 10))]
        ]

        return [
            section("metrics", "Facility Overview", metrics),
            section("table", "Occupancy by Camera", cam_rows),
            section("table", "Recent Sessions", recent),
        ]


__all__ = ["ParkingSummaryGenerator"]
