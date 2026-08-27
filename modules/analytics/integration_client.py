"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Integration Layer client — the **only** place Analytics imports from Module 3.

Keeping this behind a single module makes the dependency explicit and
one-directional: Analytics consumes the Integration Layer's public service
and never reaches into Module 1 / Module 2 internals.
"""

from __future__ import annotations

from modules.integration_layer.services.registry import (
    get_integration_service,
    get_integration_service_dep,
)

__all__ = ["get_integration_service", "get_integration_service_dep"]
