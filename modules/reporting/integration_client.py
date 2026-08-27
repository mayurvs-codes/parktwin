"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Integration client — the **only** place Reporting imports from other modules.

It exposes the public service accessors of the two layers Reporting is allowed
to consume:

  * the Analytics Engine (Module 4)   -> :func:`get_analytics_service`
  * the Integration Layer (Module 3)   -> :func:`get_integration_service`

Keeping this behind a single module makes the one-directional dependency
explicit: Reporting consumes Modules 3 & 4 and never reaches into Module 1 /
Module 2 internals.
"""

from __future__ import annotations

from modules.analytics.services.registry import (
    get_analytics_service,
)
from modules.integration_layer.services.registry import (
    get_integration_service,
    get_integration_service_dep,
)

__all__ = [
    "get_analytics_service",
    "get_integration_service",
    "get_integration_service_dep",
]
