"""
Unit tests — Nearest-Slot Detector (Module 2).

Verifies:
  - Geometric mode picks the nearest slot, within threshold only.
  - Pool mode (no geometry) allocates deterministically by slot_id.
  - Reserved slots are excluded unless the vehicle matches ``reserved_for``.
"""

from modules.parking_intelligence.slot_detection.slot_config import SlotConfig
from modules.parking_intelligence.slot_detection.slot_detector import nearest_free_slot


def _slot(sid, center=None, reserved=False, reserved_for=None):
    return SlotConfig(
        slot_id=sid, camera_id="cam", is_reserved=reserved,
        reserved_for=reserved_for,
        position=list(center) if center else None,
    )


def test_geometric_nearest():
    slots = [
        _slot("P01", center=[0.1, 0.1, 0.3, 0.3]),
        _slot("P02", center=[0.7, 0.7, 0.9, 0.9]),
    ]
    # Vehicle overlapping P01's region.
    best = nearest_free_slot([0.12, 0.12, 0.32, 0.32], slots, set())
    assert best.slot_id == "P01"


def test_geometric_outside_threshold_returns_none():
    slots = [
        _slot("P01", center=[0.1, 0.1, 0.3, 0.3]),
        _slot("P02", center=[0.7, 0.7, 0.9, 0.9]),
    ]
    # Vehicle in the middle, far from both slot centers (> 0.35).
    best = nearest_free_slot([0.45, 0.45, 0.55, 0.55], slots, set(), distance_threshold=0.35)
    assert best is None


def test_pool_mode_deterministic():
    slots = [
        _slot("P03"),
        _slot("P01"),
        _slot("P02"),
    ]
    best = nearest_free_slot([0.5, 0.5, 0.6, 0.6], slots, set())
    assert best.slot_id == "P01"  # lowest by sort order


def test_occupied_slots_excluded():
    slots = [_slot("P01"), _slot("P02")]
    best = nearest_free_slot([0.5, 0.5, 0.6, 0.6], slots, occupied={"P01"})
    assert best.slot_id == "P02"


def test_reserved_excluded_unless_matched():
    slots = [
        _slot("P01", reserved=True, reserved_for="KA01AB1234"),
        _slot("P02"),
    ]
    # Unmatched vehicle cannot take the reserved slot.
    best = nearest_free_slot([0.5, 0.5, 0.6, 0.6], slots, set())
    assert best.slot_id == "P02"
    # The matching vehicle may take it.
    best2 = nearest_free_slot(
        [0.5, 0.5, 0.6, 0.6], slots, set(), reserved_for="KA01AB1234"
    )
    assert best2.slot_id == "P01"


def test_no_free_slot_returns_none():
    slots = [_slot("P01")]
    best = nearest_free_slot([0.5, 0.5, 0.6, 0.6], slots, occupied={"P01"})
    assert best is None
