"""
Unit tests — Event Engine (Module 2).

Verifies:
  - All six required event types are accepted; unknown types rejected.
  - Events are normalized and buffered (most-recent last, bounded).
  - Type filtering and counting work.
"""

from modules.parking_intelligence.events.event_engine import EventEngine


def test_build_six_required_types():
    e = EventEngine()
    for t in EventEngine.ALL_TYPES:
        ev = e.build(t, "cam", slot_id="P01", tracking_id=1, license_plate="KA01")
        assert ev["event_type"] == t
        assert ev["event_uid"].startswith("PE-")


def test_invalid_type_rejected():
    e = EventEngine()
    import pytest
    with pytest.raises(ValueError):
        e.build("bogus_event", "cam")


def test_record_and_recent():
    e = EventEngine(max_buffer=10)
    e.record(e.build(EventEngine.EVENT_VEHICLE_ENTERED, "cam"))
    e.record(e.build(EventEngine.EVENT_VEHICLE_LEFT, "cam"))
    recent = e.recent(limit=10)
    assert len(recent) == 2
    assert recent[-1]["event_type"] == EventEngine.EVENT_VEHICLE_LEFT


def test_buffer_bounded():
    e = EventEngine(max_buffer=3)
    for i in range(10):
        e.record(e.build(EventEngine.EVENT_SLOT_OCCUPIED, "cam", slot_id=f"P{i}"))
    assert len(e._buffer) == 3


def test_count_and_filter():
    e = EventEngine()
    e.record(e.build(EventEngine.EVENT_VEHICLE_ENTERED, "cam"))
    e.record(e.build(EventEngine.EVENT_VEHICLE_ENTERED, "cam"))
    e.record(e.build(EventEngine.EVENT_VEHICLE_LEFT, "cam"))
    assert e.count(EventEngine.EVENT_VEHICLE_ENTERED) == 2
    assert len(e.recent(limit=10, event_type=EventEngine.EVENT_VEHICLE_LEFT)) == 1
