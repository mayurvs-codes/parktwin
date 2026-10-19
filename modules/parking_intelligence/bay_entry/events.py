"""
ParkTwin AI — Bay Entry Detection Events & State Model
========================================================
Defines typed lifecycle events and states for vehicle bay interaction.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional


class BayEntryState(str, Enum):
    OUTSIDE = "OUTSIDE"
    APPROACHING = "APPROACHING"
    ENTERING = "ENTERING"
    INSIDE = "INSIDE"
    LEAVING = "LEAVING"
    UNKNOWN = "UNKNOWN"


BAY_ENTRY_CONFIRMED = "BAY_ENTRY_CONFIRMED"
BAY_OCCUPIED = "BAY_OCCUPIED"
BAY_EXIT_CONFIRMED = "BAY_EXIT_CONFIRMED"


@dataclass
class BayEntryEvent:
    """Typed event emitted on vehicle entry / occupancy / exit transitions."""

    track_id: int
    bay_id: str
    episode_n: int
    event_type: str
    source: str = "live"  # live | replay | demo
    overlap_ratio: float = 0.0
    speed_mps: float = 0.0
    camera_id: Optional[str] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: str = field(init=False)

    def __post_init__(self) -> None:
        self.event_id = f"{self.track_id}:{self.bay_id}:{self.episode_n}"
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "track_id": self.track_id,
            "bay_id": self.bay_id,
            "episode_n": self.episode_n,
            "source": self.source,
            "overlap_ratio": round(self.overlap_ratio, 3),
            "speed_mps": round(self.speed_mps, 2),
            "camera_id": self.camera_id,
            "timestamp": self.timestamp.isoformat(),
        }
