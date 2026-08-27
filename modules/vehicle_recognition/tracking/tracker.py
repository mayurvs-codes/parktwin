"""
ParkTwin AI — ByteTrack Multi-Object Tracker
=============================================
Persistent vehicle ID tracker.

NOTE: This is a pure-Python IoU greedy tracker (the `tracking.algorithm`
config value is preserved as the future swap-in point for the official
ByteTrack). It associates high/low confidence detections across frames and
keeps lost tracks alive for `track_buffer` frames.

Reference: https://arxiv.org/abs/2110.06864
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List

import numpy as np

from backend.core.config import get_settings
from shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class Track:
    """Represents a single tracked vehicle."""
    track_id: int
    class_name: str
    class_id: int
    bbox: List[float]          # [x1, y1, x2, y2] normalized
    confidence: float
    age: int = 0               # frames since first detection
    hits: int = 1              # total frames it has been detected
    time_since_update: int = 0 # frames since last match
    state: str = "active"      # active | lost | removed
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    history: List[List[float]] = field(default_factory=list)

    def update(self, bbox: List[float], confidence: float) -> None:
        self.bbox = bbox
        self.confidence = confidence
        self.hits += 1
        self.time_since_update = 0
        self.last_seen = time.time()
        self.history.append(bbox)
        if len(self.history) > 30:
            self.history.pop(0)

    def mark_missed(self) -> None:
        self.time_since_update += 1
        self.age += 1
        if self.time_since_update > settings.tracking.track_buffer:
            self.state = "lost"

    @property
    def is_confirmed(self) -> bool:
        return self.hits >= 3

    def to_dict(self) -> Dict:
        return {
            "track_id": self.track_id,
            "class_name": self.class_name,
            "bbox": self.bbox,
            "confidence": round(self.confidence, 4),
            "state": self.state,
            "hits": self.hits,
            "age": self.age,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }


class ByteTracker:
    """
    Multi-object tracker for vehicle tracking.

    Usage:
        tracker = ByteTracker()
        tracks = tracker.update(detections, frame)
    """

    def __init__(self) -> None:
        self._cfg = settings.tracking
        self._tracks: Dict[int, Track] = {}
        self._next_id: int = 1
        self._frame_count: int = 0
        logger.info("ByteTracker initialized")

    def update(
        self,
        detections: List,           # List[DetectionResult]
        frame: np.ndarray,
        camera_id: str = "unknown",
    ) -> List[Track]:
        """
        Update tracker with new detections.

        Args:
            detections: List of DetectionResult from VehicleDetector
            frame: Current video frame (for appearance features if needed)
            camera_id: For logging

        Returns:
            List of active Track objects with assigned IDs
        """
        self._frame_count += 1

        if not detections:
            # Mark all active tracks as missed
            for track in self._tracks.values():
                if track.state == "active":
                    track.mark_missed()
            return self._get_active_tracks()

        # Build detection matrix [x1, y1, x2, y2, conf]
        det_boxes = np.array([[*d.bbox, d.confidence] for d in detections])

        if len(self._tracks) == 0:
            # First frame: create tracks for all detections
            for det in detections:
                self._create_track(det)
        else:
            self._associate_and_update(detections, det_boxes)

        # Remove lost tracks
        self._tracks = {
            tid: t for tid, t in self._tracks.items()
            if t.state != "lost"
        }

        active = self._get_active_tracks()
        logger.debug(
            f"[{camera_id}] frame={self._frame_count} | "
            f"tracks={len(active)} | total_ids={self._next_id - 1}"
        )
        return active

    def _associate_and_update(self, detections: List, det_boxes: np.ndarray) -> None:
        """IoU-based greedy assignment of detections to tracks."""
        active_ids = [tid for tid, t in self._tracks.items() if t.state == "active"]
        if not active_ids:
            for det in detections:
                self._create_track(det)
            return

        track_boxes = np.array([self._tracks[tid].bbox for tid in active_ids])
        iou_matrix = self._iou_batch(det_boxes[:, :4], track_boxes)

        matched_dets = set()
        matched_tracks = set()

        # High-confidence association (greedy)
        for d_idx in range(len(detections)):
            if det_boxes[d_idx, 4] < self._cfg.track_high_thresh:
                continue
            best_iou = self._cfg.match_thresh
            best_t = -1
            for t_idx, tid in enumerate(active_ids):
                if t_idx in matched_tracks:
                    continue
                if iou_matrix[d_idx, t_idx] > best_iou:
                    best_iou = iou_matrix[d_idx, t_idx]
                    best_t = t_idx
            if best_t >= 0:
                tid = active_ids[best_t]
                self._tracks[tid].update(
                    detections[d_idx].bbox,
                    detections[d_idx].confidence,
                )
                matched_dets.add(d_idx)
                matched_tracks.add(best_t)

        # Low-confidence association
        for d_idx in range(len(detections)):
            if d_idx in matched_dets:
                continue
            if det_boxes[d_idx, 4] < self._cfg.track_low_thresh:
                continue
            best_iou = self._cfg.match_thresh * 0.5
            best_t = -1
            for t_idx, tid in enumerate(active_ids):
                if t_idx in matched_tracks:
                    continue
                if iou_matrix[d_idx, t_idx] > best_iou:
                    best_iou = iou_matrix[d_idx, t_idx]
                    best_t = t_idx
            if best_t >= 0:
                tid = active_ids[best_t]
                self._tracks[tid].update(
                    detections[d_idx].bbox,
                    detections[d_idx].confidence,
                )
                matched_dets.add(d_idx)
                matched_tracks.add(best_t)

        # Unmatched detections → new tracks
        for d_idx in range(len(detections)):
            if d_idx not in matched_dets:
                if det_boxes[d_idx, 4] >= self._cfg.new_track_thresh:
                    self._create_track(detections[d_idx])

        # Unmatched tracks → increment miss counter
        for t_idx, tid in enumerate(active_ids):
            if t_idx not in matched_tracks:
                self._tracks[tid].mark_missed()

    def _create_track(self, det) -> Track:
        track = Track(
            track_id=self._next_id,
            class_name=det.class_name,
            class_id=det.class_id,
            bbox=det.bbox,
            confidence=det.confidence,
        )
        self._tracks[self._next_id] = track
        self._next_id += 1
        return track

    def _get_active_tracks(self) -> List[Track]:
        return [t for t in self._tracks.values() if t.state == "active"]

    @staticmethod
    def _iou_batch(boxes_a: np.ndarray, boxes_b: np.ndarray) -> np.ndarray:
        """Compute IoU between two sets of boxes [x1,y1,x2,y2]."""
        n, m = len(boxes_a), len(boxes_b)
        iou = np.zeros((n, m), dtype=np.float32)
        for i, a in enumerate(boxes_a):
            ax1, ay1, ax2, ay2 = a
            area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
            for j, b in enumerate(boxes_b):
                bx1, by1, bx2, by2 = b
                ix1, iy1 = max(ax1, bx1), max(ay1, by1)
                ix2, iy2 = min(ax2, bx2), min(ay2, by2)
                inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
                union = area_a + area_b - inter
                iou[i, j] = inter / union if union > 0 else 0.0
        return iou

    def reset(self) -> None:
        """Reset tracker state (e.g., on camera reconnect)."""
        self._tracks.clear()
        self._next_id = 1
        self._frame_count = 0

    @property
    def active_count(self) -> int:
        return sum(1 for t in self._tracks.values() if t.state == "active")
