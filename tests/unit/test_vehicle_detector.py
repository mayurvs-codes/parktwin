"""
Unit tests for the Vehicle Detector (Module 1 — Task 1).

Verifies:
  - The COCO class filter is derived from the configured ``yolo_vehicle_ids``
    (a standard YOLOv8 must NOT return boats/cats/dogs as "vehicles").
  - Confidence threshold filtering.
  - Minimum bounding-box area filtering.
  - Class-name mapping and DetectionResult helpers.
"""

import numpy as np
import pytest

from modules.vehicle_recognition.detection.vehicle_detector import (
    VehicleDetector,
    DetectionResult,
    VEHICLE_CLASS_IDS,
)


# ── Fake ultralytics-style model output ───────────────────────────────────────

class _FakeBox:
    def __init__(self, cls_id, conf, xyxyn):
        self.cls = [cls_id]
        self.conf = [conf]
        self.xyxyn = [xyxyn]


class _FakeRes:
    def __init__(self, boxes):
        self.boxes = boxes
        self.names = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck",
                      8: "boat", 16: "cat"}


def _mk_boxes():
    return [
        _FakeBox(2, 0.90, [0.10, 0.10, 0.50, 0.50]),   # car  (kept)
        _FakeBox(8, 0.90, [0.60, 0.10, 0.90, 0.50]),   # boat (COCO, must be dropped)
        _FakeBox(16, 0.90, [0.10, 0.60, 0.50, 0.90]),  # cat  (COCO, must be dropped)
        _FakeBox(5, 0.30, [0.60, 0.60, 0.90, 0.90]),   # bus  (low conf, dropped)
        _FakeBox(3, 0.90, [0.55, 0.55, 0.58, 0.58]),   # motorcycle (tiny box, dropped)
    ]


def _make_detector(monkeypatch):
    det = VehicleDetector()
    all_boxes = _mk_boxes()

    def fake_model(frame, **kw):
        classes = kw.get("classes")
        conf_thr = kw.get("conf", 0.0)
        # Mimic ultralytics: honour the requested class filter and conf threshold.
        kept = [
            b for b in all_boxes
            if b.cls[0] in classes and b.conf[0] >= conf_thr
        ]
        return [_FakeRes(kept)]

    monkeypatch.setattr(det, "_model", fake_model)
    return det


def test_class_filter_uses_configured_vehicle_ids():
    det = VehicleDetector()
    # Shipped config restricts to COCO vehicle ids 2/3/5/7.
    assert det._vehicle_class_ids == [2, 3, 5, 7]


def test_non_vehicle_coco_classes_are_filtered_out(monkeypatch):
    det = _make_detector(monkeypatch)
    frame = np.zeros((100, 100, 3), np.uint8)
    detections, _ = det.detect(frame, frame_id=1, camera_id="cam_test")
    class_ids = {d.class_id for d in detections}
    # Only the real vehicle (car, id 2) survives; boat(8) and cat(16) are gone.
    assert class_ids == {2}
    assert detections[0].class_name == "car"


def test_confidence_threshold_filters_low_conf(monkeypatch):
    det = _make_detector(monkeypatch)
    frame = np.zeros((100, 100, 3), np.uint8)
    detections, _ = det.detect(frame, camera_id="cam_test")
    # bus had conf 0.30 < 0.45 threshold → excluded.
    assert all(d.confidence >= det._cfg.confidence_threshold for d in detections)


def test_min_box_area_filter(monkeypatch):
    det = _make_detector(monkeypatch)
    frame = np.zeros((100, 100, 3), np.uint8)
    detections, _ = det.detect(frame, camera_id="cam_test")
    # motorcycle box ~3x3 px (area 9) < min_box_area (100) → excluded.
    assert all(d.class_name != "motorcycle" for d in detections)


def test_detection_result_helpers():
    r = DetectionResult(bbox=[0.1, 0.2, 0.5, 0.6], confidence=0.9,
                         class_id=2, class_name="car")
    assert r.to_dict()["class_name"] == "car"
    px = r.get_pixel_bbox(100, 200)
    assert px == (10, 40, 50, 120)
    frame = np.zeros((200, 100, 3), np.uint8)
    crop = r.crop_from_frame(frame, padding=0)
    assert crop.shape == (80, 40, 3)


def test_detection_result_custom_id_mapping():
    # Custom fine-tuned model ids (12 -> suv) still resolve a name if present.
    assert VEHICLE_CLASS_IDS.get(12) == "suv"
    assert VEHICLE_CLASS_IDS.get(2) == "car"
