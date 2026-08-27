"""
Unit tests — Stable Slot Mapper (Module 2).

Verifies the core stability guarantees:
  - A vehicle keeps the same slot across frames (no flapping).
  - A slot is released only after ``release_after`` consecutive misses.
  - A plate re-appearing on a *new* track id is flagged re-identified.
  - Geometric nearest-slot assignment is honored when positions exist.
"""

from modules.parking_intelligence.slot_detection.slot_config import SlotConfig
from modules.parking_intelligence.mapping.slot_mapper import (
    SlotAssignment,
    SlotMapper,
    VehicleTrack,
)


def _track(tid, bbox, plate=None):
    return VehicleTrack(track_id=tid, bbox=list(bbox), license_plate=plate)


def _slot(sid, center=None, reserved=False, reserved_for=None):
    return SlotConfig(
        slot_id=sid, camera_id="cam",
        is_reserved=reserved, reserved_for=reserved_for,
        position=list(center) if center else None,
    )


def test_stable_assignment_across_frames():
    m = SlotMapper(release_after=30)
    slots = [_slot("P01"), _slot("P02")]
    r1 = m.update("cam", [_track(1, [0.1, 0.1, 0.3, 0.3])], slots)
    assert r1.newly_assigned[1] == "P01"
    r2 = m.update("cam", [_track(1, [0.12, 0.12, 0.32, 0.32])], slots)
    assert r2.newly_assigned == {}            # unchanged — stable
    assert m.get_assignment("cam", 1) == "P01"


def test_release_after_missing_frames():
    m = SlotMapper(release_after=1)
    slots = [_slot("P01")]
    m.update("cam", [_track(1, [0.1, 0.1, 0.3, 0.3])], slots)
    # One frame without the track -> released.
    r = m.update("cam", [], slots)
    assert r.released == [(1, "P01")]
    assert m.get_assignment("cam", 1) is None


def test_no_release_within_buffer():
    m = SlotMapper(release_after=5)
    slots = [_slot("P01")]
    m.update("cam", [_track(1, [0.1, 0.1, 0.3, 0.3])], slots)
    for _ in range(4):
        r = m.update("cam", [], slots)
        assert r.released == []           # still inside the buffer
    r = m.update("cam", [], slots)      # 5th miss -> release
    assert r.released == [(1, "P01")]


def test_reidentification_by_plate():
    m = SlotMapper(release_after=30)
    slots = [_slot("P01"), _slot("P02")]
    m.update("cam", [_track(1, [0.1, 0.1, 0.3, 0.3], plate="KA01AB1234")], slots)
    # New track, same plate -> re-identified.
    r = m.update("cam", [_track(2, [0.5, 0.5, 0.7, 0.7], plate="KA01AB1234")], slots)
    assert 2 in r.reidentified
    assert r.newly_assigned[2] == "P02"


def test_geometric_nearest_used():
    m = SlotMapper(release_after=30, distance_threshold=0.35)
    slots = [
        _slot("P01", center=[0.1, 0.1, 0.3, 0.3]),
        _slot("P02", center=[0.7, 0.7, 0.9, 0.9]),
    ]
    r = m.update("cam", [_track(1, [0.7, 0.7, 0.9, 0.9])], slots)
    assert r.newly_assigned[1] == "P02"   # nearest by center


def test_reserved_slot_skipped_for_normal_vehicle():
    m = SlotMapper(release_after=30)
    slots = [
        _slot("P01", reserved=True, reserved_for="OWNER1"),
        _slot("P02"),
    ]
    r = m.update("cam", [_track(1, [0.1, 0.1, 0.3, 0.3], plate="KA01AB1234")], slots)
    assert r.newly_assigned[1] == "P02"  # P01 reserved, skipped


def test_slot_assignment_lookup():
    a = SlotAssignment(
        camera_id="cam",
        assignments={1: "P01", 2: "P02"},
        newly_assigned={2: "P02"},
        released=[(3, "P03")],
    )
    assert a.camera_id == "cam"
    assert a.slot_for(1) == "P01"
    assert a.slot_for(2) == "P02"
    assert a.slot_for(99) is None
    assert a.newly_assigned == {2: "P02"}
    assert a.released == [(3, "P03")]
