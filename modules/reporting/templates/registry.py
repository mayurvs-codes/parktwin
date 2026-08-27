"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Template registry.

Maps each ``report_type`` to a template function that turns a generator's
:class:`ReportData` into a presentation-ready :class:`ReportView`. This is the
**single** place that owns report layout: panel titles, column headers, and
column ordering. Changing how a report *looks* is a template edit only.

Adding a new report type = implement a generator + add a template function and
register it. No exporter, storage, or API change is required.
"""

from __future__ import annotations

from typing import Callable, Dict

from ..models import Panel, ReportData, ReportSection, ReportView
from .base import build_panel


def _section(data: ReportData, title: str) -> ReportSection:
    for s in data.sections:
        if s.title == title:
            return s
    # Fallback: return an empty placeholder so layout never crashes.
    return ReportSection(kind="text", title=title, data=None)


# ── Header maps (layout concerns) ──────────────────────────────────────────────

_HEADERS = {
    "camera_id": "Camera",
    "total": "Total",
    "occupied": "Occupied",
    "free": "Free",
    "reserved": "Reserved",
    "slot_id": "Slot",
    "zone": "Zone",
    "state": "State",
    "is_reserved": "Reserved?",
    "session_uid": "Session",
    "license_plate": "Plate",
    "tracking_id": "Track ID",
    "vehicle_type": "Type",
    "color": "Colour",
    "plate_confidence": "Plate Conf %",
    "is_registered": "Registered?",
    "last_seen": "Last Seen",
    "entry_time": "Entry",
    "exit_time": "Exit",
    "duration_seconds": "Duration (s)",
    "is_active": "Active?",
    "violation_flags": "Violations",
    "camera_id_camera": "Camera",
    "current_occupancy": "Occupancy",
    "occupancy_percentage": "Occ %",
    "free_slots": "Free",
    "timestamp": "Timestamp",
    "source": "Source",
    "flags": "Flags",
    "violation_type": "Violation",
    "count": "Count",
    "usage_count": "Uses",
    "metric": "Metric",
    "value": "Value",
}


def _panel(data: ReportData, src_title: str, out_title: str, columns=None, extra_headers=None):
    headers = dict(_HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    return build_panel(
        _section(data, src_title),
        title=out_title,
        headers=headers,
        columns=columns,
    )


# ── Per-type templates ─────────────────────────────────────────────────────────

def template_parking_summary(data: ReportData) -> ReportView:
    panels = [
        _panel(data, "Facility Overview", "Facility Overview"),
        _panel(data, "Occupancy by Camera", "Occupancy by Camera",
               columns=["camera_id", "total", "occupied", "free", "reserved"]),
        _panel(data, "Recent Sessions", "Recent Sessions",
               columns=["session_uid", "license_plate", "slot_id", "camera_id",
                        "entry_time", "exit_time", "duration_seconds", "is_active"]),
    ]
    return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)


def template_occupancy(data: ReportData) -> ReportView:
    panels = [
        _panel(data, "Current Occupancy", "Current Occupancy"),
        _panel(data, "Slot Inventory", "Slot Inventory",
               columns=["slot_id", "camera_id", "zone", "state", "is_reserved"]),
        _panel(data, "Per-Camera Occupancy", "Per-Camera Occupancy",
               columns=["camera_id", "total", "occupied", "free", "reserved"]),
        _panel(data, "Occupancy Timeline (recent)", "Occupancy Timeline (recent)",
               columns=["timestamp", "current_occupancy", "occupancy_percentage", "free_slots"]),
    ]
    return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)


def template_vehicle(data: ReportData) -> ReportView:
    panels = [
        _panel(data, "Vehicle Metrics", "Vehicle Metrics"),
        _panel(data, "Vehicles", "Vehicles",
               columns=["id", "license_plate", "vehicle_type", "color",
                        "tracking_id", "plate_confidence", "is_registered", "last_seen"]),
        _panel(data, "Vehicle Type Distribution", "Vehicle Type Distribution",
               columns=["vehicle_type", "count"], extra_headers={"vehicle_type": "Type"}),
        _panel(data, "Colour Distribution", "Colour Distribution",
               columns=["color", "count"], extra_headers={"color": "Colour"}),
    ]
    return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)


def template_parking_session(data: ReportData) -> ReportView:
    panels = [
        _panel(data, "Session Metrics", "Session Metrics"),
        _panel(data, "Sessions", "Sessions",
               columns=["session_uid", "license_plate", "slot_id", "camera_id",
                        "entry_time", "exit_time", "duration_seconds", "is_active",
                        "violation_flags"]),
        _panel(data, "Session Statistics", "Session Statistics",
               columns=["metric", "value"]),
    ]
    return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)


def template_violation(data: ReportData) -> ReportView:
    panels = [
        _panel(data, "Violation Metrics", "Violation Metrics"),
        _panel(data, "Violations", "Violations",
               columns=["source", "session_uid", "license_plate", "slot_id",
                        "camera_id", "flags", "entry_time"]),
        _panel(data, "Violations By Type", "Violations By Type",
               columns=["violation_type", "count"],
               extra_headers={"violation_type": "Violation"}),
    ]
    return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)


def template_analytics_summary(data: ReportData) -> ReportView:
    panels = [
        _panel(data, "Key Metrics", "Key Metrics"),
        _panel(data, "Occupancy Analytics", "Occupancy Analytics", columns=["metric", "value"]),
        _panel(data, "Traffic Analytics", "Traffic Analytics", columns=["metric", "value"]),
        _panel(data, "Utilization Analytics", "Utilization Analytics", columns=["metric", "value"]),
        _panel(data, "Most Used Slots", "Most Used Slots",
               columns=["slot_id", "usage_count"], extra_headers={"usage_count": "Uses"}),
        _panel(data, "Session & Duration Statistics", "Session & Duration Statistics",
               columns=["metric", "value"]),
    ]
    return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)


_TEMPLATES: Dict[str, Callable[[ReportData], ReportView]] = {
    "parking_summary": template_parking_summary,
    "occupancy": template_occupancy,
    "vehicle": template_vehicle,
    "parking_session": template_parking_session,
    "violation": template_violation,
    "analytics_summary": template_analytics_summary,
}


def apply_template(report_type: str, data: ReportData) -> ReportView:
    """Render a :class:`ReportData` into a presentation :class:`ReportView`."""
    fn = _TEMPLATES.get(report_type)
    if fn is None:
        # Generic fallback: every section becomes a panel verbatim.
        panels = [build_panel(s) for s in data.sections]
        return ReportView(data.report_type, data.title, data.generated_at, panels, data.meta)
    return fn(data)


def register_template(report_type: str, fn: Callable[[ReportData], ReportView]) -> None:
    """Register a template for a (new) report type."""
    _TEMPLATES[report_type] = fn


__all__ = ["apply_template", "register_template"]
