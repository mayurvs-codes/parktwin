"""
Integration tests — Integration Layer (Module 3)
=============================================
Verifies the unified gateway consumes Module 1 (Vehicle Recognition) and
Module 2 (Parking Intelligence) correctly, that the integration event bus
emits the 8 canonical events, that the synchronizer repairs state, and that
live updates are pushed to the WebSocket channels.

No ML weights are loaded — Module 1 is faked exactly like the Module 2
suite. The REAL ``ParkingIntelligenceEngine`` is used through the
integration service.
"""

import base64
import os
import sqlite3
import time

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

import backend.api.dependencies as deps
import backend.app.app as app_module
from backend.app.app import app
from engine.pipeline import VehicleRecord
from modules.integration_layer.events.memory_bus import InMemoryEventBus
from modules.integration_layer.events.bus import INTEGRATION_EVENT_TYPES
from modules.integration_layer.services import registry
from modules.parking_intelligence import ParkingIntelligenceEngine
from modules.parking_intelligence.storage import crud as pcrud
from modules.parking_intelligence.storage.models import SlotState
from modules.vehicle_recognition.storage import crud as vcrud

from backend.database.session import AsyncSessionLocal, engine as db_engine

_DB_PATH = os.environ.get("DATABASE_URL", "").split(":///")[-1] or "./test_parktwin.db"


# ─── Fixtures / fakes ────────────────────────────────────────────────────────

def _reset_parking_tables():
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
                pass
        conn.commit()
    finally:
        conn.close()


def _fake_pipeline():
    class FakePipeline:
        is_ready = True

        def process_frame(self, frame, camera_id="CAM-01"):
            return list(_fake_pipeline._records)

        def get_stats(self):
            return {"initialized": True, "ocr_engine": "fake"}

    return FakePipeline()


def _fake_fp():
    class FakeFP:
        def start_all(self):
            pass

        def stop_all(self):
            pass

        def get_frame(self, cid):
            return None

        @property
        def active_cameras(self):
            return 0

        def add_camera(self, src):
            pass

        def remove_camera(self, cid):
            return True

    return FakeFP()


class RecordingManager:
    """Fake ConnectionManager that records broadcast calls (no sockets)."""

    def __init__(self):
        self.calls = []

    async def connect(self, ws, channel):
        pass

    async def disconnect(self, ws, channel):
        pass

    async def broadcast(self, channel, message):
        self.calls.append((channel, message))

    def channel_counts(self):
        return {}


def _b64_image():
    img = np.full((60, 200, 3), 255, np.uint8)
    ok, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(deps, "_pipeline_instance", _fake_pipeline())
    monkeypatch.setattr(deps, "_frame_processor_instance", _fake_fp())
    _fake_pipeline._records = []

    from modules.integration_layer.events.factory import reset_event_bus

    reset_event_bus(InMemoryEventBus())

    eng = ParkingIntelligenceEngine()
    eng._mapper._release_after = 1
    svc = registry.make_integration_service()
    svc.engine = eng
    svc.ws = RecordingManager()
    registry.reset_integration_service(svc)

    with TestClient(app) as c:
        _reset_parking_tables()
        yield c


def _records_for(*records):
    _fake_pipeline._records = list(records)


def _rec(tid, plate=None, bbox=(0.1, 0.1, 0.3, 0.3)):
    return VehicleRecord(
        tracking_id=tid,
        camera_id="camera_01",
        license_plate=plate,
        plate_confidence=0.95 if plate else 0.0,
        vehicle_type="Sedan",
        detection_confidence=0.9,
        bbox=list(bbox),
    )


# ─── Gateway: structure ─────────────────────────────────────────────────────────

def test_integration_routes_present(client):
    routes = {
        r.path
        for r in app.routes
        if hasattr(r, "path")
    }
    for expected in (
        "/integration/health",
        "/integration/vehicles",
        "/integration/slots",
        "/integration/sessions",
        "/integration/occupancy",
        "/integration/statistics",
        "/integration/events",
        "/integration/sync",
        "/integration/process-frame",
        "/integration/ws",
    ):
        assert expected in routes, f"Missing integration route: {expected}"


def test_future_module_routes_still_absent(client):
    routes = {
        r.path
        for r in app.routes
        if hasattr(r, "path")
    }
    # The integration layer must not reintroduce the forbidden exact paths.
    for excluded in ("/parking", "/owners", "/analytics", "/vehicles/reset", "/live"):
        assert excluded not in routes, f"Forbidden route present: {excluded}"


# ─── Gateway: reads ─────────────────────────────────────────────────────────────

def test_gateway_reads(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })

    h = client.get("/integration/health")
    assert h.status_code == 200
    assert h.json()["parking_engine_initialized"] is True

    occ = client.get("/integration/occupancy")
    assert occ.status_code == 200
    assert occ.json()["total_slots"] == 10

    slots = client.get("/integration/slots")
    assert slots.status_code == 200
    assert len(slots.json()) == 10

    sess = client.get("/integration/sessions", params={"active_only": True})
    assert sess.status_code == 200
    assert len(sess.json()) == 1

    stats = client.get("/integration/statistics")
    assert stats.status_code == 200
    assert stats.json()["active_sessions"] >= 1


# ─── Gateway: event flow (all 8 canonical events) ───────────────────────────

def test_gateway_process_frame_emits_events(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    r = client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert body["summary"]["active_vehicles"] == 1
    assert body["occupancy"]["occupied"] == 1

    types = {e["event_type"] for e in body["events"]}
    # Module 1 → VehicleDetected / VehicleTracked
    # Module 2 → VehicleParked / SessionStarted / SlotOccupied (+ re-emitted VehicleDetected)
    assert "VehicleDetected" in types
    assert "VehicleTracked" in types
    assert "VehicleParked" in types
    assert "SessionStarted" in types
    assert "SlotOccupied" in types

    # The bus (and /events endpoint) carries the canonical events.
    ev = client.get("/integration/events", params={"source": "integration"})
    assert ev.status_code == 200
    bus_types = {e["event_type"] for e in ev.json()["events"]}
    assert "VehicleParked" in bus_types


def test_gateway_exit_emits_exit_events(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    _records_for()  # vehicle departs
    r = client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    assert r.status_code == 200
    assert r.json()["occupancy"]["occupied"] == 0

    types = {e["event_type"] for e in r.json()["events"]}
    assert "VehicleExited" in types
    assert "SessionEnded" in types
    assert "SlotReleased" in types


# ─── Gateway: synchronizer ──────────────────────────────────────────────────────

def test_gateway_sync_endpoint(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })
    r = client.post("/integration/sync", params={"camera_id": "CAM-01"})
    assert r.status_code == 200
    assert "corrected" in r.json()


# ─── WebSocket: updates are pushed to the right channels ────────────────────────────────

def test_websocket_channels_receive_updates(client):
    svc = registry.get_integration_service()
    assert isinstance(svc.ws, RecordingManager)

    _records_for(_rec(1, plate="KA01AB1234"))
    client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "CAM-01",
    })

    channels = {ch for ch, _ in svc.ws.calls}
    assert "vehicles" in channels
    assert "occupancy" in channels
    assert "sessions" in channels
    assert "events" in channels

    # The events channel carried the canonical integration events.
    events_msgs = [m for ch, m in svc.ws.calls if ch == "events"]
    assert events_msgs
    emitted = {e["event_type"] for m in events_msgs for e in m["events"]}
    assert "VehicleParked" in emitted

    # D5 Phase 3: the live 'vehicles' payload carries Module 2's slot ownership.
    vehicles_msgs = [m for ch, m in svc.ws.calls if ch == "vehicles"]
    assert vehicles_msgs
    vehicles = vehicles_msgs[-1]["vehicles"]
    assert any(v["tracking_id"] == 1 and v["slot"] == "P01" for v in vehicles)


def test_websocket_endpoint_connects(client):
    # Smoke: the socket opens, accepts a heartbeat, and closes cleanly.
    with client.websocket_connect("/integration/ws?channel=events") as ws:
        ws.send_text("ping")
    assert True  # no exception == ok


# ─── Synchronizer: direct cross-module repair ────────────────────────────────

@pytest.fixture
async def db():
    await pcrud.init_module2_db(db_engine)
    async with AsyncSessionLocal() as s:
        await pcrud.seed_slots(s, None)
        await s.commit()
        yield s


async def test_sync_releases_dangling_occupied_slot(db):
    await pcrud.upsert_slot(db, {
        "slot_id": "P01", "camera_id": "CAM-01",
        "state": SlotState.OCCUPIED.value,
    })
    from modules.integration_layer.sync import Synchronizer

    rep = await Synchronizer().reconcile(db, camera_id="CAM-01")
    assert rep["released_dangling_slots"] >= 1
    assert rep["corrected"] >= 1
    slot = await pcrud.get_slot(db, "P01", "CAM-01")
    assert slot.state == SlotState.FREE


async def test_sync_links_session_to_vehicle(db):
    veh = await vcrud.create_vehicle(db, {
        "tracking_id": 999, "license_plate": "KA99ZZ9999",
    })
    await pcrud.open_session(db, {
        "session_uid": "PS-TEST1",
        "camera_id": "CAM-01",
        "slot_id": "P02",
        "license_plate": "KA99ZZ9999",
        "tracking_id": 999,
        "entry_time": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ),
        "is_active": True,
        "violation_flags": [],
    })
    from modules.integration_layer.sync import Synchronizer

    rep = await Synchronizer().reconcile(db, camera_id="CAM-01")
    assert rep["linked_vehicles"] >= 1
    sess = await pcrud.get_session(db, "PS-TEST1")
    assert sess.vehicle_id is not None
