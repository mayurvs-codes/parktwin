"""
ParkTwin AI — Analytics Service Registry
========================================
Process-wide singleton accessor for the :class:`AnalyticsService`.

The Analytics Service is wired to the Integration Layer's
``IntegrationService`` (Module 3) — that is the **only** data source it uses.
A ``make_analytics_service`` factory is exported so tests can build a fresh
service (custom store / integration service) and install it via
``reset_analytics_service``.
"""

from __future__ import annotations

from typing import Optional

from shared.helpers.registry import make_singleton
from ..storage import AnalyticsStore
from .analytics_service import AnalyticsService


def make_analytics_service(integration_svc=None, store: Optional[AnalyticsStore] = None) -> AnalyticsService:
    """Construct an AnalyticsService backed by the Integration Layer."""
    if integration_svc is None:
        from ..integration_client import get_integration_service

        integration_svc = get_integration_service()
    return AnalyticsService(integration_svc=integration_svc, store=store or AnalyticsStore())


_, get_analytics_service, reset_analytics_service = make_singleton(make_analytics_service)


__all__ = [
    "make_analytics_service",
    "get_analytics_service",
    "reset_analytics_service",
]
