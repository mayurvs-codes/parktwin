"""
ParkTwin AI — Violation Engine
================================
Flags parking-policy breaches on active / closed sessions.

Flags
-----
  overstay            : vehicle stayed longer than ``max_duration_hours``
  reserved_occupied  : a non-matching vehicle occupies a reserved slot
  unauthorized_parking: vehicle in a slot with no readable plate / not registered

The engine is a pure function of its keyword inputs and is fully testable.
It never persists — the orchestrating engine records the flags onto the session.
"""

from __future__ import annotations

from typing import List, Optional


class ViolationEngine:
    """Evaluates parking-policy violations for a session/slot pairing."""

    FLAG_OVERSTAY = "overstay"
    FLAG_RESERVED = "reserved_occupied"
    FLAG_UNAUTHORIZED = "unauthorized_parking"

    def __init__(self, max_duration_hours: float = 24.0) -> None:
        self._max_seconds = max(0.0, float(max_duration_hours)) * 3600.0

    def evaluate(
        self,
        *,
        duration_seconds: float,
        is_reserved_slot: bool = False,
        reserved_for: Optional[str] = None,
        license_plate: Optional[str] = None,
        is_registered: bool = False,
    ) -> List[str]:
        """Return the list of violation flags applicable to this observation."""
        flags: List[str] = []

        if duration_seconds > self._max_seconds > 0:
            flags.append(self.FLAG_OVERSTAY)

        if is_reserved_slot and reserved_for:
            # Occupied by someone other than the reservation holder.
            if not license_plate or license_plate != reserved_for:
                flags.append(self.FLAG_RESERVED)

        if not license_plate or not is_registered:
            # No readable plate (or unknown vehicle) in a slot.
            flags.append(self.FLAG_UNAUTHORIZED)

        return flags

    @staticmethod
    def merge(existing: Optional[list], new: List[str]) -> List[str]:
        """Union two flag lists deterministically (sorted, de-duplicated)."""
        combined = list(existing or []) + list(new)
        return sorted(set(combined))
