"""
Unit tests for Prometheus metrics (/metrics), telemetry, and request_id logging middleware.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.app import app
from backend.auth.token import create_access_token


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers():
    token = create_access_token("admin", "admin")
    return {"Authorization": f"Bearer {token}"}


def test_metrics_endpoint(client):
    """Verify GET /metrics returns 200 and custom Prometheus metrics."""
    response = client.get("/metrics")
    assert response.status_code == 200
    content = response.text
    assert "parktwin_parking_occupancy_rate" in content
    assert "parktwin_vehicles_detected_total" in content
    assert "parktwin_frame_processing_duration_seconds" in content


def test_health_stats_extended(client, admin_headers):
    """Verify GET /health/stats includes telemetry fields."""
    response = client.get("/health/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "uptime_seconds" in data
    assert "request_count_last_minute" in data
    assert "error_count_last_minute" in data


def test_request_id_header(client):
    """Verify X-Request-ID header is set on all HTTP responses."""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-request-id" in response.headers
    req_id = response.headers["x-request-id"]
    assert len(req_id) > 0
