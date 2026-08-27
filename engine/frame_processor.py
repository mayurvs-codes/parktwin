"""
ParkTwin AI — Frame Processor / Camera Stream Manager
=======================================================
Manages multi-camera stream ingestion from various sources:
  - Webcam (USB index: 0, 1, 2…)
  - IP Camera (RTSP URL)
  - Video file (.mp4, .avi, .mkv…)
  - Recorded clips for testing

Features:
  - Per-camera background thread with asyncio bridge
  - Auto-reconnect on disconnect
  - Frame-skip to match target FPS
  - Frame queuing (latest frame only)
"""

from __future__ import annotations

import threading
import time
from typing import Dict, List, Optional

import cv2
import numpy as np

from backend.core.config import get_settings, CameraSource
from shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class CameraStream:
    """
    Manages a single CCTV camera stream in a background thread.
    Always keeps the latest frame in a 1-slot queue.
    """

    def __init__(self, source: CameraSource) -> None:
        self.source = source
        self._cap: Optional[cv2.VideoCapture] = None
        self._latest_frame: Optional[np.ndarray] = None
        self._frame_lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._frame_count = 0
        self._fps_actual = 0.0
        self._connected = False
        self._last_error: Optional[str] = None

    def start(self) -> None:
        """Start the capture thread."""
        self._running = True
        self._thread = threading.Thread(
            target=self._capture_loop,
            name=f"cam-{self.source.id}",
            daemon=True,
        )
        self._thread.start()
        logger.info(f"[{self.source.id}] Camera stream started: {self.source.url}")

    def stop(self) -> None:
        """Stop the capture thread."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=3)
        if self._cap:
            self._cap.release()
        logger.info(f"[{self.source.id}] Camera stream stopped")

    def get_frame(self) -> Optional[np.ndarray]:
        """Get the latest captured frame (thread-safe)."""
        with self._frame_lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None

    def _capture_loop(self) -> None:
        """Background thread: continuously capture frames with target FPS pacing."""
        frame_skip = max(1, int(settings.cameras.frame_skip or 2))
        reconnect_delay = settings.cameras.reconnect_delay
        fps_target = max(1, int(getattr(self.source, "fps_target", 25) or 25))
        frame_interval = 1.0 / fps_target

        while self._running:
            if not self._connect():
                logger.warning(
                    f"[{self.source.id}] Connection failed. "
                    f"Retrying in {reconnect_delay}s..."
                )
                time.sleep(reconnect_delay)
                continue

            t_last = time.time()
            local_count = 0

            while self._running:
                loop_start = time.time()
                ret, frame = self._cap.read()
                if not ret:
                    # Auto-loop demo video on EOF
                    self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self._cap.read()
                    if not ret:
                        logger.warning(f"[{self.source.id}] Frame read failed. Reconnecting...")
                        self._connected = False
                        break

                local_count += 1
                self._frame_count += 1

                # Skip frames to reduce load
                if local_count % frame_skip != 0:
                    elapsed = time.time() - loop_start
                    sleep_time = frame_interval - elapsed
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                    continue

                with self._frame_lock:
                    self._latest_frame = frame

                # Compute actual FPS
                now = time.time()
                if now - t_last >= 5.0:
                    self._fps_actual = local_count / (now - t_last)
                    local_count = 0
                    t_last = now

                # Pace the frame ingestion to target FPS
                elapsed = time.time() - loop_start
                sleep_time = frame_interval - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)

            if self._cap:
                self._cap.release()

    def _connect(self) -> bool:
        """Open the video capture source."""
        try:
            import os
            from pathlib import Path
            url_str = str(self.source.url)
            target: str | int = url_str

            if url_str.isdigit() or url_str == "0":
                target = int(url_str)
            else:
                # Video file or RTSP stream
                is_stream = url_str.startswith("rtsp://") or url_str.startswith("http://") or url_str.startswith("https://")
                if not is_stream:
                    # Check candidate file locations
                    candidates = [
                        url_str,
                        "/app/parking_lot.mp4",
                        "/app/videos/car_detection_sample.mp4",
                        "/app/videos/car_entering_parking.mp4",
                        "/app/videos/Traffic.mp4",
                        "/app/videos/video_3_parking_overview.mp4",
                        "videos/car_detection_sample.mp4",
                        "videos/car_entering_parking.mp4",
                        "videos/Traffic.mp4",
                        "parking_lot.mp4",
                    ]
                    # Also scan /app/videos and videos/
                    for v_dir in ["/app/videos", "videos"]:
                        if os.path.exists(v_dir):
                            for p in Path(v_dir).glob("*.mp4"):
                                candidates.append(str(p))

                    found = None
                    for c in candidates:
                        if os.path.isfile(c) and os.path.getsize(c) > 0:
                            found = c
                            break
                    if found:
                        target = found

            self._cap = cv2.VideoCapture(target)

            if self._cap.isOpened():
                self._connected = True
                self._last_error = None
                logger.info(f"[{self.source.id}] ✅ Connected to camera stream: {target}")
                return True
            else:
                self._connected = False
                self._last_error = f"Failed to open video source: {target}"
                return False
        except Exception as e:
            self._last_error = str(e)
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def fps(self) -> float:
        return self._fps_actual

    @property
    def frame_count(self) -> int:
        return self._frame_count

    def status(self) -> Dict:
        return {
            "camera_id": self.source.id,
            "name": self.source.name,
            "connected": self._connected,
            "fps": round(self._fps_actual, 1),
            "frame_count": self._frame_count,
            "last_error": self._last_error,
        }


class FrameProcessor:
    """Orchestrates multiple CameraStream instances. Provides frame retrieval for the pipeline."""

    def __init__(self) -> None:
        self._streams: Dict[str, CameraStream] = {}
        logger.info("FrameProcessor initialized")

    def add_camera(self, source: CameraSource) -> None:
        """Register and start a new camera stream."""
        if source.id in self._streams:
            logger.warning(f"Camera {source.id} already exists. Replacing.")
            self._streams[source.id].stop()

        stream = CameraStream(source)
        self._streams[source.id] = stream

        if source.enabled:
            stream.start()

    def start_all(self) -> None:
        """Start all configured cameras from settings."""
        for source in settings.cameras.sources:
            self.add_camera(source)
        logger.info(f"Started {len(self._streams)} camera streams")

    def stop_all(self) -> None:
        """Stop all active camera streams."""
        for stream in self._streams.values():
            stream.stop()
        self._streams.clear()
        logger.info("All camera streams stopped")

    def get_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Get the latest frame from a specific camera."""
        stream = self._streams.get(camera_id)
        if stream:
            return stream.get_frame()
        return None

    def get_latest_frame(self, camera_id: str) -> Optional[bytes]:
        """Get the latest captured frame for a camera as JPEG-encoded bytes."""
        frame = self.get_frame(camera_id)
        if frame is None:
            return None
        success, encoded_img = cv2.imencode(".jpg", frame)
        if not success:
            return None
        return encoded_img.tobytes()


    def update_frame(self, camera_id: str, frame: np.ndarray) -> None:
        """Manually update the latest frame for a camera."""
        stream = self._streams.get(camera_id)
        if not stream:
            source = CameraSource(id=camera_id, name=camera_id, url="", enabled=False)
            stream = CameraStream(source)
            self._streams[camera_id] = stream
        with stream._frame_lock:
            stream._latest_frame = frame
            stream._connected = True

    def get_all_frames(self) -> Dict[str, Optional[np.ndarray]]:
        """Get latest frames from all active cameras."""
        return {
            cam_id: stream.get_frame()
            for cam_id, stream in self._streams.items()
            if stream.source.enabled
        }

    def remove_camera(self, camera_id: str) -> bool:
        stream = self._streams.pop(camera_id, None)
        if stream:
            stream.stop()
            return True
        return False

    def get_status(self) -> List[Dict]:
        return [s.status() for s in self._streams.values()]

    @property
    def active_cameras(self) -> int:
        return sum(1 for s in self._streams.values() if s.is_connected)

    @property
    def camera_ids(self) -> List[str]:
        return list(self._streams.keys())
