"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Consumes the **Integration Layer** (Module 3) exclusively and turns its
outputs into parking analytics. It never reads Module 1 / Module 2 internals
directly.

Responsibilities
---------------
  - occupancy/    : current occupancy, percentage, free/reserved slots, avg occupancy
  - traffic/      : entries/exits, peak hours, hourly/daily traffic, vehicle counts
  - utilization/  : slot utilization, avg duration, most/least used slots, turnover
  - trends/       : occupancy/traffic timelines + session & duration statistics
  - storage/      : self-contained snapshot store for trend history
  - services/     : AnalyticsService orchestrator + registry
  - api/          : REST transport (``/analytics/*``)
  - metrics/      : shared pure helpers

Data flows one direction: Module 1 + Module 2 → Integration Layer → Analytics.
"""

from __future__ import annotations

from .services import (
    AnalyticsService,
    get_analytics_service,
    make_analytics_service,
    reset_analytics_service,
)
from .storage import AnalyticsStore

__all__ = [
    "AnalyticsService",
    "AnalyticsStore",
    "get_analytics_service",
    "make_analytics_service",
    "reset_analytics_service",
]
