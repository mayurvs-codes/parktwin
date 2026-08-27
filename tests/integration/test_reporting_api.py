"""
Integration tests — Reporting Engine API (Module 5)
===================================================
Verifies the ``/reports*`` REST endpoints generate, store, list, retrieve, and
download reports (json/csv/pdf) from the Analytics Engine + Integration Layer,
without touching Module 1/2 internals.

Follows the exact Integration Layer / Analytics test pattern: a faked Module 1
pipeline, the REAL ``ParkingIntelligenceEngine`` reached through the Integration
Service, and ``TestClient`` (so no ML weights are loaded). The Reporting Engine
is wired only to the public Analytics + Integration service accessors.
"""

import base64
import json
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
from modules.analytics.services import registry as an_registry
from modules.reporting.services import registry as rep_registry

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

    fd, an_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(an_path)
    monkeypatch.setenv("ANALYTICS_DB_PATH", an_path)

    fd, rep_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(rep_path)
    monkeypatch.setenv("REPORTS_DB_PATH", rep_path)

    rep_dir = tempfile.mkdtemp()
    monkeypatch.setenv("REPORTS_DIR", rep_dir)

    from modules.integration_layer.events.factory import reset_event_bus
    from modules.parking_intelligence import ParkingIntelligenceEngine

    reset_event_bus(InMemoryEventBus())

    eng = ParkingIntelligenceEngine()
    eng._mapper._release_after = 1
    svc = il_registry.make_integration_service()
    svc.engine = eng
    svc.ws = RecordingManager()
    il_registry.reset_integration_service(svc)
    an_registry.reset_analytics_service(None)
    rep_registry.reset_reporting_service(None)

    with TestClient(app) as c:
        _reset_parking_tables()
        try:
            yield c
        finally:
            an_registry.reset_analytics_service(None)
            rep_registry.reset_reporting_service(None)
            try:
                os.unlink(rep_path)
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


def _process_frame(client):
    _records_for(_rec(1, plate="KA01AB1234"))
    resp = client.post("/integration/process-frame", json={
        "image_base64": _b64_image(), "camera_id": "camera_01",
    })
    assert resp.status_code == 200, resp.text


# ─── Routing ─────────────────────────────────────────────────────────────────

def test_report_routes_present(client):
    routes = {r.path for r in app.routes if hasattr(r, "path")}
    for expected in (
        "/reports",
        "/reports/history",
        "/reports/generate",
        "/reports/download",
    ):
        assert expected in routes, f"Missing reporting route: {expected}"
    # /reports/{id} registers as a path with a param.
    assert any(r.path == "/reports/{report_id}" for r in app.routes if hasattr(r, "path"))


# ─── Generation of every report type ──────────────────────────────────────────

@pytest.mark.parametrize("report_type", [
    "parking_summary", "occupancy", "vehicle", "parking_session", "violation", "analytics_summary",
])
def test_generate_each_type(client, report_type):
    _process_frame(client)
    resp = client.post("/reports/generate", json={
        "report_type": report_type, "formats": ["json", "csv", "pdf"],
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["type"] == report_type
    assert body["status"] == "generated"
    assert body["id"]
    assert set(body["formats"]) == {"json", "csv", "pdf"}
    assert "download_url" in body


def test_generate_unknown_type_400(client):
    resp = client.post("/reports/generate", json={"report_type": "bogus"})
    assert resp.status_code == 400


def test_generate_bad_format_400(client):
    resp = client.post("/reports/generate", json={
        "report_type": "parking_summary", "formats": ["docx"],
    })
    assert resp.status_code == 400


# ─── Listing / retrieval / history ────────────────────────────────────────────

def test_list_and_history(client):
    _process_frame(client)
    for rt in ("parking_summary", "occupancy"):
        r = client.post("/reports/generate", json={"report_type": rt})
        assert r.status_code == 200

    listed = client.get("/reports").json()
    assert len(listed) == 2
    assert all("id" in x and "type" in x for x in listed)

    hist = client.get("/reports/history").json()
    assert len(hist) == 2
    # newest first
    assert hist[0]["generated_at"] >= hist[1]["generated_at"]


def test_get_report_detail(client):
    _process_frame(client)
    rid = client.post("/reports/generate", json={
        "report_type": "analytics_summary",
    }).json()["id"]
    detail = client.get(f"/reports/{rid}").json()
    assert detail["id"] == rid
    assert detail["type"] == "analytics_summary"
    assert detail["content"]["report_type"] == "analytics_summary"


def test_get_missing_report_404(client):
    assert client.get("/reports/RPT_DOES_NOT_EXIST").status_code == 404


# ─── Download in every format ─────────────────────────────────────────────────

def test_download_json(client):
    _process_frame(client)
    rid = client.post("/reports/generate", json={
        "report_type": "parking_summary", "formats": ["json"],
    }).json()["id"]
    resp = client.get("/reports/download", params={"report_id": rid, "format": "json"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    data = resp.json()
    assert data["report_type"] == "parking_summary"
    assert data["panels"]


def test_download_csv(client):
    _process_frame(client)
    rid = client.post("/reports/generate", json={
        "report_type": "occupancy", "formats": ["csv"],
    }).json()["id"]
    resp = client.get("/reports/download", params={"report_id": rid, "format": "csv"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    body = resp.text
    assert "Occupancy" in body
    assert "," in body  # real CSV delimiters


def test_download_pdf(client):
    _process_frame(client)
    rid = client.post("/reports/generate", json={
        "report_type": "vehicle", "formats": ["pdf"],
    }).json()["id"]
    resp = client.get("/reports/download", params={"report_id": rid, "format": "pdf"})
    assert resp.status_code == 200
    assert "application/pdf" in resp.headers["content-type"]
    assert resp.content[:4] == b"%PDF"


def test_download_missing_404(client):
    resp = client.get("/reports/download", params={"report_id": "RPT_NOPE"})
    assert resp.status_code == 404


def test_download_renders_unexported_format(client):
    """A report saved as JSON can still be downloaded as PDF on demand."""
    _process_frame(client)
    rid = client.post("/reports/generate", json={
        "report_type": "violation", "formats": ["json"],
    }).json()["id"]
    resp = client.get("/reports/download", params={"report_id": rid, "format": "pdf"})
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"


# ─── Regeneration ─────────────────────────────────────────────────────────────

def test_regenerate_in_place(client):
    _process_frame(client)
    first = client.post("/reports/generate", json={
        "report_type": "parking_session", "formats": ["json"],
    }).json()
    rid = first["id"]
    # Regenerate the same report id (in place).
    again = client.post("/reports/generate", json={
        "report_type": "parking_session", "formats": ["json"], "report_id": rid,
    }).json()
    assert again["id"] == rid
    assert again["status"] == "generated"
    # History still contains exactly one record (regenerated, not duplicated).
    assert len(client.get("/reports/history").json()) == 1
