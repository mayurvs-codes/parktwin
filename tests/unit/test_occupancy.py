"""
Unit tests — Occupancy Manager (Module 2).

Verifies the four supported slot states resolve correctly from a slot's
reservation flag and its current vehicle assignment.
"""

from modules.parking_intelligence.slot_detection.slot_config import SlotConfig
from modules.parking_intelligence.occupancy.occupancy_manager import (
    compute_state,
    compute_states,
    classify_unknown,
)
from modules.parking_intelligence.storage.models import SlotState


def _slot(sid, reserved=False, position=None):
    return SlotConfig(slot_id=sid, camera_id="cam", is_reserved=reserved, position=position)


def test_reserved_state():
    assert compute_state(_slot("P01", reserved=True), None) == SlotState.RESERVED


def test_occupied_state():
    assert compute_state(_slot("P01"), 7) == SlotState.OCCUPIED


def test_free_state():
    assert compute_state(_slot("P01"), None) == SlotState.FREE


def test_compute_states_aggregates():
    slots = [_slot("P01"), _slot("P02", reserved=True), _slot("P03")]
    assignments = {7: "P01"}  # P01 occupied
    states = compute_states(slots, assignments)
    assert states["P01"] == SlotState.OCCUPIED
    assert states["P02"] == SlotState.RESERVED
    assert states["P03"] == SlotState.FREE


def test_classify_unknown_fills_gaps():
    known = {"P01": SlotState.FREE}
    out = classify_unknown(["P01", "P02"], known)
    assert out["P01"] == SlotState.FREE
    assert out["P02"] == SlotState.UNKNOWN
