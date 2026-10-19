"""
ParkTwin AI — Bay Entry Detection Engine
==========================================
Processes per-frame tracked vehicle bounding boxes, projects footprints to floor
coordinates using camera calibration homographies, and tracks bay interaction states
using geometric overlap (Shapely) and kinematic filtering.

Discourages false positives from aisle drive-pasts through:
  - Overlap threshold (ENTRY_OVERLAP_MIN)
  - Directional filtering (velocity vector oriented toward bay center)
  - Speed filtering (speed <= ENTRY_MAX_SPEED)
  - Temporal confirmation (sustain for ENTRY_CONFIRM_MS)
  - Exit hysteresis (LEAVE_OVERLAP_MAX sustained for LEAVE_CONFIRM_MS)
"""

from __future__ import annotations

import math
import os
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import yaml
from shapely.geometry import Polygon, box

from .config import BayEntryConfig
from .events import (
    BAY_ENTRY_CONFIRMED,
    BAY_EXIT_CONFIRMED,
    BAY_OCCUPIED,
    BayEntryEvent,
    BayEntryState,
)


class BayEntryDetector:
    """Stateful detector monitoring vehicle bay entries and departures."""

    def __init__(
        self,
        config: Optional[BayEntryConfig] = None,
        facility_geometry_path: Optional[str] = None,
    ) -> None:
        self.config = config or BayEntryConfig.from_settings()
        self.calibrations: Dict[str, Dict[str, Any]] = {}
        self.bay_polygons: Dict[str, Polygon] = {}
        self.bay_centers: Dict[str, Tuple[float, float]] = {}

        self._load_calibrations(self.config.calibration_file)
        self._load_facility_geometry(facility_geometry_path)

        # Track history: track_id -> deque of (timestamp, x, y)
        self._track_history: Dict[int, deque] = defaultdict(lambda: deque(maxlen=30))
        self._track_last_seen: Dict[int, float] = {}

        # Episode and state tracking: (track_id, bay_id) -> state dict
        self._bay_states: Dict[Tuple[int, str], Dict[str, Any]] = defaultdict(
            lambda: {
                "state": BayEntryState.OUTSIDE,
                "overlap_ratio": 0.0,
                "first_overlap_ts": None,
                "first_leave_ts": None,
                "episode_n": 1,
                "entry_confirmed": False,
                "occupied_confirmed": False,
                "exit_confirmed": False,
            }
        )

    def _load_calibrations(self, calib_path_str: str) -> None:
        """Load homography matrices and camera statuses from YAML."""
        base_dir = Path(__file__).resolve().parents[3]
        calib_path = Path(calib_path_str)
        if not calib_path.is_absolute():
            calib_path = base_dir / calib_path

        if not calib_path.exists():
            return

        try:
            with open(calib_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            cameras = data.get("cameras", {})
            for cam_id, cam_cfg in cameras.items():
                status = cam_cfg.get("status", "unconfigured")
                homography = None
                if status == "calibrated" and "homography_matrix" in cam_cfg:
                    homography = np.array(cam_cfg["homography_matrix"], dtype=np.float64)
                self.calibrations[cam_id] = {
                    "status": status,
                    "name": cam_cfg.get("name", cam_id),
                    "homography": homography,
                }
        except Exception:
            pass

    def _load_facility_geometry(self, geometry_path_str: Optional[str] = None) -> None:
        """Load bay coordinates and construct floor polygons in meters."""
        base_dir = Path(__file__).resolve().parents[3]
        if not geometry_path_str:
            geom_path = base_dir / "shared" / "facility_geometry.json"
        else:
            geom_path = Path(geometry_path_str)
            if not geom_path.is_absolute():
                geom_path = base_dir / geom_path

        if not geom_path.exists():
            return

        try:
            import json

            with open(geom_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            bays = data.get("bays", [])
            for bay in bays:
                bay_id = bay["id"]
                pos = bay.get("position_3d", [0.0, 0.0, 0.0])
                dims = bay.get("dimensions_meters", {"width": 2.8, "length": 5.4})
                orientation = bay.get("orientation", "vertical")

                # In facility 3D: x = horizontal, z = vertical floor coordinate
                cx, cz = float(pos[0]), float(pos[2])
                w, l = float(dims["width"]), float(dims["length"])

                if orientation == "vertical":
                    # width is x extent, length is z extent
                    minx, maxx = cx - w / 2, cx + w / 2
                    miny, maxy = cz - l / 2, cz + l / 2
                else:
                    # horizontal orientation: length is x extent, width is z extent
                    minx, maxx = cx - l / 2, cx + l / 2
                    miny, maxy = cz - w / 2, cz + w / 2

                self.bay_polygons[bay_id] = box(minx, miny, maxx, maxy)
                self.bay_centers[bay_id] = (cx, cz)
        except Exception:
            pass

    def register_bay(self, bay_id: str, polygon: Polygon, center: Optional[Tuple[float, float]] = None) -> None:
        """Manually register or override a bay polygon."""
        self.bay_polygons[bay_id] = polygon
        if center:
            self.bay_centers[bay_id] = center
        else:
            c = polygon.centroid
            self.bay_centers[bay_id] = (c.x, c.y)

    def register_camera(
        self,
        camera_id: str,
        status: str,
        homography: Optional[np.ndarray] = None,
    ) -> None:
        """Register or override camera calibration."""
        self.calibrations[camera_id] = {
            "status": status,
            "homography": homography,
        }

    def load_synthetic_test_calibration(self, camera_id: str) -> bool:
        """Load homography from _synthetic_test_only block for unit testing ONLY.

        Strictly isolated from runtime execution.
        """
        base_dir = Path(__file__).resolve().parents[3]
        calib_path = Path(self.config.calibration_file)
        if not calib_path.is_absolute():
            calib_path = base_dir / calib_path

        if not calib_path.exists():
            return False

        try:
            with open(calib_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            cam_cfg = data.get("cameras", {}).get(camera_id, {})
            synth = cam_cfg.get("_synthetic_test_only", {})
            if "homography_matrix" in synth:
                self.calibrations[camera_id] = {
                    "status": "calibrated",
                    "name": cam_cfg.get("name", camera_id),
                    "homography": np.array(synth["homography_matrix"], dtype=np.float64),
                }
                return True
        except Exception:
            pass
        return False

    def project_to_floor(
        self, camera_id: str, u: float, v: float
    ) -> Optional[Tuple[float, float]]:
        """Project image plane point (u, v) to floor (x, y) meters via homography.

        Returns None if camera is uncalibrated or unconfigured.
        """
        cam = self.calibrations.get(camera_id)
        if not cam or cam.get("status") != "calibrated":
            return None

        H = cam.get("homography")
        if H is None or H.shape != (3, 3):
            return None

        pt = np.array([u, v, 1.0], dtype=np.float64)
        proj = H @ pt
        w = proj[2]
        if abs(w) < 1e-7:
            return None
        return float(proj[0] / w), float(proj[1] / w)

    def get_camera_status(self, camera_id: str) -> str:
        """Return calibration status: 'calibrated' or 'unconfigured'."""
        cam = self.calibrations.get(camera_id)
        if not cam:
            return "unconfigured"
        return cam.get("status", "unconfigured")

    def _build_footprint(self, fx: float, fy: float) -> Polygon:
        """Build vehicle footprint polygon around floor center point."""
        w = self.config.vehicle_footprint_width_m
        l = self.config.vehicle_footprint_length_m
        return box(fx - w / 2, fy - l / 2, fx + w / 2, fy + l / 2)

    def _calculate_velocity(self, track_id: int) -> Tuple[float, float, float]:
        """Calculate (vx, vy, speed_mps) from recent track history."""
        hist = self._track_history[track_id]
        if len(hist) < 2:
            return 0.0, 0.0, 0.0

        t1, x1, y1 = hist[-1]
        t0, x0, y0 = hist[0]
        dt = t1 - t0
        if dt <= 1e-4:
            return 0.0, 0.0, 0.0

        vx = (x1 - x0) / dt
        vy = (y1 - y0) / dt
        speed = math.hypot(vx, vy)
        return vx, vy, speed

    def update(
        self,
        detections: List[Dict[str, Any]],
        ts: Optional[float] = None,
        source: str = "live",
    ) -> List[BayEntryEvent]:
        """
        Process a batch of vehicle detections for a frame.

        Each detection dict supports:
            - track_id: int
            - camera_id: str
            - bbox: [x1, y1, x2, y2] (pixel coordinates or normalized)
            - floor_coords: Optional[Tuple[float, float]] (meters, if pre-projected/synthetic)
        """
        if ts is None:
            ts = datetime.now(timezone.utc).timestamp()

        events: List[BayEntryEvent] = []
        seen_tracks = set()

        for det in detections:
            track_id = int(det["track_id"])
            camera_id = det.get("camera_id", "CAM-01")
            seen_tracks.add(track_id)

            # Check camera calibration status: unconfigured cameras never emit events
            cam_status = self.get_camera_status(camera_id)
            if cam_status != "calibrated" and "floor_coords" not in det:
                continue

            # Determine floor position
            if "floor_coords" in det and det["floor_coords"] is not None:
                fx, fy = det["floor_coords"]
            else:
                bbox = det.get("bbox")
                if not bbox or len(bbox) < 4:
                    continue
                # Reference point: bottom center of bbox
                u = (bbox[0] + bbox[2]) / 2.0
                v = float(bbox[3])
                proj = self.project_to_floor(camera_id, u, v)
                if proj is None:
                    continue
                fx, fy = proj

            # Update track history
            self._track_history[track_id].append((ts, fx, fy))
            self._track_last_seen[track_id] = ts
            vx, vy, speed = self._calculate_velocity(track_id)

            # Footprint polygon
            footprint = self._build_footprint(fx, fy)
            footprint_area = footprint.area

            # Evaluate against all bays
            for bay_id, bay_poly in self.bay_polygons.items():
                st = self._bay_states[(track_id, bay_id)]

                # Intersect
                try:
                    intersection = footprint.intersection(bay_poly)
                    overlap = (
                        intersection.area / footprint_area if footprint_area > 0 else 0.0
                    )
                except Exception:
                    overlap = 0.0

                st["overlap_ratio"] = overlap
                bx, by = self.bay_centers.get(bay_id, (bay_poly.centroid.x, bay_poly.centroid.y))

                # Direction check: is vehicle moving toward bay center?
                dx, dy = bx - fx, by - fy
                dist_to_bay = math.hypot(dx, dy)
                dot_product = vx * dx + vy * dy

                # If speed is near zero (< 0.3 m/s) or distance is very small, orientation check is satisfied
                oriented_toward_bay = (dot_product > 0) or (speed < 0.3) or (dist_to_bay < 1.0)

                # ── State Machine: ENTRY ────────────────────────────────────
                if not st["entry_confirmed"]:
                    is_entering_candidate = (
                        overlap >= self.config.entry_overlap_min
                        and oriented_toward_bay
                        and speed <= self.config.entry_max_speed
                    )

                    if is_entering_candidate:
                        if st["first_overlap_ts"] is None:
                            st["first_overlap_ts"] = ts
                            st["state"] = BayEntryState.APPROACHING

                        duration_ms = (ts - st["first_overlap_ts"]) * 1000.0
                        if duration_ms >= self.config.entry_confirm_ms:
                            st["state"] = BayEntryState.ENTERING
                            st["entry_confirmed"] = True
                            st["first_leave_ts"] = None

                            event = BayEntryEvent(
                                track_id=track_id,
                                bay_id=bay_id,
                                episode_n=st["episode_n"],
                                event_type=BAY_ENTRY_CONFIRMED,
                                source=source,
                                overlap_ratio=overlap,
                                speed_mps=speed,
                                camera_id=camera_id,
                                timestamp=datetime.fromtimestamp(ts, tz=timezone.utc),
                            )
                            events.append(event)
                    else:
                        # Reset confirmation timer if condition fails before confirmation
                        st["first_overlap_ts"] = None
                        if st["state"] != BayEntryState.OUTSIDE:
                            st["state"] = BayEntryState.OUTSIDE

                # ── State Machine: OCCUPIED ─────────────────────────────────
                elif st["entry_confirmed"] and not st["occupied_confirmed"]:
                    if overlap >= 0.70 or (overlap >= 0.50 and speed < 0.3):
                        st["state"] = BayEntryState.INSIDE
                        st["occupied_confirmed"] = True

                        event = BayEntryEvent(
                            track_id=track_id,
                            bay_id=bay_id,
                            episode_n=st["episode_n"],
                            event_type=BAY_OCCUPIED,
                            source=source,
                            overlap_ratio=overlap,
                            speed_mps=speed,
                            camera_id=camera_id,
                            timestamp=datetime.fromtimestamp(ts, tz=timezone.utc),
                        )
                        events.append(event)

                # ── State Machine: EXIT (Hysteresis) ─────────────────────────
                if st["entry_confirmed"]:
                    if overlap <= self.config.leave_overlap_max:
                        if st["first_leave_ts"] is None:
                            st["first_leave_ts"] = ts
                            st["state"] = BayEntryState.LEAVING

                        leave_dur_ms = (ts - st["first_leave_ts"]) * 1000.0
                        if leave_dur_ms >= self.config.leave_confirm_ms:
                            st["state"] = BayEntryState.OUTSIDE
                            st["exit_confirmed"] = True

                            event = BayEntryEvent(
                                track_id=track_id,
                                bay_id=bay_id,
                                episode_n=st["episode_n"],
                                event_type=BAY_EXIT_CONFIRMED,
                                source=source,
                                overlap_ratio=overlap,
                                speed_mps=speed,
                                camera_id=camera_id,
                                timestamp=datetime.fromtimestamp(ts, tz=timezone.utc),
                            )
                            events.append(event)

                            # Reset state for future episodes of this track & bay
                            st["episode_n"] += 1
                            st["entry_confirmed"] = False
                            st["occupied_confirmed"] = False
                            st["exit_confirmed"] = False
                            st["first_overlap_ts"] = None
                            st["first_leave_ts"] = None
                    else:
                        # Overlap above exit threshold: clear exit timer
                        st["first_leave_ts"] = None
                        if st["occupied_confirmed"]:
                            st["state"] = BayEntryState.INSIDE

        # ── Track Dropout / Loss ─────────────────────────────────────────────
        for track_id, last_seen in list(self._track_last_seen.items()):
            if track_id not in seen_tracks:
                if (ts - last_seen) * 1000.0 > self.config.track_loss_timeout_ms:
                    for (tid, bay_id), st in self._bay_states.items():
                        if tid == track_id and st["state"] != BayEntryState.OUTSIDE:
                            st["state"] = BayEntryState.UNKNOWN

        return events

    def get_track_bay_state(self, track_id: int, bay_id: str) -> BayEntryState:
        """Query current state machine state for a track and bay."""
        return self._bay_states[(track_id, bay_id)]["state"]

    def reset(self) -> None:
        """Clear all active tracks and episode histories."""
        self._track_history.clear()
        self._track_last_seen.clear()
        self._bay_states.clear()
