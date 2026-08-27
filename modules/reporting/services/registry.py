"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Reporting Service registry.

Process-wide singleton accessor. The service is wired to the Analytics Engine
(Module 4) and the Integration Layer (Module 3) — the **only** data sources it
uses. ``make_reporting_service`` is exported so tests can build a fresh service
(custom store / analytics / integration) and install it via
``reset_reporting_service``.
"""

from __future__ import annotations

from typing import Optional

from shared.helpers.registry import make_singleton
from ..storage import ReportStore
from .reporting_service import ReportingService


def make_reporting_service(
    analytics=None,
    integration=None,
    store: Optional[ReportStore] = None,
    output_dir: Optional[str] = None,
) -> ReportingService:
    """Construct a ReportingService backed by Analytics + Integration."""
    if analytics is None:
        from ..integration_client import get_analytics_service

        analytics = get_analytics_service()  # Module 4 (Analytics Engine)
    if integration is None:
        from ..integration_client import get_integration_service

        integration = get_integration_service()  # Module 3 (Integration Layer)
    return ReportingService(
        analytics=analytics,
        integration=integration,
        store=store or ReportStore(),
        output_dir=output_dir,
    )


_, get_reporting_service, reset_reporting_service = make_singleton(make_reporting_service)


__all__ = [
    "make_reporting_service",
    "get_reporting_service",
    "reset_reporting_service",
]
