"""
API integration tests (Module 1 — Task 5).

Uses FastAPI's TestClient. The heavy AI singletons (pipeline, frame processor)
are replaced with lightweight fakes so no model weights are downloaded and no
camera threads are spawned. Validates routing, response shapes, DB writes,
and exception handling.
"""

import base64

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

import backend.api.dependencies as deps
from backend.app.app import app
from modules.vehicle_recognition.fusion.plate_formatter import PlateFormatter
from modules.vehicle_recognition.ocr.ocr_engine import OCRResult
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetection
from engine.pipeline import VehicleRecord


def _fake_pipeline():
    class _PlateDet:
        def detect(self, img):
            return [PlateDetection(bbox=[0.0, 0.0, 1.0, 1.0], confidence=0.9)], 5.0

    class _OCR:
        def read(self, crop, enhance=True):
            return OCRResult("KA01AB1234", 0.95, "fake", ["KA01AB1234"])

    class FakePipeline:
        is_ready = True
        _plate_detector = _PlateDet()
        _ocr = _OCR()
        _formatter = PlateFormatter()

        def process_frame(self, frame, camera_id="CAM-01"):
            r = VehicleRecord(
                tracking_id=1, camera_id=camera_id,
                license_plate="KA01AB1234", plate_raw="KA01AB1234",
                plate_confidence=0.95, vehicle_type="Sedan",
                brand="Unknown", color="White",
                bbox=[0.1, 0.1, 0.9, 0.9],
            )
            return [r]

        def get_stats(self):
            return {"initialized": True, "ocr_engine": "fake"}

    return FakePipeline()


def _fake_frame_processor():
    class FakeFP:
        def start_all(self): pass
        def stop_all(self): pass
        def get_frame(self, cid): return None
        @property
        def active_cameras(self): return 0
        def add_camera(self, src): pass
        def remove_camera(self, cid): return True

    return FakeFP()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(deps, "_pipeline_instance", _fake_pipeline())
    monkeypatch.setattr(deps, "_frame_processor_instance", _fake_frame_processor())
    with TestClient(app) as c:
        yield c


def _b64_image():
    img = np.full((60, 200, 3), 255, np.uint8)
    ok, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


def test_health_endpoint(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert body["database"] == "connected"
    assert body["pipeline_ready"] is True


def test_health_stats_endpoint(client):
    r = client.get("/health/stats")
    assert r.status_code == 200
    assert r.json()["initialized"] is True


def test_cameras_seeded(client):
    r = client.get("/cameras")
    assert r.status_code == 200
    assert any(c["camera_id"] == "CAM-01" for c in r.json())


def test_process_frame_endpoint(client):
    r = client.post("/vehicles/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert len(body["records"]) == 1
    assert body["records"][0]["vehicle_number"] == "KA01AB1234"


def test_recognize_endpoint(client):
    r = client.post("/vehicles/recognize", json={"image_base64": _b64_image()})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["vehicles"][0]["license_plate"] == "KA01AB1234"


def test_process_frame_invalid_base64(client):
    r = client.post("/vehicles/process-frame", json={"image_base64": "not-base64!!"})
    assert r.status_code == 400


def test_vehicles_listing_returns_list(client):
    r = client.get("/vehicles")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
