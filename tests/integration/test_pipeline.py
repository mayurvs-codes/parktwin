"""
Integration test for the end-to-end ANPR pipeline (Module 1 — Task 5).

The heavy model backends (YOLO detector, plate detector, OCR) are replaced with
lightweight fakes so the test runs offline and fast, while the *real* tracker,
classifiers, plate formatter (fusion), and snapshot writer are exercised. This
validates the wiring: Detection -> Tracking -> Classification -> Plate Detection
-> OCR -> Fusion -> Snapshot -> VehicleRecord assembly.
"""

import numpy as np
import pytest

import cv2

from engine.pipeline import ParkTwinPipeline, VehicleRecord
from modules.parking_intelligence.mapping.slot_mapper import SlotAssignment
from modules.vehicle_recognition.detection.vehicle_detector import (
    DetectionResult,
    VehicleDetector,
)
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetection
from modules.vehicle_recognition.ocr.ocr_engine import OCRResult
from modules.vehicle_recognition.fusion.plate_formatter import PlateFormatter


def _white_frame():
    return np.full((480, 640, 3), 255, np.uint8)


@pytest.fixture
def pipeline(monkeypatch, tmp_path):
    p = ParkTwinPipeline()
    p._initialized = True  # skip heavy model loading

    def fake_detect(frame, frame_id=0, camera_id="x"):
        d = DetectionResult(
            bbox=[0.1, 0.1, 0.4, 0.4], confidence=0.9,
            class_id=2, class_name="car", frame_id=frame_id,
        )
        return [d], 10.0

    def fake_plate_detect(crop):
        return [PlateDetection(bbox=[0.0, 0.0, 1.0, 1.0], confidence=0.9)], 5.0

    p._detector = VehicleDetector()
    p._detector._model = lambda *a, **k: None
    monkeypatch.setattr(p._detector, "detect", fake_detect)
    monkeypatch.setattr(p._plate_detector, "detect", fake_plate_detect)
    # Keep the real formatter to validate the fusion path.
    p._formatter = PlateFormatter()
    # Stub OCR so no engine weights are loaded.
    monkeypatch.setattr(
        p._ocr, "read",
        lambda crop, enhance=True: OCRResult(
            "ka 01 ab 1234", 0.95, "fake", ["ka 01 ab 1234"]
        ),
    )
    p._snapshots_dir = tmp_path
    return p


def test_pipeline_full_flow_with_plate(pipeline):
    frame = _white_frame()
    records = pipeline.process_frame(frame, camera_id="cam_test")

    assert len(records) == 1
    rec = records[0]
    # Tracking assigned a stable id.
    assert rec.tracking_id == 1
    # OCR fusion normalized the messy raw text.
    assert rec.license_plate == "KA01AB1234"
    assert rec.plate_raw == "ka 01 ab 1234"
    assert rec.plate_format == "indian_standard"
    assert 0.0 <= rec.plate_confidence <= 1.0
    # Classification ran (real recognizers on the white crop).
    assert rec.vehicle_type == "Sedan"
    assert rec.color == "White"
    assert rec.brand == "Unknown"
    # Snapshot for the plate was saved.
    assert rec.plate_snapshot_path is not None
    from pathlib import Path
    assert Path(rec.plate_snapshot_path).exists()


def test_pipeline_no_plate_path(pipeline, monkeypatch):
    # Force OCR to miss.
    monkeypatch.setattr(
        pipeline._ocr, "read",
        lambda crop, enhance=True: None,
    )
    records = pipeline.process_frame(_white_frame(), camera_id="cam_test")
    assert len(records) == 1
    assert records[0].license_plate is None
    assert records[0].plate_snapshot_path is None


def test_pipeline_confidence_threshold_rejects_low_ocr(pipeline, monkeypatch):
    # OCR returns text but below the configured confidence threshold.
    monkeypatch.setattr(
        pipeline._ocr, "read",
        lambda crop, enhance=True: OCRResult("ka 01 ab 1234", 0.4, "fake", ["ka 01 ab 1234"]),
    )
    records = pipeline.process_frame(_white_frame(), camera_id="cam_test")
    assert records[0].license_plate is None


def test_pipeline_stable_ids_across_frames(pipeline):
    frame = _white_frame()
    ids = set()
    for f in range(5):
        records = pipeline.process_frame(frame, camera_id="cam_test")
        ids.update(r.tracking_id for r in records)
    assert ids == {1}


def test_pipeline_record_serializes(pipeline):
    records = pipeline.process_frame(_white_frame(), camera_id="cam_test")
    d = records[0].to_api_dict()
    assert d["tracking_id"] == 1
    assert d["vehicle_number"] == "KA01AB1234"
    assert "bbox" in d


def test_draw_annotations_prefers_module2_slot_assignment(monkeypatch):
    """D5 Phase 5: snapshot annotation slot comes from Module 2 SlotAssignment.

    When a SlotAssignment is supplied, the slot label must use Module 2's
    authoritative slot and must NOT fall back to Module 1's ``rec.slot``.
    """
    texts: list = []

    def _capture_put_text(img, text, *args, **kwargs):
        texts.append(text)
        return img

    monkeypatch.setattr(cv2, "putText", _capture_put_text)

    rec = VehicleRecord(
        tracking_id=1,
        camera_id="c",
        vehicle_type="Sedan",
        color="White",
        slot="MODULE1_LEGACY_SLOT",  # Module 1 slot — must be overridden
        bbox=[0.1, 0.1, 0.4, 0.4],
    )
    assignment = SlotAssignment(camera_id="c", assignments={1: "P01"})

    frame = _white_frame()
    ParkTwinPipeline().draw_annotations(frame, [rec], assignment=assignment)

    assert any("P01" in t for t in texts), "Module 2 slot should be annotated"
    assert not any(
        "MODULE1_LEGACY_SLOT" in t for t in texts
    ), "Module 1 slot must not leak into the annotation"


def test_draw_annotations_falls_back_to_record_slot_without_assignment(monkeypatch):
    """Without a Module 2 assignment, the annotation keeps Module 1's slot (fallback)."""
    texts: list = []

    def _capture_put_text(img, text, *args, **kwargs):
        texts.append(text)
        return img

    monkeypatch.setattr(cv2, "putText", _capture_put_text)

    rec = VehicleRecord(
        tracking_id=1,
        camera_id="c",
        vehicle_type="Sedan",
        color="White",
        slot="MODULE1_SLOT",
        bbox=[0.1, 0.1, 0.4, 0.4],
    )

    ParkTwinPipeline().draw_annotations(_white_frame(), [rec])

    assert any("MODULE1_SLOT" in t for t in texts)
