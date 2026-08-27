"""
Integration tests — Analytics Engine API (Module 4)
===================================================
Verifies the ``/analytics/*`` REST endpoints compute correctly from the
Integration Layer (no direct Module 1/2 access) and store trend history.

Follows the exact Integration Layer test pattern: a faked Module 1 pipeline,
the REAL ``ParkingIntelligenceEngine`` reached through the Integration
Service, and ``TestClient`` (so no ML weights are loaded).
"""

import base64
import os
import sqlite3
import tempfile

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
from modules.integration_layer.services import registry as il_registry
from modules.parking_intelligence import ParkingIntelligenceEngine
from modules.analytics.services import registry as an_registry

from backend.database.session import engine as db_engine  # noqa: F401


def _reset_parking_tables():
    raw_url = os.environ.get("DATABASE_URL", "")
    if ":///" in raw_url:
        db_path = raw_url.split(":///")[-1]
    else:
        db_path = "./test_parktwin.db"
    conn = sqlite3.connect(db_path)
    try:
        for tbl in ("parking_events", "parking_sessions", "parking_slots", "reports", "analytics_snapshots"):
            try:
                conn.execute(f"DELETE FROM {tbl}")
            except sqlite3.OperationalError:
                pass
        conn.commit()
    finally:
        conn.close()

    for env_var, tbl in (("REPORTS_DB_PATH", "reports"), ("ANALYTICS_DB_PATH", "analytics_snapshots")):
        p = os.environ.get(env_var)
        if p and os.path.exists(p):
            c = sqlite3.connect(p)
            try:
                c.execute(f"DELETE FROM {tbl}")
                c.commit()
            except sqlite3.OperationalError:
                pass
            finally:
                c.close()


def _fake_pipeline():
    class FakePipeline:
        is_ready = True

        def process_frame(self, frame, camera_id="camera_01"):
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

    # Isolate the analytics history DB so the repo default is never touched.
    fd, an_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(an_path)
    monkeypatch.setenv("ANALYTICS_DB_PATH", an_path)

    from modules.integration_layer.events.factory import reset_event_bus

    reset_event_bus(InMemoryEventBus())

    eng = ParkingIntelligenceEngine()
    eng._mapper._release_after = 1
    svc = il_registry.make_integration_service()
    svc.engine = eng
    svc.ws = RecordingManager()
    il_registry.reset_integration_service(svc)
    an_registry.reset_analytics_service(None)

    with TestClient(app) as c:
        _reset_parking_tables()
        try:
            yield c
        finally:
            an_registry.reset_analytics_service(None)
            try:
                os.unlink(an_path)
            except OSError:
                pass


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


# ─── Routing ─────────────────────────────────────────────────────────────────

def test_analytics_routes_present(client):
    routes = {r.path for r in app.routes if hasattr(r, "path")}
    for expected in (
        "/analytics/occupancy",
        "/analytics/traffic",
        "/analytics/utilization",
        "/analytics/trends",
        "/analytics/dashboard",
    ):
        assert expected in routes, f"Missing analytics route: {expected}"


def test_bare_analytics_route_absent(client):
    """Must not reintroduce the forbidden exact ``/analytics`` path."""
    routes = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/analytics" not in routes


# ─── Empty-state responses ───────────────────────────────────────────────────

def test_analytics_empty(client):
    occ = client.get("/analytics/occupancy")
    assert occ.status_code == 200
    body = occ.json()
    assert body["current_occupancy"] == 0
    assert body["total_slots"] == 10
    assert body["occupancy_percentage"] == 0.0

    traf = client.get("/analytics/traffic")
    assert traf.status_code == 200
    assert traf.json()["vehicle_entries"] == 0
    assert traf.json()["peak_hour"] is None

    util = client.get("/analytics/utilization")
    assert util.status_code == 200
    assert util.json()["turnover_rate"] == 0.0
    # all 5 slots unused → least-used lists zeros
    assert util.json()["least_used_slots"][0]["usage_count"] == 0

    trends = client.get("/analytics/trends")
    assert trends.status_code == 200
    assert trends.json()["duration_statistics"]["count"] == 0

    dash = client.get("/analytics/dashboard")
    assert dash.status_code == 200
    assert "occupancy" in dash.json()
    assert "traffic" in dash.json()
    assert "utilization" in dash.json()
    assert "trends" in dash.json()


# ─── Live data from the Integration Layer ────────────────────────────────────

def test_analytics_with_session(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    resp = client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "camera_01",
    })
    assert resp.status_code == 200

    occ = client.get("/analytics/occupancy").json()
    assert occ["current_occupancy"] >= 1
    assert occ["occupancy_percentage"] > 0.0
    assert occ["total_slots"] == 10

    traf = client.get("/analytics/traffic").json()
    assert traf["vehicle_entries"] >= 1
    assert traf["active_vehicles"] >= 1
    assert traf["vehicle_counts"]["distinct"] >= 1

    util = client.get("/analytics/utilization").json()
    assert util["used_slots"] >= 1
    assert util["most_used_slots"][0]["usage_count"] >= 1


def test_analytics_trends_history(client):
    # Generate a few snapshots via the dashboard, then read the timeline.
    for _ in range(3):
        client.get("/analytics/dashboard")

    trends = client.get("/analytics/trends").json()
    # After 3 dashboard calls, occupancy + traffic history should accumulate.
    assert len(trends["occupancy_timeline"]) >= 3
    assert len(trends["traffic_timeline"]) >= 3
    # Timelines are ascending by timestamp.
    ts = [p["timestamp"] for p in trends["occupancy_timeline"]]
    assert ts == sorted(ts)


def test_analytics_consumes_integration_only(client):
    """Sanity: analytics endpoints resolve without touching module internals."""
    # Drive one frame so there is data to analyze.
    _records_for(_rec(9, plate="KA09ZZ0009"))
    client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "camera_01",
    })

    for path in ("/analytics/occupancy", "/analytics/traffic",
                 "/analytics/utilization", "/analytics/trends", "/analytics/dashboard"):
        r = client.get(path)
        assert r.status_code == 200, f"{path} -> {r.status_code}"
