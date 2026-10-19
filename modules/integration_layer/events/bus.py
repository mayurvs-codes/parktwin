"""
ParkTwin AI — Integration Event Bus (core)
==========================================
Defines the canonical integration event model and the pluggable
:class:`EventBus` interface.

The bus is intentionally **interface-based**: the default implementation is an
in-memory ring buffer (:class:`InMemoryEventBus`), but a Redis-backed
implementation (:class:`RedisEventBus`) can be dropped in via
:func:`factory.get_event_bus` without any change to the consumers.

Event types are the lifecycle events required by the integration spec:

    VehicleDetected  - a vehicle was recognised
    VehicleTracked   - a vehicle track was continued / updated
    VehicleParked    - a vehicle settled into a slot (session started)
    VehicleExited    - a vehicle departed and its slot was released
    SessionStarted   - a parking session opened
    SessionEnded     - a parking session closed
    SlotOccupied     - a slot transitioned to OCCUPIED
    SlotReleased     - a slot transitioned back to FREE
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# ─── Canonical integration event types ──────────────────────────────────────────

INTEGRATION_EVENT_TYPES = (
    "VehicleDetected",
    "VehicleTracked",
    "VehicleParked",
    "VehicleExited",
    "SessionStarted",
    "SessionEnded",
    "SlotOccupied",
    "SlotReleased",
    "SlotStateChanged",
    "VoiceAnnouncement",
    "VoiceCancel",
    "WrongBayWarning",
    "WrongBayResolved",
)

# Channels used by the WebSocket layer (one per live view).
WS_CHANNELS = ("vehicles", "occupancy", "sessions", "events", "slots")


def _json_safe(value: Any) -> Any:
    """Recursively convert datetimes / non-JSON types to JSON-safe primitives."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


@dataclass
class IntegrationEvent:
    """A single, serializable integration-layer event."""

    event_type: str
    camera_id: Optional[str] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    event_id: str = field(default_factory=lambda: f"IE-{uuid.uuid4().hex[:12]}")
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serializable representation."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "camera_id": self.camera_id,
            "payload": _json_safe(self.payload),
        }


class EventBus(ABC):
    """Abstract publish/subscribe event bus.

    Implementations must be safe to use as a process-wide singleton. The
    default :class:`InMemoryEventBus` is synchronous-friendly but exposes an
    async surface so a Redis implementation (and the rest of the async app)
    can use the same interface.
    """

    @abstractmethod
    async def publish(self, event: IntegrationEvent) -> None:
        """Publish an event to all subscribers / the buffer."""
        raise NotImplementedError

    @abstractmethod
    def get_recent(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return the most-recent events (optionally filtered) as dicts."""
        raise NotImplementedError

    @abstractmethod
    def all_types(self) -> Dict[str, int]:
        """Return a count of buffered events keyed by type."""
        raise NotImplementedError

    @abstractmethod
    def count(self, event_type: Optional[str] = None) -> int:
        """Total buffered events (optionally of a single type)."""
        raise NotImplementedError

    @abstractmethod
    async def clear(self) -> None:
        """Drop all buffered events."""
        raise NotImplementedError

    # ── Convenience helpers (non-abstract, shared by implementations) ────────

    def _is_valid_type(self, event_type: str) -> bool:
        return event_type in INTEGRATION_EVENT_TYPES
