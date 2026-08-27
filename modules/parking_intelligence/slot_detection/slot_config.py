"""
ParkTwin AI — Parking Slot Configuration
=========================================
A lightweight, dependency-free description of a parking slot's static properties.
Slot detection / mapping consume these to resolve a vehicle to its nearest slot.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class SlotConfig:
    """Static configuration of one parking slot for one camera."""

    slot_id: str
    camera_id: str
    zone: str = "general"
    is_reserved: bool = False
    reserved_for: Optional[str] = None
    # Normalized footprint {x1,y1,x2,y2} in [0,1]; None when unknown.
    position: Optional[List[float]] = None
    meta: Dict = field(default_factory=dict)

    @property
    def center(self) -> Optional[List[float]]:
        """Slot center (cx, cy) in normalized coords, or None when no position."""
        if not self.position or len(self.position) != 4:
            return None
        x1, y1, x2, y2 = self.position
        return [(x1 + x2) / 2.0, (y1 + y2) / 2.0]
