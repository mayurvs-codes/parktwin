"""
ParkTwin AI — Vehicle Detector
================================
YOLOv8 / YOLOv11 based vehicle detection module.

Supports:
  - Automatic model weight downloading
  - GPU (CUDA/MPS) and CPU inference
  - Batch processing for multi-camera setups
  - Half-precision (FP16) for faster GPU inference
  - Configurable confidence and IOU thresholds
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional, Tuple

import numpy as np

from backend.core.config import get_settings
from shared.logging import get_logger
from .model_manager import ModelManager

logger = get_logger(__name__)
settings = get_settings()

# COCO class IDs that are vehicles
VEHICLE_CLASS_IDS = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    # Custom fine-tuned class IDs (if using custom model)
    8: "auto_rickshaw",
    9: "scooter",
    10: "pickup_truck",
    11: "van",
    12: "suv",
    13: "hatchback",
    14: "sedan",
    15: "electric_car",
    16: "school_bus",
    17: "delivery_vehicle",
    18: "emergency_vehicle",
}


class DetectionResult:
    """Container for a single vehicle detection."""

    __slots__ = [
        "bbox", "confidence", "class_id", "class_name",
        "track_id", "frame_id", "timestamp"
    ]

    def __init__(
        self,
        bbox: List[float],          # [x1, y1, x2, y2] normalized 0-1
        confidence: float,
        class_id: int,
        class_name: str,
        track_id: Optional[int] = None,
        frame_id: int = 0,
        timestamp: float = 0.0,
    ) -> None:
        self.bbox = bbox
        self.confidence = confidence
        self.class_id = class_id
        self.class_name = class_name
        self.track_id = track_id
        self.frame_id = frame_id
        self.timestamp = timestamp

    def to_dict(self) -> Dict:
        return {
            "bbox": self.bbox,
            "confidence": round(self.confidence, 4),
            "class_id": self.class_id,
            "class_name": self.class_name,
            "track_id": self.track_id,
            "frame_id": self.frame_id,
            "timestamp": self.timestamp,
        }

    def get_pixel_bbox(self, frame_w: int, frame_h: int) -> Tuple[int, int, int, int]:
        """Convert normalized bbox to pixel coordinates."""
        x1, y1, x2, y2 = self.bbox
        return (
            int(x1 * frame_w),
            int(y1 * frame_h),
            int(x2 * frame_w),
            int(y2 * frame_h),
        )

    def crop_from_frame(self, frame: np.ndarray, padding: int = 10) -> np.ndarray:
        """Crop the detected vehicle from a frame."""
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = self.get_pixel_bbox(w, h)
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        return frame[y1:y2, x1:x2]


class VehicleDetector:
    """
    YOLOv8/v11 vehicle detector with automatic device selection.

    Usage:
        detector = VehicleDetector()
        results = detector.detect(frame)
    """

    def __init__(self) -> None:
        self._cfg = settings.models.detector
        self._device = settings.get_device(self._cfg.device)
        self._model = None
        self._model_manager = ModelManager()
        self._frame_count = 0
        # Restrict the model to the configured vehicle class ids. For a standard
        # COCO YOLO (yolov8m), only 2/3/5/7 are vehicles; requesting 8-18 would
        # return boats, cats, dogs, etc. and mislabel them as vehicles. Custom
        # fine-tuned models override ``yolo_vehicle_ids`` in settings.
        self._vehicle_class_ids = list(settings.vehicle_classes.yolo_vehicle_ids) or [2, 3, 5, 7]
        logger.info(f"VehicleDetector initialized | device={self._device} | model={self._cfg.name}")

    def load(self) -> None:
        """Load the YOLO model weights (downloads if missing)."""
        weights_path = self._model_manager.ensure_weights(
            model_name=self._cfg.name,
            weights_path=self._cfg.weights_path,
        )
        try:
            import torch
            orig_load = torch.load
            def custom_load(*args, **kwargs):
                kwargs["weights_only"] = False
                return orig_load(*args, **kwargs)
            
            torch.load = custom_load
            try:
                from ultralytics import YOLO
                self._model = YOLO(str(weights_path))
            finally:
                torch.load = orig_load
            # Warm-up run
            dummy = np.zeros((640, 640, 3), dtype=np.uint8)
            self._model(dummy, device=self._device, verbose=False)
            logger.info(f"✅ YOLO model loaded: {weights_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise

    def detect(
        self,
        frame: np.ndarray,
        frame_id: int = 0,
        camera_id: str = "unknown",
    ) -> Tuple[List[DetectionResult], float]:
        """
        Run detection on a single frame.

        Returns:
            (detections, inference_time_ms)
        """
        if self._model is None:
            raise RuntimeError("Call VehicleDetector.load() before detect()")

        t0 = time.perf_counter()

        results = self._model(
            frame,
            device=self._device,
            conf=self._cfg.confidence_threshold,
            iou=self._cfg.iou_threshold,
            imgsz=self._cfg.input_size,
            half=self._cfg.half_precision and self._device == "cuda",
            verbose=False,
            classes=self._vehicle_class_ids,
        )

        inference_ms = (time.perf_counter() - t0) * 1000
        detections: List[DetectionResult] = []

        for r in results:
            if r.boxes is None:
                continue
            h, w = frame.shape[:2]
            for box in r.boxes:
                cls_val = box.cls[0]
                cls_id = int(cls_val.item() if hasattr(cls_val, "item") else cls_val)
                conf_val = box.conf[0]
                conf = float(conf_val.item() if hasattr(conf_val, "item") else conf_val)
                xyxy_val = box.xyxyn[0]
                xyxy = xyxy_val.tolist() if hasattr(xyxy_val, "tolist") else xyxy_val

                class_name = VEHICLE_CLASS_IDS.get(cls_id, r.names.get(cls_id, "vehicle"))

                # Filter minimum bounding box area
                px_x1, px_y1, px_x2, px_y2 = (
                    int(xyxy[0]*w), int(xyxy[1]*h),
                    int(xyxy[2]*w), int(xyxy[3]*h),
                )
                area = (px_x2 - px_x1) * (px_y2 - px_y1)
                if area < settings.tracking.min_box_area:
                    continue

                detections.append(DetectionResult(
                    bbox=xyxy,
                    confidence=conf,
                    class_id=cls_id,
                    class_name=class_name,
                    frame_id=frame_id,
                    timestamp=time.time(),
                ))

        self._frame_count += 1
        logger.debug(
            f"[{camera_id}] frame={frame_id} | detected={len(detections)} | "
            f"latency={inference_ms:.1f}ms"
        )
        return detections, inference_ms

    def detect_batch(
        self,
        frames: List[np.ndarray],
        camera_ids: Optional[List[str]] = None,
    ) -> List[Tuple[List[DetectionResult], float]]:
        """Run detection on a batch of frames (one per camera)."""
        if camera_ids is None:
            camera_ids = [f"cam_{i}" for i in range(len(frames))]
        return [
            self.detect(frame, frame_id=i, camera_id=cam_id)
            for i, (frame, cam_id) in enumerate(zip(frames, camera_ids))
        ]

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def __repr__(self) -> str:
        return (
            f"VehicleDetector(model={self._cfg.name}, "
            f"device={self._device}, loaded={self.is_loaded})"
        )
