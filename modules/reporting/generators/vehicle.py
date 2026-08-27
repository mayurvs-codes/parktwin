"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Vehicle Report generator.

The vehicle inventory plus type/colour distributions. Consumes the Integration
Layer (vehicles) and the Analytics Engine (traffic vehicle counts). No Module
1/2 access.
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

from .base import BaseGenerator, section
from ..types import VEHICLE
from ..utils import to_number


class VehicleGenerator(BaseGenerator):
    report_type = VEHICLE

    async def build_sections(self, fetcher, params: Dict[str, Any]) -> List[Any]:
        limit = int(params.get("limit", 200))
        vehicles = await fetcher.vehicles(limit=limit)
        traffic = await fetcher.analytics_traffic()

        type_counts: Counter = Counter()
        color_counts: Counter = Counter()
        for v in vehicles:
            t = (v.get("vehicle_type") or "Unknown")
            type_counts[t] += 1
            c = (v.get("color") or "Unknown")
            color_counts[c] += 1

        vc = traffic.get("vehicle_counts", {}) or {}
        metrics = [
            ("Total Vehicles Recorded", int(vc.get("total", 0))),
            ("Distinct Vehicles", int(vc.get("distinct", 0))),
            ("Active Vehicles", int(vc.get("active", 0))),
            ("Vehicles in Inventory", len(vehicles)),
            ("Vehicle Types", len(type_counts)),
        ]

        vehicle_rows = [
            {
                "id": v.get("id"),
                "license_plate": v.get("license_plate") or "(none)",
                "vehicle_type": v.get("vehicle_type"),
                "color": v.get("color"),
                "tracking_id": v.get("tracking_id"),
                "plate_confidence": round(to_number(v.get("plate_confidence")), 2),
                "is_registered": bool(v.get("is_registered")),
                "last_seen": v.get("last_seen"),
            }
            for v in vehicles
        ]

        type_rows = [
            {"vehicle_type": k, "count": v}
            for k, v in type_counts.most_common()
        ]
        color_rows = [
            {"color": k, "count": v}
            for k, v in color_counts.most_common()
        ]

        return [
            section("metrics", "Vehicle Metrics", metrics),
            section("table", "Vehicles", vehicle_rows),
            section("table", "Vehicle Type Distribution", type_rows),
            section("table", "Colour Distribution", color_rows),
        ]


__all__ = ["VehicleGenerator"]
