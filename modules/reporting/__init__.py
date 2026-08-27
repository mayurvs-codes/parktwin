"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
The Reporting Engine is a **pure consumer** of the Analytics Engine (Module 4)
and the Integration Layer (Module 3). It never reads Module 1 (Vehicle
Recognition) or Module 2 (Parking Intelligence) internals directly — every byte
of report data flows through those two layers.

Responsibilities
---------------
  - generators/   : turn Integration/Analytics data into a ``ReportData`` (what)
  - templates/    : turn ``ReportData`` into a ``ReportView`` layout (how)
  - exporters/    : turn a ``ReportView`` into JSON / CSV / PDF bytes
  - storage/      : persist generated reports (id, type, time, path, status)
  - services/     : ReportingService orchestrator + registry
  - api/          : REST transport (``/reports/*``)

Adding a report type or export format requires no changes outside this package.
"""

from __future__ import annotations

from .services import (
    ReportingService,
    get_reporting_service,
    make_reporting_service,
    reset_reporting_service,
)
from .api.router import router  # noqa: E402,F401


__all__ = [
    "ReportingService",
    "get_reporting_service",
    "make_reporting_service",
    "reset_reporting_service",
    "router",
]
