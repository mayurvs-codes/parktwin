"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Report type and export-format constants.

The Reporting Engine is a **pure consumer** of the Analytics Engine (Module 4)
and the Integration Layer (Module 3). It never reads Module 1 / Module 2
internals directly — every byte of report data flows through those two layers.
"""

from __future__ import annotations

# ─── Report types ──────────────────────────────────────────────────────────────

PARKING_SUMMARY = "parking_summary"
OCCUPANCY = "occupancy"
VEHICLE = "vehicle"
PARKING_SESSION = "parking_session"
VIOLATION = "violation"
ANALYTICS_SUMMARY = "analytics_summary"

REPORT_TYPES = (
    PARKING_SUMMARY,
    OCCUPANCY,
    VEHICLE,
    PARKING_SESSION,
    VIOLATION,
    ANALYTICS_SUMMARY,
)

REPORT_TYPE_TITLES = {
    PARKING_SUMMARY: "Parking Summary",
    OCCUPANCY: "Occupancy Report",
    VEHICLE: "Vehicle Report",
    PARKING_SESSION: "Parking Session Report",
    VIOLATION: "Violation Report",
    ANALYTICS_SUMMARY: "Analytics Summary",
}

# ─── Export formats ────────────────────────────────────────────────────────────

FORMAT_JSON = "json"
FORMAT_CSV = "csv"
FORMAT_PDF = "pdf"

EXPORT_FORMATS = (FORMAT_JSON, FORMAT_CSV, FORMAT_PDF)

FORMAT_MEDIA_TYPES = {
    FORMAT_JSON: "application/json",
    FORMAT_CSV: "text/csv",
    FORMAT_PDF: "application/pdf",
}

FORMAT_FILE_EXT = {
    FORMAT_JSON: "json",
    FORMAT_CSV: "csv",
    FORMAT_PDF: "pdf",
}

# ─── Report status values ──────────────────────────────────────────────────────

STATUS_GENERATED = "generated"
STATUS_REGENERATING = "regenerating"
STATUS_FAILED = "failed"

REPORT_STATUSES = (STATUS_GENERATED, STATUS_REGENERATING, STATUS_FAILED)

__all__ = [
    "PARKING_SUMMARY",
    "OCCUPANCY",
    "VEHICLE",
    "PARKING_SESSION",
    "VIOLATION",
    "ANALYTICS_SUMMARY",
    "REPORT_TYPES",
    "REPORT_TYPE_TITLES",
    "FORMAT_JSON",
    "FORMAT_CSV",
    "FORMAT_PDF",
    "EXPORT_FORMATS",
    "FORMAT_MEDIA_TYPES",
    "FORMAT_FILE_EXT",
    "STATUS_GENERATED",
    "STATUS_REGENERATING",
    "STATUS_FAILED",
    "REPORT_STATUSES",
]
