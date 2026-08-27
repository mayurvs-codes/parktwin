"""
ParkTwin AI — In-Memory Event Bus
===================================
Default :class:`EventBus` implementation. Keeps a bounded ring buffer of
recent integration events and is fully JSON-serializable via
:meth:`IntegrationEvent.to_dict`.

Swap this for :class:`RedisEventBus` (see ``redis_bus.py``) in production
without touching any consumer — both satisfy the same interface.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from shared.helpers.ring_buffer import RingBuffer
from .bus import EventBus, IntegrationEvent


class InMemoryEventBus(EventBus):
    """Bounded in-memory ring buffer of integration events."""

    def __init__(self, max_buffer: int = 5000) -> None:
        self._buffer: RingBuffer[IntegrationEvent] = RingBuffer(max_buffer)
        self._lock = asyncio.Lock()

    async def publish(self, event: IntegrationEvent) -> None:
        async with self._lock:
            self._buffer.append(event)

    def get_recent(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        out = self._buffer.to_list()
        if event_type:
            out = [e for e in out if e.event_type == event_type]
        return [e.to_dict() for e in out[-max(1, int(limit)):]]

    def all_types(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for e in self._buffer:
            counts[e.event_type] = counts.get(e.event_type, 0) + 1
        return counts

    def count(self, event_type: Optional[str] = None) -> int:
        if not event_type:
            return len(self._buffer)
        return sum(1 for e in self._buffer if e.event_type == event_type)

    async def clear(self) -> None:
        async with self._lock:
            self._buffer.clear()
