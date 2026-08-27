"""
ParkTwin AI — Redis-Backed Event Bus (optional)
==============================================
A drop-in :class:`EventBus` implementation backed by Redis streams/lists.

This module purposefully performs **no Redis import at module load** so the
integration layer can be imported in environments without ``redis`` installed
(e.g. the default test/SQLite run). The dependency is imported lazily inside
:meth:`RedisEventBus.connect`, and the class is only instantiated by
:func:`factory.get_event_bus` when Redis is explicitly selected via the
``INTEGRATION_EVENT_BUS=redis`` environment variable.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .bus import EventBus, IntegrationEvent


class RedisEventBus(EventBus):
    """Redis-backed event bus (pub/sub + bounded list history)."""

    def __init__(self, url: str = "redis://localhost:6379/0", key_prefix: str = "parktwin:events") -> None:
        self._url = url
        self._key_prefix = key_prefix
        self._client = None  # type: ignore[var-annotated]
        self._connected = False

    # ── Connection (lazy, so import never requires redis) ─────────────────────

    async def connect(self) -> None:
        if self._connected:
            return
        try:
            import redis.asyncio as aioredis  # type: ignore
        except ImportError as exc:  # pragma: no cover - depends on env
            raise RuntimeError(
                "RedisEventBus selected but `redis` package is not installed. "
                "Install `redis` or set INTEGRATION_EVENT_BUS=memory."
            ) from exc
        self._client = aioredis.from_url(self._url, decode_responses=True)
        self._connected = True

    @property
    def _list_key(self) -> str:
        return f"{self._key_prefix}:recent"

    # ── EventBus interface ─────────────────────────────────────────────────────

    async def publish(self, event: IntegrationEvent) -> None:
        await self.connect()
        await self._client.rpush(self._list_key, _dumps(event))
        await self._client.ltrim(self._list_key, -5000, -1)  # keep last 5000

    def get_recent(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        raise NotImplementedError(
            "get_recent is async for the Redis backend; use `await get_recent_async`."
        )

    async def get_recent_async(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        await self.connect()
        raw = await self._client.lrange(self._list_key, -max(1, int(limit)), -1)
        events = [_loads(r) for r in raw]
        if event_type:
            events = [e for e in events if e.get("event_type") == event_type]
        return events

    def all_types(self) -> Dict[str, int]:
        raise NotImplementedError(
            "all_types is async for the Redis backend; use `await all_types_async`."
        )

    async def all_types_async(self) -> Dict[str, int]:  # pragma: no cover - needs redis
        await self.connect()
        raw = await self._client.lrange(self._list_key, 0, -1)
        counts: Dict[str, int] = {}
        for r in raw:
            et = _loads(r).get("event_type")
            if et:
                counts[et] = counts.get(et, 0) + 1
        return counts

    def count(self, event_type: Optional[str] = None) -> int:
        raise NotImplementedError(
            "count is async for the Redis backend; use `await count_async`."
        )

    async def count_async(self, event_type: Optional[str] = None) -> int:  # pragma: no cover
        await self.connect()
        raw = await self._client.lrange(self._list_key, 0, -1)
        if not event_type:
            return len(raw)
        return sum(1 for r in raw if _loads(r).get("event_type") == event_type)

    async def clear(self) -> None:
        await self.connect()
        await self._client.delete(self._list_key)


def _dumps(event: IntegrationEvent) -> str:
    import json

    return json.dumps(event.to_dict())


def _loads(raw: str) -> Dict[str, Any]:
    import json

    return json.loads(raw)
