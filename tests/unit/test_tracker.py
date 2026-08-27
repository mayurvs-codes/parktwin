"""
Unit tests for the ByteTrack-style tracker (Module 1 — Task 2).

Verifies:
  - Stable IDs across realistic frame-to-frame motion.
  - Duplicate prevention (one detection -> at most one track, no track split).
  - Lost-track recovery (track kept alive for ``track_buffer`` frames, then pruned).
  - New-track threshold (low-confidence detections do not spawn tracks).
"""

import numpy as np

from modules.vehicle_recognition.tracking.tracker import ByteTracker
from modules.vehicle_recognition.detection.vehicle_detector import DetectionResult


def _det(bbox, conf=0.9, class_id=2, name="car"):
    return DetectionResult(bbox=bbox, confidence=conf, class_id=class_id, class_name=name)


def _blank():
    return np.zeros((100, 100, 3), np.uint8)


def test_stable_ids_under_realistic_motion():
    t = ByteTracker()
    seen = []
    # A car moving ~4% of the frame width per frame (realistic for 25 fps).
    for f in range(30):
        x = 0.1 + f * 0.04
        tracks = t.update([_det([x, 0.1, x + 0.2, 0.4])], _blank(), "cam")
        seen.extend(tr.track_id for tr in tracks)
    assert len(set(seen)) == 1, f"expected 1 stable id, got {set(seen)}"


def test_duplicate_prevention_two_detections():
    t = ByteTracker()
    # Two well-separated vehicles in the same frame -> two distinct tracks.
    tracks = t.update(
        [_det([0.05, 0.1, 0.25, 0.4]), _det([0.6, 0.1, 0.8, 0.4])],
        _blank(), "cam",
    )
    assert len(tracks) == 2
    ids = {tr.track_id for tr in tracks}
    assert len(ids) == 2


def test_no_track_reused_by_two_detections():
    t = ByteTracker()
    # Frame 1: one detection -> track 1.
    t.update([_det([0.1, 0.1, 0.3, 0.4])], _blank(), "cam")
    # Frame 2: two detections, both overlapping track 1's last box.
    tracks = t.update(
        [_det([0.11, 0.1, 0.31, 0.4]), _det([0.12, 0.1, 0.32, 0.4])],
        _blank(), "cam",
    )
    # Greedy assignment: at most one detection is matched to the existing track;
    # the second (if unmatched) would be a new track only if conf >= new_track_thresh.
    matched = sum(1 for tr in tracks if tr.track_id == 1)
    assert matched <= 1


def test_lost_track_recovery_within_buffer():
    t = ByteTracker()
    buffer = t._cfg.track_buffer  # default 30
    t.update([_det([0.1, 0.1, 0.3, 0.4])], _blank(), "cam")
    # Disappear for (buffer) frames -> still alive (time_since_update == buffer, not >).
    for _ in range(buffer):
        t.update([], _blank(), "cam")
    assert t.active_count == 1, "track should survive up to track_buffer misses"
    # Reappear with a matching box -> same ID recovered.
    tracks = t.update([_det([0.1, 0.1, 0.3, 0.4])], _blank(), "cam")
    assert any(tr.track_id == 1 for tr in tracks)


def test_lost_track_pruned_after_buffer():
    t = ByteTracker()
    buffer = t._cfg.track_buffer
    t.update([_det([0.1, 0.1, 0.3, 0.4])], _blank(), "cam")
    for _ in range(buffer + 1):
        t.update([], _blank(), "cam")
    assert t.active_count == 0


def test_low_confidence_does_not_spawn_new_track():
    t = ByteTracker()
    # Seed a real track first; the new-track threshold gate only applies to
    # unmatched detections on subsequent frames.
    t.update([_det([0.1, 0.1, 0.3, 0.4], conf=0.9)], _blank(), "cam")
    # A far, low-confidence detection (below new_track_thresh=0.6) -> no new track.
    tracks = t.update([_det([0.8, 0.1, 0.95, 0.4], conf=0.2)], _blank(), "cam")
    assert len(tracks) == 1


def test_first_frame_seeds_tracks():
    t = ByteTracker()
    tracks = t.update([_det([0.1, 0.1, 0.3, 0.4])], _blank(), "cam")
    assert len(tracks) == 1
    assert tracks[0].track_id == 1
