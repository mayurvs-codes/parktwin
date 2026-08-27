"""
ParkTwin AI — Track Manager
==============================
Bridges the ByteTracker with the database and pipeline.
Manages per-camera trackers and per-track entry timing.

NOTE: slot assignment is owned exclusively by the Parking Intelligence module
(Module 2). This manager tracks only (no slot/occupancy bookkeeping).
"""

from __future__ import annotations

import time
from typing import Dict, List

from shared.logging import get_logger
from shared.helpers.time_utils import format_duration
from .tracker import ByteTracker, Track

logger = get_logger(__name__)


class TrackManager:
    """
    Manages multiple ByteTracker instances (one per camera) and tracks
    per-track entry timing. Slot assignment is owned by Module 2.
    """

    def __init__(self) -> None:
        # One tracker per camera
        self._trackers: Dict[str, ByteTracker] = {}
        # track_id → entry timestamp
        self._entry_times: Dict[str, Dict[int, float]] = {}
        logger.info("TrackManager initialized")

    def get_tracker(self, camera_id: str) -> ByteTracker:
        """Get or create a ByteTracker for a specific camera."""
        if camera_id not in self._trackers:
            self._trackers[camera_id] = ByteTracker()
            self._entry_times[camera_id] = {}
            logger.info(f"Created tracker for camera: {camera_id}")
        return self._trackers[camera_id]

    def update(
        self,
        camera_id: str,
        detections: List,
        frame,
    ) -> List[Track]:
        """Update tracker for a camera and return active tracks."""
        tracker = self.get_tracker(camera_id)
        tracks = tracker.update(detections, frame, camera_id)

        now = time.time()
        for track in tracks:
            # Record entry time for new tracks
            if track.track_id not in self._entry_times[camera_id]:
                self._entry_times[camera_id][track.track_id] = now
                logger.info(
                    f"[{camera_id}] 🚗 New vehicle | track_id={track.track_id} "
                    f"| class={track.class_name}"
                )

        return tracks

    def release_track(self, camera_id: str, track_id: int) -> None:
        """Release a track (vehicle departed) and clear its entry timing."""
        self._entry_times.get(camera_id, {}).pop(track_id, None)

    def get_duration(self, camera_id: str, track_id: int) -> float:
        """Get parking duration in seconds for a track."""
        entry = self._entry_times.get(camera_id, {}).get(track_id)
        if entry is None:
            return 0.0
        return time.time() - entry

    def get_duration_str(self, camera_id: str, track_id: int) -> str:
        """Human-readable duration string HH:MM:SS."""
        return format_duration(self.get_duration(camera_id, track_id))

    def reset_camera(self, camera_id: str) -> None:
        """Reset tracker for a camera (e.g., on reconnect)."""
        if camera_id in self._trackers:
            self._trackers[camera_id].reset()
            self._entry_times[camera_id] = {}
            logger.info(f"[{camera_id}] Tracker reset")

    @property
    def stats(self) -> Dict:
        return {
            "cameras": len(self._trackers),
            "total_active_tracks": sum(t.active_count for t in self._trackers.values()),
        }
