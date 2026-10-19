"""
Unit tests — Bay Entry Detection Engine (Phase 2).
===================================================
Tests synthetic track interactions against configured parking bays:
  - drive-past along aisle adjacent to bay -> NO event
  - straight entry -> exactly one BAY_ENTRY_CONFIRMED
  - jittery bounding box around threshold -> no flapping (hysteresis)
  - track dropout mid-entry -> no false event; no duplicate on reacquire
  - uncalibrated camera -> no events, status unconfigured
  - two vehicles, adjacent bays -> independent episodes
"""

import pytest
from shapely.geometry import box

from modules.parking_intelligence.bay_entry.config import BayEntryConfig
from modules.parking_intelligence.bay_entry.detector import BayEntryDetector
from modules.parking_intelligence.bay_entry.events import (
    BAY_ENTRY_CONFIRMED,
    BAY_EXIT_CONFIRMED,
    BAY_OCCUPIED,
    BayEntryState,
)


@pytest.fixture
def detector():
    """Create a test detector with known bay SP-07 at (4.8, -6.2)."""
    cfg = BayEntryConfig(
        entry_overlap_min=0.35,
        entry_confirm_ms=800.0,
        entry_max_speed=5.0,
        leave_overlap_max=0.15,
        leave_confirm_ms=800.0,
        track_loss_timeout_ms=2000.0,
        vehicle_footprint_width_m=2.0,
        vehicle_footprint_length_m=4.5,
    )
    det = BayEntryDetector(config=cfg)
    # Register calibrated test camera CAM-01 and CAM-02
    det.register_camera("CAM-01", status="calibrated", homography=None)
    det.register_camera("CAM-02", status="calibrated", homography=None)
    det.register_camera("CAM-04", status="unconfigured", homography=None)

    # Ensure SP-07 and SP-08 are registered
    # SP-07: center (4.8, -6.2), width 2.8, length 5.4
    # SP-08: center (8.0, -6.2), width 2.8, length 5.4
    det.register_bay("SP-07", box(4.8 - 1.4, -6.2 - 2.7, 4.8 + 1.4, -6.2 + 2.7))
    det.register_bay("SP-08", box(8.0 - 1.4, -6.2 - 2.7, 8.0 + 1.4, -6.2 + 2.7))
    return det


def test_drive_past_along_aisle_produces_no_event(detector):
    """
    Vehicle drives along the aisle in front of SP-07 (from x=0 to x=10 at y=-2.0).
    Even if edge of footprint momentarily grazes bay boundary, orientation is perpendicular
    and overlap never qualifies sustained entry -> NO BAY_ENTRY_CONFIRMED.
    """
    events = []
    # Drive across aisle at y=-2.0 (aisle is at y=-2.0, bay is at y=-6.2)
    # Moving along X axis: (vx != 0, vy = 0), not oriented towards bay (dy = -4.2)
    for step in range(15):
        t = 100.0 + step * 0.1  # 100ms per frame
        x = 1.0 + step * 0.7   # moving right at 7 m/s (aisle speed > entry_max_speed)
        y = -2.0
        frame_events = detector.update(
            [{"track_id": 101, "camera_id": "CAM-02", "floor_coords": (x, y)}],
            ts=t,
            source="test",
        )
        events.extend(frame_events)

    entry_events = [e for e in events if e.event_type == BAY_ENTRY_CONFIRMED]
    assert len(entry_events) == 0
    assert detector.get_track_bay_state(101, "SP-07") == BayEntryState.OUTSIDE


def test_straight_entry_produces_single_confirmed_event(detector):
    """
    Vehicle slows down and drives directly into SP-07:
    Moves from y=-2.0 towards y=-6.2 at 1.0 m/s.
    Produces exactly ONE BAY_ENTRY_CONFIRMED event with idempotent event_id.
    """
    events = []
    # Approach and enter SP-07 center (4.8, -6.2)
    for step in range(25):
        t = 200.0 + step * 0.1
        # Interpolate from (4.8, -2.5) to (4.8, -6.2)
        progress = min(1.0, step / 15.0)
        y = -2.5 + progress * (-6.2 - (-2.5))
        frame_events = detector.update(
            [{"track_id": 202, "camera_id": "CAM-02", "floor_coords": (4.8, y)}],
            ts=t,
            source="test",
        )
        events.extend(frame_events)

    entry_events = [e for e in events if e.event_type == BAY_ENTRY_CONFIRMED]
    assert len(entry_events) == 1
    assert entry_events[0].bay_id == "SP-07"
    assert entry_events[0].track_id == 202
    assert entry_events[0].event_id == "202:SP-07:1"
    assert entry_events[0].source == "test"


def test_jittery_bbox_around_threshold_does_not_flap(detector):
    """
    Vehicle hovers around the entry overlap threshold (e.g. 0.34 to 0.36)
    with jitter. Sustained duration check prevents flapping/multiple entries.
    """
    events = []
    # Bay SP-07 is at y in [-8.9, -3.5].
    # Footprint is length 4.5. When footprint center is at y=-2.0, bottom touches bay boundary.
    # We jitter around the edge where overlap alternates between 0.20 and 0.36 every frame.
    for step in range(20):
        t = 300.0 + step * 0.1
        jitter_y = -2.6 if (step % 2 == 0) else -2.3
        frame_events = detector.update(
            [{"track_id": 303, "camera_id": "CAM-02", "floor_coords": (4.8, jitter_y)}],
            ts=t,
            source="test",
        )
        events.extend(frame_events)

    # Flapping would produce multiple entries or transitions; sustained threshold check prevents it
    entry_events = [e for e in events if e.event_type == BAY_ENTRY_CONFIRMED]
    assert len(entry_events) <= 1


def test_track_dropout_mid_entry_no_false_event_or_duplicate(detector):
    """
    Track appears, enters bay, drops out for 3 seconds (> timeout), then reappears.
    Dropout sets state to UNKNOWN; reacquiring doesn't produce an erroneous second entry.
    """
    # 1. Enter bay and confirm
    for step in range(15):
        t = 400.0 + step * 0.1
        detector.update(
            [{"track_id": 404, "camera_id": "CAM-02", "floor_coords": (4.8, -6.0)}],
            ts=t,
            source="test",
        )

    assert detector.get_track_bay_state(404, "SP-07") in (BayEntryState.ENTERING, BayEntryState.INSIDE)

    # 2. Dropout for 3.0 seconds (timeout is 2.0s)
    detector.update([], ts=404.5, source="test")
    assert detector.get_track_bay_state(404, "SP-07") == BayEntryState.UNKNOWN

    # 3. Track reappears in the bay
    reacquire_events = detector.update(
        [{"track_id": 404, "camera_id": "CAM-02", "floor_coords": (4.8, -6.0)}],
        ts=405.0,
        source="test",
    )
    # Should not re-emit an entry event for the same episode
    entry_re_events = [e for e in reacquire_events if e.event_type == BAY_ENTRY_CONFIRMED]
    assert len(entry_re_events) == 0


def test_uncalibrated_camera_emits_no_events_status_unconfigured(detector):
    """
    If a camera is unconfigured (status: unconfigured), detections from it
    never emit entry events, preventing hallucinated vehicle coordinates.
    """
    events = []
    # CAM-04 is unconfigured; pass image bbox without pre-calculated floor coords
    for step in range(15):
        t = 500.0 + step * 0.1
        frame_events = detector.update(
            [{"track_id": 505, "camera_id": "CAM-04", "bbox": [500, 400, 600, 600]}],
            ts=t,
            source="test",
        )
        events.extend(frame_events)

    assert detector.get_camera_status("CAM-04") == "unconfigured"
    assert len(events) == 0


def test_two_vehicles_adjacent_bays_independent_episodes(detector):
    """
    Vehicle 601 enters SP-07 and Vehicle 602 enters SP-08 concurrently.
    Both must emit independent BAY_ENTRY_CONFIRMED events.
    """
    all_events = []
    for step in range(15):
        t = 600.0 + step * 0.1
        frame_events = detector.update(
            [
                {"track_id": 601, "camera_id": "CAM-02", "floor_coords": (4.8, -6.2)},
                {"track_id": 602, "camera_id": "CAM-02", "floor_coords": (8.0, -6.2)},
            ],
            ts=t,
            source="test",
        )
        all_events.extend(frame_events)

    entry_events = [e for e in all_events if e.event_type == BAY_ENTRY_CONFIRMED]
    assert len(entry_events) == 2
    bay_map = {e.track_id: e.bay_id for e in entry_events}
    assert bay_map[601] == "SP-07"
    assert bay_map[602] == "SP-08"
    assert entry_events[0].event_id != entry_events[1].event_id
