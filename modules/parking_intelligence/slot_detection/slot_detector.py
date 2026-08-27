"""
ParkTwin AI — Nearest-Slot Detector
=====================================
Resolves a detected vehicle to its nearest physical slot.

Two operating modes, chosen automatically from the available slot geometry:

  * Geometric (positions known): pick the free slot whose center is nearest
    the vehicle center, within ``distance_threshold``.
  * Pool (no geometry): fall back to first-come / first-served free slot
    allocation, keyed by slot_id for deterministic ordering.

Reserved slots are excluded from automatic assignment unless the vehicle matches
``reserved_for`` (by license plate).
"""

from __future__ import annotations

from typing import List, Optional, Tuple

from .slot_config import SlotConfig


def _center(bbox: List[float]) -> Tuple[float, float]:
    """Center (cx, cy) of a normalized {x1,y1,x2,y2} box."""
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def _distance(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def _is_available(slot: SlotConfig, occupied: set, reserved_blocked_for: Optional[str]) -> bool:
    """A slot is assignable when free and (unreserved or matched to this vehicle)."""
    if slot.slot_id in occupied:
        return False
    if slot.is_reserved:
        # Reserved slots only accept their intended vehicle.
        if reserved_blocked_for is None:
            return False
        return bool(slot.reserved_for) and slot.reserved_for == reserved_blocked_for
    return True


def nearest_free_slot(
    vehicle_bbox: List[float],
    slot_configs: List[SlotConfig],
    occupied: set,
    *,
    reserved_for: Optional[str] = None,
    distance_threshold: float = 0.35,
) -> Optional[SlotConfig]:
    """
    Return the best free slot for a vehicle, or None when nothing is free.

    Args:
        vehicle_bbox: normalized {x1,y1,x2,y2} of the vehicle.
        slot_configs: candidate slots for the camera (free + occupied + reserved).
        occupied: slot_ids currently occupied by other vehicles.
        reserved_for: license plate of the vehicle (for reserved-slot matching).
        distance_threshold: max normalized center distance for a geometric match.
    """
    candidates = [s for s in slot_configs if _is_available(s, occupied, reserved_for)]
    if not candidates:
        return None

    v_center = _center(vehicle_bbox)

    # Geometric mode: every candidate has a known position.
    geometric = all(s.center is not None for s in candidates)
    if geometric:
        best: Optional[SlotConfig] = None
        best_dist = float("inf")
        for slot in candidates:
            d = _distance(v_center, slot.center)
            if d < best_dist:
                best_dist = d
                best = slot
        if best is not None and best_dist <= distance_threshold:
            return best
        # Outside threshold: do not force a far-away slot; leave unassigned.
        return None

    # Pool mode: deterministic by slot_id ordering.
    return min(candidates, key=lambda s: s.slot_id)
