"""
Unit tests — Violation Engine (Module 2).

Verifies the three supported violation flags:
  - overstay            : duration beyond max_duration_hours
  - reserved_occupied   : a non-matching vehicle in a reserved slot
  - unauthorized_parking: no readable plate / unregistered vehicle
"""

from modules.parking_intelligence.violations.violation_engine import ViolationEngine


def test_overstay_flag():
    v = ViolationEngine(max_duration_hours=1)
    flags = v.evaluate(duration_seconds=2 * 3600, is_reserved_slot=False)
    assert ViolationEngine.FLAG_OVERSTAY in flags


def test_no_overstay_within_limit():
    v = ViolationEngine(max_duration_hours=24)
    flags = v.evaluate(duration_seconds=3600, is_reserved_slot=False)
    assert ViolationEngine.FLAG_OVERSTAY not in flags


def test_reserved_occupied_flag():
    v = ViolationEngine()
    flags = v.evaluate(
        duration_seconds=10, is_reserved_slot=True,
        reserved_for="OWNER1", license_plate="KA01AB1234",
    )
    assert ViolationEngine.FLAG_RESERVED in flags


def test_reserved_owner_ok():
    v = ViolationEngine()
    flags = v.evaluate(
        duration_seconds=10, is_reserved_slot=True,
        reserved_for="KA01AB1234", license_plate="KA01AB1234",
    )
    assert ViolationEngine.FLAG_RESERVED not in flags


def test_unauthorized_when_no_plate():
    v = ViolationEngine()
    flags = v.evaluate(duration_seconds=10, is_reserved_slot=False, license_plate=None)
    assert ViolationEngine.FLAG_UNAUTHORIZED in flags


def test_registered_authorized_no_flag():
    v = ViolationEngine()
    flags = v.evaluate(
        duration_seconds=10, is_reserved_slot=False,
        license_plate="KA01AB1234", is_registered=True,
    )
    assert flags == []


def test_merge_union_sorted():
    merged = ViolationEngine.merge(["overstay"], ["unauthorized_parking", "overstay"])
    assert merged == ["overstay", "unauthorized_parking"]
