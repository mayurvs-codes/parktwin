"""
Unit tests — vehicle adapter live composition (D5 Phase 6).

Verifies that ``record_to_live`` sources slot ownership **exclusively** from
Module 2's SlotAssignment and never falls back to the Module 1 record's own
slot. Tracks without a Module 2 assignment are reported as unoccupied.
"""

from modules.integration_layer.adapters.vehicle_adapter import record_to_live


class _FakeRecord:
    def __init__(self, tracking_id, slot=None):
        self.tracking_id = tracking_id
        self.slot = slot

    def to_api_dict(self):
        return {
            "tracking_id": self.tracking_id,
            "slot": self.slot,
            "occupied": self.slot is not None,
        }


def test_record_to_live_without_assignment_reports_unoccupied():
    # Without a Module 2 assignment, slot ownership is NOT derived from the
    # record's own slot — it is reported as unoccupied (Phase 6).
    recs = [_FakeRecord(1, slot="P09"), _FakeRecord(2, slot=None)]
    out = record_to_live(recs)
    assert out[0]["slot"] is None
    assert out[0]["occupied"] is False
    assert out[1]["slot"] is None
    assert out[1]["occupied"] is False


def test_record_to_live_with_serialized_assignment_owns_slot():
    recs = [_FakeRecord(1, slot="P09"), _FakeRecord(2, slot=None)]
    # Wire format carries string keys (JSON), like summary["assignment"].
    assignment = {
        "camera_id": "cam",
        "assignments": {"1": "P01"},
        "newly_assigned": {},
        "released": [],
    }
    out = record_to_live(recs, assignment)
    # Track 1 owned by Module 2; track 2 has none -> unoccupied.
    assert out[0]["slot"] == "P01"
    assert out[0]["occupied"] is True
    assert out[1]["slot"] is None
    assert out[1]["occupied"] is False


def test_record_to_live_accepts_slot_assignment_object():
    recs = [_FakeRecord(1, slot="P09")]

    class _SlotAssignment:
        assignments = {1: "P01"}

    out = record_to_live(recs, _SlotAssignment())
    assert out[0]["slot"] == "P01"
    assert out[0]["occupied"] is True
