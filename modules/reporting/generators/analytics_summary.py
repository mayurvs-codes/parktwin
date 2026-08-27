"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Analytics Summary generator.

The full combined analytics dashboard: occupancy, traffic, utilization, and
trends. Consumes the Analytics Engine (Module 4) only — which itself consumes
the Integration Layer. No Module 1/2 access.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseGenerator, section
from ..types import ANALYTICS_SUMMARY
from ..utils import to_number


class AnalyticsSummaryGenerator(BaseGenerator):
    report_type = ANALYTICS_SUMMARY

    async def build_sections(self, fetcher, params: Dict[str, Any]) -> List[Any]:
        dashboard = await fetcher.analytics_dashboard()
        occ = dashboard.get("occupancy", {}) or {}
        traffic = dashboard.get("traffic", {}) or {}
        util = dashboard.get("utilization", {}) or {}
        trends = dashboard.get("trends", {}) or {}

        metrics = [
            ("Occupancy Rate (%)", occ.get("occupancy_percentage", 0.0)),
            ("Current Occupancy", occ.get("current_occupancy", 0)),
            ("Vehicle Entries", traffic.get("vehicle_entries", 0)),
            ("Vehicle Exits", traffic.get("vehicle_exits", 0)),
            ("Active Vehicles", traffic.get("active_vehicles", 0)),
            ("Slot Utilization (%)", util.get("slot_utilization_percentage", 0.0)),
            ("Turnover Rate", util.get("turnover_rate", 0.0)),
            ("Average Duration", util.get("average_parking_duration", "00:00:00")),
        ]

        occ_rows = [
            {"metric": k, "value": v}
            for k, v in occ.items()
            if not isinstance(v, (dict, list))
        ]
        traffic_rows = [
            {"metric": k, "value": v}
            for k, v in traffic.items()
            if not isinstance(v, (dict, list))
        ]
        util_rows = [
            {"metric": k, "value": v}
            for k, v in util.items()
            if not isinstance(v, (dict, list))
        ]

        most_used = util.get("most_used_slots", []) or []
        most_rows = [
            {"slot_id": m.get("slot_id"), "usage_count": m.get("usage_count")}
            for m in most_used
        ]

        session_stats = trends.get("session_statistics", {}) or {}
        dur_stats = trends.get("duration_statistics", {}) or {}
        stats_rows = [
            {"metric": k, "value": v}
            for k, v in {**session_stats, **dur_stats}.items()
            if not isinstance(v, (dict, list))
        ]

        return [
            section("metrics", "Key Metrics", metrics),
            section("table", "Occupancy Analytics", occ_rows),
            section("table", "Traffic Analytics", traffic_rows),
            section("table", "Utilization Analytics", util_rows),
            section("table", "Most Used Slots", most_rows),
            section("table", "Session & Duration Statistics", stats_rows),
        ]


__all__ = ["AnalyticsSummaryGenerator"]
