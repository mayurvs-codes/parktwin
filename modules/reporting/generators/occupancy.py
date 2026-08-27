"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Occupancy Report generator.

Current occupancy state, the full slot inventory (with states), and per-camera
breakdown. Consumes the Integration Layer (occupancy, slots) and the Analytics
Engine (occupancy analytics + occupancy timeline). No Module 1/2 access.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseGenerator, section
from ..types import OCCUPANCY
from ..utils import to_number


class OccupancyGenerator(BaseGenerator):
    report_type = OCCUPANCY

    async def build_sections(self, fetcher, params: Dict[str, Any]) -> List[Any]:
        occ = await fetcher.occupancy()
        slots = await fetcher.slots()
        analytics_occ = await fetcher.analytics_occupancy()
        trends = await fetcher.analytics_trends(history_limit=int(params.get("timeline_limit", 24)))

        total = to_number(occ.get("total_slots"))
        occupied = to_number(occ.get("occupied"))
        free = to_number(occ.get("free"))
        reserved = to_number(occ.get("reserved"))
        unknown = to_number(occ.get("unknown", 0))

        metrics = [
            ("Total Slots", int(total)),
            ("Occupied", int(occupied)),
            ("Free", int(free)),
            ("Reserved", int(reserved)),
            ("Unknown", int(unknown)),
            ("Occupancy Rate (%)", float(analytics_occ.get("occupancy_percentage", 0.0))),
            ("Average Occupancy (%)", analytics_occ.get("average_occupancy_percentage", 0.0)),
        ]

        slot_rows = [
            {
                "slot_id": s.get("slot_id"),
                "camera_id": s.get("camera_id"),
                "zone": s.get("zone"),
                "state": s.get("state"),
                "is_reserved": bool(s.get("is_reserved")),
            }
            for s in slots
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

        timeline = trends.get("occupancy_timeline", []) or []
        timeline_rows = [
            {
                "timestamp": p.get("timestamp"),
                "current_occupancy": to_number(p.get("current_occupancy")),
                "occupancy_percentage": to_number(p.get("occupancy_percentage")),
                "free_slots": to_number(p.get("free_slots")),
            }
            for p in timeline[-int(params.get("timeline_points", 24)):]
        ]

        return [
            section("metrics", "Current Occupancy", metrics),
            section("table", "Slot Inventory", slot_rows),
            section("table", "Per-Camera Occupancy", cam_rows),
            section("table", "Occupancy Timeline (recent)", timeline_rows),
        ]


__all__ = ["OccupancyGenerator"]
