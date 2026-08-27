"""
Unit tests — Analytics Date Range Query Parameters (Module 4)
============================================================
Verifies:
  1. With start/end: returns only data within the specified range.
  2. With no params: defaults to the last 24 hours.
  3. With end < start: returns HTTP status 422 Unprocessable Entity.
"""

from datetime import datetime, timedelta, timezone
import os
import tempfile

import pytest
from fastapi.testclient import TestClient

from backend.app.app import app
from backend.core.config import get_settings
from modules.analytics.services.analytics_service import AnalyticsService, _resolve_time_range
from modules.analytics.storage import AnalyticsStore


@pytest.fixture
def store():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(path)
    s = AnalyticsStore(db_path=path)
    return s


@pytest.fixture
def client():
    return TestClient(app)


def test_resolve_time_range_defaults():
    now = datetime.now(timezone.utc)
    start_dt, end_dt = _resolve_time_range(None, None)
    assert end_dt <= now + timedelta(seconds=5)
    assert abs((end_dt - start_dt).total_seconds() - 86400) < 5


def test_resolve_time_range_explicit():
    start = datetime(2026, 7, 20, 10, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 7, 25, 10, 0, 0, tzinfo=timezone.utc)
    s_dt, e_dt = _resolve_time_range(start, end)
    assert s_dt == start
    assert e_dt == end


@pytest.mark.asyncio
async def test_analytics_store_date_range_filtering(store):
    await store.init()
    t1 = "2026-07-20T10:00:00+00:00"
    t2 = "2026-07-24T12:00:00+00:00"
    t3 = "2026-07-28T14:00:00+00:00"

    await store.save_snapshot("occupancy", {"val": 1}, timestamp=t1)
    await store.save_snapshot("occupancy", {"val": 2}, timestamp=t2)
    await store.save_snapshot("occupancy", {"val": 3}, timestamp=t3)

    start = datetime(2026, 7, 22, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2026, 7, 26, 0, 0, 0, tzinfo=timezone.utc)

    history = await store.get_history("occupancy", start=start, end=end)
    assert len(history) == 1
    assert history[0]["payload"]["val"] == 2

    await store.close()


def test_api_analytics_date_range_endpoints(client):
    secret = get_settings().app.secret_key
    headers = {"x-api-key": secret}

    # 1. No params: returns 200 OK and default 24h query_start/query_end
    res = client.get("/analytics/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "query_start" in data
    assert "query_end" in data
    start_dt = datetime.fromisoformat(data["query_start"])
    end_dt = datetime.fromisoformat(data["query_end"])
    assert abs((end_dt - start_dt).total_seconds() - 86400) < 10

    # 2. Valid start and end params: returns 200 OK
    start_str = "2026-07-20T00:00:00Z"
    end_str = "2026-07-25T00:00:00Z"
    res = client.get(f"/analytics/dashboard?start={start_str}&end={end_str}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["query_start"] == "2026-07-20T00:00:00+00:00"
    assert data["query_end"] == "2026-07-25T00:00:00+00:00"

    # 3. Invalid range end < start: returns 422
    invalid_start = "2026-07-25T00:00:00Z"
    invalid_end = "2026-07-20T00:00:00Z"
    res = client.get(f"/analytics/dashboard?start={invalid_start}&end={invalid_end}", headers=headers)
    assert res.status_code == 422

    # Check individual endpoints return 422 on end < start
    for endpoint in ["occupancy", "traffic", "utilization", "trends"]:
        res_ep = client.get(f"/analytics/{endpoint}?start={invalid_start}&end={invalid_end}", headers=headers)
        assert res_ep.status_code == 422
