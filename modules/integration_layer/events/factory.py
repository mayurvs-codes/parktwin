"""
ParkTwin AI — Event Bus Factory
=================================
Process-wide singleton accessor for the configured :class:`EventBus`.

Selection logic (env-driven, no code change required to swap backends):
  - ``INTEGRATION_EVENT_BUS=memory`` (default) -> :class:`InMemoryEventBus`
  - ``INTEGRATION_EVENT_BUS=redis``            -> :class:`RedisEventBus`
"""

from __future__ import annotations

import os
from typing import Optional

from shared.helpers.registry import make_singleton
from .bus import EventBus
from .memory_bus import InMemoryEventBus


def _create_event_bus() -> EventBus:
    kind = os.getenv("INTEGRATION_EVENT_BUS", "memory").lower()
    if kind == "redis":
        from .redis_bus import RedisEventBus

        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return RedisEventBus(url=url)
    else:
        return InMemoryEventBus()


_, get_event_bus, reset_event_bus = make_singleton(_create_event_bus)
