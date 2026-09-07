"""
Integration tests — Parking Intelligence API + Module 1 reuse (Module 2).

Uses FastAPI's TestClient with a *fake* Module 1 pipeline (so no model
weights are loaded) but the REAL ParkingIntelligenceEngine. This proves:
  - Module 1 ``VehicleRecord`` outputs are consumed by Module 2 correctly.
  - Slots are seeded, sessions open on arrival and close on departure.
  - Occupancy, events, and statistics are produced and queryable.
  - Slot mapping stays stable across frames.
"""

import base64

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

import os
import sqlite3

import backend.api.dependencies as deps
import backend.api.routers.parking as parking_mod
from backend.app.app import app
from engine.pipeline import VehicleRecord
from modules.integration_layer.services.registry import get_integration_service
from modules.parking_intelligence import ParkingIntelligenceEngine

_DB_PATH = os.environ.get("DATABASE_URL", "").split(":///")[-1] or "./test_parktwin.db"


def _reset_parking_tables():
    """Delete all Module 2 rows so each test starts from a clean slate."""
    raw_url = os.environ.get("DATABASE_URL", "")
    if ":///" in raw_url:
        db_path = raw_url.split(":///")[-1]
    else:
        db_path = "./test_parktwin.db"
    conn = sqlite3.connect(db_path)
    try:
        for tbl in ("parking_events", "parking_sessions", "parking_slots"):
            try:
                conn.execute(f"DELETE FROM {tbl}")
            except sqlite3.OperationalError:
                pass  # table not created yet on first run
        conn.commit()
    finally:
        conn.close()


def _fake_pipeline():
    class FakePipeline:
        is_ready = True

        def process_frame(self, frame, camera_id="CAM-01"):
            # The caller passes the desired record set via a thread-local hook.
            return list(_fake_pipeline._records)

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


def _b64_image():
    img = np.full((60, 200, 3), 255, np.uint8)
    ok, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


@pytest.fixture
def client(monkeypatch):
    # Fake Module 1 pipeline + frame processor.
    monkeypatch.setattr(deps, "_pipeline_instance", _fake_pipeline())
    monkeypatch.setattr(deps, "_frame_processor_instance", _fake_frame_processor())
    _fake_pipeline._records = []
    # Fresh Module 2 engine (isolated mapper/event state per test). D10: the
    # engine is owned by IntegrationService, so inject it there instead of the
    # removed router-local global.
    eng = ParkingIntelligenceEngine()
    eng._mapper._release_after = 1  # make departures deterministic
    integration = get_integration_service()
    integration.engine = eng

    with TestClient(app) as c:
        _reset_parking_tables()
        yield c


def _records_for(*records):
    _fake_pipeline._records = list(records)


def _rec(tid, plate=None, bbox=(0.1, 0.1, 0.3, 0.3)):
    return VehicleRecord(
        tracking_id=tid, camera_id="camera_01",
        license_plate=plate, plate_confidence=0.95 if plate else 0.0,
        vehicle_type="Sedan", detection_confidence=0.9, bbox=list(bbox),
    )


def test_slots_seeded_on_first_use(client):
    r = client.get("/parking/occupancy")
    assert r.status_code == 200
    body = r.json()
    assert body["total_slots"] >= 1
    # camera_01 has 10 configured slots in settings.yaml.
    assert body["total_slots"] == 10


def test_slots_list_and_filter(client):
    r = client.get("/parking/slots")
    assert r.status_code == 200
    slots = r.json()
    assert len(slots) == 10
    assert any(s["slot_id"] == "P01" for s in slots)

    r2 = client.get("/parking/slots", params={"state": "free"})
    assert r2.status_code == 200
    assert all(s["state"] == "free" for s in r2.json())


def test_process_frame_opens_session_and_emits_events(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    r = client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["summary"]["active_vehicles"] == 1
    assert body["occupancy"]["occupied"] == 1
    assert body["occupancy"]["free"] == 9

    # D5 Phase 2: ingest_frame return carries Module 2's SlotAssignment and
    # it serializes cleanly over REST (a 500 here would mean it did not).
    assignment = body["summary"]["assignment"]
    assert isinstance(assignment, dict)
    assert assignment["camera_id"] == "CAM-01"
    # JSON keys are strings; the wire format carries track_id as "1".
    assert assignment["assignments"] == {"1": "P01"}
    assert assignment["newly_assigned"] == {"1": "P01"}

    types = {e["event_type"] for e in body["events"]}
    assert "vehicle_entered" in types
    assert "vehicle_parked" in types
    assert "slot_occupied" in types

    # A session is active.
    s = client.get("/parking/sessions", params={"active_only": True})
    assert s.status_code == 200


def test_engine_exposes_current_assignment_read_only(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    r = client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r.status_code == 200

    # Read-only lookup reflects the live mapping without a second ingest.
    eng = get_integration_service().engine
    assert eng.get_current_assignment("CAM-01", 1) == "P01"
    assert eng.get_current_assignment("CAM-01", 999) is None


def test_mapping_stable_across_frames(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    sess1 = client.get("/parking/sessions", params={"active_only": True}).json()
    slot_id = sess1[0]["slot_id"]
    # Second frame, same vehicle, slightly moved bbox.
    _records_for(_rec(1, plate="KA01AB1234", bbox=(0.12, 0.12, 0.32, 0.32)))
    r2 = client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r2.status_code == 200
    # Still exactly one active session, same slot assignment (no flapping).
    s = client.get("/parking/sessions", params={"active_only": True})
    assert len(s.json()) == 1
    assert s.json()[0]["slot_id"] == slot_id


def test_vehicle_departure_closes_session(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    # Next frame: vehicle gone -> released (release_after=1).
    _records_for()
    r = client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r.status_code == 200
    assert r.json()["occupancy"]["occupied"] == 0
    assert r.json()["occupancy"]["free"] == 10

    s = client.get("/parking/sessions", params={"active_only": True})
    assert s.json() == []  # session closed

    events = client.get("/parking/events").json()
    etypes = {e["event_type"] for e in events}
    assert "vehicle_left" in etypes
    assert "slot_released" in etypes


def test_vehicle_reidentified_event(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    # Same plate, brand-new track id -> re-identified.
    _records_for(_rec(2, plate="KA01AB1234"))
    r = client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    etypes = {e["event_type"] for e in r.json()["events"]}
    assert "vehicle_reidentified" in etypes


def test_statistics_endpoint(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/parking/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    r = client.get("/parking/statistics")
    assert r.status_code == 200
    body = r.json()
    assert body["active_sessions"] >= 1
    assert body["total_events"] >= 1
    assert "events" in body


def test_patch_slot_reserved(client):
    r = client.patch("/parking/slots/P01", json={"is_reserved": True, "reserved_for": "OWNER1"})
    assert r.status_code == 200
    assert r.json()["is_reserved"] is True
    assert r.json()["reserved_for"] == "OWNER1"
    # Occupancy now counts P01 as reserved.
    occ = client.get("/parking/occupancy").json()
    assert occ["reserved"] == 1


def test_slot_not_found(client):
    r = client.get("/parking/slots/NOPE")
    assert r.status_code == 404
