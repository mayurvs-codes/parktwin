"""
Unit tests — Analytics Engine calculators (Module 4)
====================================================
Pure-function tests for the occupancy / traffic / utilization / trends
calculators and the AnalyticsStore. No DB, no Module 1/2, no Integration
Layer — just the Integration-Layer-shaped DTO dicts the calculators accept.
"""

import os
import tempfile

import pytest

from modules.analytics.metrics.base import mean, median, percentile, safe_div, round2
from modules.analytics.occupancy import compute_occupancy
from modules.analytics.traffic import compute_traffic
from modules.analytics.utilization import compute_utilization
from modules.analytics.trends import (
    build_occupancy_timeline,
    build_traffic_timeline,
    compute_duration_statistics,
    compute_session_statistics,
)
from modules.analytics.storage import AnalyticsStore


# ─── Sample Integration-Layer-shaped DTOs ────────────────────────────────────

OCCUPANCY = {
    "total_slots": 5,
    "free": 1,
    "occupied": 3,
    "reserved": 1,
    "unknown": 0,
    "occupancy_rate": 0.6,
    "per_camera": {
        "camera_01": {"free": 1, "occupied": 3, "reserved": 1, "unknown": 0, "total": 5}
    },
}

SLOTS = [
    {"slot_id": "P01", "camera_id": "camera_01", "zone": "general", "state": "occupied", "is_reserved": False},
    {"slot_id": "P02", "camera_id": "camera_01", "zone": "general", "state": "free", "is_reserved": False},
    {"slot_id": "P03", "camera_id": "camera_01", "zone": "general", "state": "occupied", "is_reserved": False},
    {"slot_id": "P04", "camera_id": "camera_01", "zone": "general", "state": "reserved", "is_reserved": True},
    {"slot_id": "P05", "camera_id": "camera_01", "zone": "general", "state": "free", "is_reserved": False},
]

SESSIONS = [
    {
        "session_uid": "s1", "slot_id": "P01", "license_plate": "KA01AB1234",
        "tracking_id": 1, "entry_time": "2026-07-16T08:15:00+00:00",
        "exit_time": "2026-07-16T09:15:00+00:00", "duration_seconds": 3600.0, "is_active": False,
    },
    {
        "session_uid": "s2", "slot_id": "P03", "license_plate": "KA02CD5678",
        "tracking_id": 2, "entry_time": "2026-07-16T08:45:00+00:00",
        "exit_time": None, "duration_seconds": 0.0, "is_active": True,
    },
    {
        "session_uid": "s3", "slot_id": "P01", "license_plate": "KA01AB1234",
        "tracking_id": 1, "entry_time": "2026-07-16T10:05:00+00:00",
        "exit_time": "2026-07-16T10:35:00+00:00", "duration_seconds": 1800.0, "is_active": False,
    },
    {
        "session_uid": "s4", "slot_id": "P02", "license_plate": None,
        "tracking_id": 7, "entry_time": "2026-07-16T22:05:00+00:00",
        "exit_time": "2026-07-16T22:20:00+00:00", "duration_seconds": 900.0, "is_active": False,
    },
]

EVENTS = [
    {"event_type": "vehicle_parked", "timestamp": "2026-07-16T08:15:00+00:00"},
    {"event_type": "vehicle_parked", "timestamp": "2026-07-16T08:45:00+00:00"},
    {"event_type": "vehicle_left", "timestamp": "2026-07-16T09:15:00+00:00"},
    {"event_type": "vehicle_left", "timestamp": "2026-07-16T10:35:00+00:00"},
]

STATS = {
    "active_sessions": 1,
    "total_sessions": 4,
    "average_duration_seconds": 2100.0,
}


# ─── metrics.base ─────────────────────────────────────────────────────────────

def test_safe_div_and_round():
    assert safe_div(3, 0, default=-1) == -1
    assert round2(0.606) == 0.61
    assert round2(None) == 0.0


def test_mean_median_percentile():
    vals = [10.0, 20.0, 30.0, 40.0]
    assert mean(vals) == 25.0
    assert median(vals) == 25.0
    # nearest-rank percentile: rank = ceil(P/100 * N)
    assert percentile(vals, 25) == 10.0   # rank 1
    assert percentile(vals, 50) == 20.0   # rank 2 (upper-middle)
    assert percentile(vals, 90) == 40.0   # rank 4
    assert percentile([], 50) == 0.0
    assert mean([]) == 0.0


# ─── occupancy ────────────────────────────────────────────────────────────────

def test_compute_occupancy():
    r = compute_occupancy(OCCUPANCY, SLOTS)
    assert r["current_occupancy"] == 3
    assert r["occupancy_percentage"] == 60.0
    assert r["free_slots"] == 1
    assert r["reserved_slots"] == 1
    assert r["total_slots"] == 5
    # single-camera fleet → average equals overall rate
    assert r["average_occupancy"] == 0.6
    assert r["average_occupancy_percentage"] == 60.0


def test_compute_occupancy_empty():
    r = compute_occupancy({"total_slots": 0, "occupied": 0}, [])
    assert r["current_occupancy"] == 0
    assert r["occupancy_percentage"] == 0.0
    assert r["average_occupancy"] == 0.0


# ─── traffic ──────────────────────────────────────────────────────────────────

def test_compute_traffic():
    r = compute_traffic(SESSIONS, EVENTS)
    assert r["vehicle_entries"] == 4
    assert r["vehicle_exits"] == 3
    assert r["active_vehicles"] == 1
    # peak hour = 08 (two entries at 08:15 and 08:45)
    assert r["peak_hour"] == 8
    assert r["peak_hour_entries"] == 2
    assert r["hourly_traffic"][8] == 2
    assert r["hourly_traffic"][10] == 1
    assert r["hourly_traffic"][22] == 1
    assert sum(r["hourly_traffic"].values()) == 4
    # daily timeline has one day
    assert len(r["daily_traffic"]) == 1
    assert r["daily_traffic"][0]["entries"] == 4
    # distinct vehicles: 2 plates + 1 track-only
    assert r["vehicle_counts"]["distinct"] == 3
    assert r["vehicle_counts"]["total"] == 4
    # event cross-check
    assert r["event_crosscheck"]["entries"] == 2
    assert r["event_crosscheck"]["exits"] == 2


def test_compute_traffic_empty():
    r = compute_traffic([], [])
    assert r["vehicle_entries"] == 0
    assert r["peak_hour"] is None
    assert sum(r["hourly_traffic"].values()) == 0
    assert r["vehicle_counts"]["total"] == 0


# ─── utilization ──────────────────────────────────────────────────────────────

def test_compute_utilization():
    r = compute_utilization(SESSIONS, SLOTS, STATS)
    # 4 slots used (P01, P02, P03); P04 never used → 4/5 used
    assert r["used_slots"] == 3  # P01, P02, P03 have sessions; P04 none
    assert r["total_slots"] == 5
    assert r["slot_utilization"] == round2(3 / 5)
    # avg of [3600, 1800, 900] (only sessions with duration_seconds)
    assert r["average_parking_duration_seconds"] == 2100.0
    assert r["average_parking_duration"] == "00:35:00"
    # most used = P01 (2 sessions)
    assert r["most_used_slots"][0]["slot_id"] == "P01"
    assert r["most_used_slots"][0]["usage_count"] == 2
    # least used lists zero-use slots first → P04
    assert r["least_used_slots"][0]["slot_id"] == "P04"
    assert r["least_used_slots"][0]["usage_count"] == 0
    # turnover = total sessions / total slots = 4/5
    assert r["turnover_rate"] == round2(4 / 5)
    # cross-check average duration matches stats
    assert r["statistics_crosscheck"]["average_duration_seconds"] == 2100.0


def test_compute_utilization_empty():
    r = compute_utilization([], SLOTS, {})
    assert r["slot_utilization"] == 0.0
    assert r["average_parking_duration_seconds"] == 0.0
    assert r["turnover_rate"] == 0.0
    # with no sessions, every slot is least-used with count 0
    assert all(item["usage_count"] == 0 for item in r["least_used_slots"])


# ─── trends ───────────────────────────────────────────────────────────────────

def test_trends_timelines():
    history = [
        {"timestamp": "2026-07-16T08:00:00+00:00", "payload": {"current_occupancy": 2, "occupancy_percentage": 40.0, "free_slots": 3, "reserved_slots": 0}},
        {"timestamp": "2026-07-16T09:00:00+00:00", "payload": {"current_occupancy": 3, "occupancy_percentage": 60.0, "free_slots": 2, "reserved_slots": 0}},
    ]
    occ = build_occupancy_timeline(history)
    assert [p["current_occupancy"] for p in occ] == [2, 3]
    assert occ[0]["timestamp"] == "2026-07-16T08:00:00+00:00"
    traf = build_traffic_timeline([
        {"timestamp": "2026-07-16T08:00:00+00:00", "payload": {"vehicle_entries": 1, "vehicle_exits": 0, "active_vehicles": 1}},
    ])
    assert traf[0]["vehicle_entries"] == 1


def test_trends_session_and_duration_stats():
    sess_stats = compute_session_statistics(SESSIONS, STATS)
    assert sess_stats["total_sessions"] == 4
    assert sess_stats["active_sessions"] == 1
    assert sess_stats["closed_sessions"] == 3
    assert sess_stats["average_duration_seconds"] == 2100.0
    assert sess_stats["max_duration_seconds"] == 3600.0

    dur = compute_duration_statistics(SESSIONS)
    assert dur["count"] == 3
    assert dur["min_seconds"] == 900.0
    assert dur["max_seconds"] == 3600.0
    assert dur["median_seconds"] == 1800.0
    assert dur["p90_seconds"] == 3600.0
    assert len(dur["distribution"]) >= 1

    empty = compute_duration_statistics([])
    assert empty["count"] == 0


# ─── AnalyticsStore ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_analytics_store_roundtrip():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.unlink(path)
    store = AnalyticsStore(db_path=path)
    try:
        await store.init()
        await store.save_snapshot("occupancy", {"current_occupancy": 1})
        await store.save_snapshot("occupancy", {"current_occupancy": 2})
        await store.save_snapshot("traffic", {"vehicle_entries": 5})
        hist = await store.get_history("occupancy")
        assert len(hist) == 2
        assert hist[0]["payload"]["current_occupancy"] == 1
        assert hist[1]["payload"]["current_occupancy"] == 2
        latest = await store.get_latest("occupancy")
        assert latest["payload"]["current_occupancy"] == 2
        assert await store.count("occupancy") == 2
        assert await store.count() == 3
        await store.clear()
        assert await store.count() == 0
    finally:
        await store.close()
        if os.path.exists(path):
            os.unlink(path)
