"""
Integration tests for the Settings router (safe read-only settings).
"""

import pytest
from fastapi.testclient import TestClient

import backend.api.dependencies as deps
from backend.app.app import app


@pytest.fixture
def client(monkeypatch):
    class FakePipeline:
        is_ready = True

        def get_stats(self):
            return {"initialized": True}

    class FakeFP:
        def start_all(self):
            pass

        def stop_all(self):
            pass

        @property
        def active_cameras(self):
            return 0

    monkeypatch.setattr(deps, "_pipeline_instance", FakePipeline())
    monkeypatch.setattr(deps, "_frame_processor_instance", FakeFP())
    with TestClient(app) as c:
        yield c


def test_get_public_settings_app_name_and_no_secret_key(client):
    """GET /settings/public returns 200, contains app.name, and NOT secret_key."""
    response = client.get("/settings/public")
    assert response.status_code == 200
    data = response.json()

    assert "app" in data
    assert "name" in data["app"]
    assert data["app"]["name"] == "ParkTwin AI"
    assert "secret_key" not in data["app"]
    assert "secret_key" not in data


def test_get_public_settings_parking_camera_ids_is_list(client):
    """GET /settings/public response.parking.camera_ids is a list."""
    response = client.get("/settings/public")
    assert response.status_code == 200
    data = response.json()

    assert "parking" in data
    assert "camera_ids" in data["parking"]
    assert isinstance(data["parking"]["camera_ids"], list)


def test_get_public_settings_no_password_or_key_fields(client):
    """GET /settings/public contains no password or key fields in body."""
    response = client.get("/settings/public")
    assert response.status_code == 200
    data = response.json()

    def check_no_sensitive_keys(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                lower_k = k.lower()
                assert "secret" not in lower_k, f"Forbidden field '{k}' found in settings"
                assert "password" not in lower_k, f"Forbidden field '{k}' found in settings"
                assert lower_k != "database_url", f"Forbidden field '{k}' found in settings"
                assert lower_k != "redis_url", f"Forbidden field '{k}' found in settings"
                check_no_sensitive_keys(v)
        elif isinstance(obj, list):
            for item in obj:
                check_no_sensitive_keys(item)

    check_no_sensitive_keys(data)


def test_get_health_extended(client):
    """GET /settings/health-extended returns extended health info."""
    response = client.get("/settings/health-extended")
    assert response.status_code == 200
    data = response.json()

    assert "status" in data
    assert "version" in data
    assert "device" in data
    assert "camera_count" in data
    assert isinstance(data["camera_count"], int)
