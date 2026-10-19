"""
ParkTwin AI — Voice Announcement Models (Phase 4)
===================================================
Defines structured voice messages emitted by the backend for driver audio assistance.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional


class VoiceMessageKind(str, Enum):
    ASSIGNMENT = "ASSIGNMENT"
    ROUTE_STEP = "ROUTE_STEP"
    WRONG_BAY_WARNING = "WRONG_BAY_WARNING"
    ERROR = "ERROR"


@dataclass
class VoiceMessage:
    """Canonical voice message payload dispatched to frontend and driver displays."""

    event_id: str
    kind: str  # ASSIGNMENT | ROUTE_STEP | WRONG_BAY_WARNING | ERROR
    text: str
    priority: int = 50  # 100=WARNING, 80=ERROR, 50=ASSIGNMENT, 20=ROUTE_STEP
    lang: str = "en-US"
    vehicle_id: Optional[str] = None
    source: str = "live"  # live | replay | demo
    message_id: str = field(default_factory=lambda: f"VM-{uuid.uuid4().hex[:10]}")
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "message_id": self.message_id,
            "event_id": self.event_id,
            "kind": self.kind,
            "text": self.text,
            "priority": self.priority,
            "lang": self.lang,
            "vehicle_id": self.vehicle_id,
            "source": self.source,
            "ts": self.ts,
        }
