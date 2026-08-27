"""
Unit tests — Reporting Engine generators + templates (Module 5)
==============================================================
Verifies each generator produces the correct ``ReportData`` and that the
matching template turns it into a well-formed ``ReportView``. Generators are
exercised against a fake :class:`DataFetcher` returning canned Integration /
Analytics payloads — no DB, no Module 1/2.
"""

import pytest

from modules.reporting.generators import get_generator, available_report_types
from modules.reporting.templates import apply_template
from modules.reporting.types import REPORT_TYPE_TITLES


class FakeFetcher:
    """Returns canned Integration/Analytics payloads for every fetcher method."""

    async def occupancy(self, camera_id=None):
        return {
            "total_slots": 5, "occupied": 2, "free": 2, "reserved": 1, "unknown": 0,
            "occupancy_rate": 0.4,
            "per_camera": {"camera_01": {"total": 5, "occupied": 2, "free": 2, "reserved": 1}},
        }

    async def slots(self, camera_id=None, state=None):
        return [
            {"slot_id": "slot_1", "camera_id": "camera_01", "zone": "A", "state": "occupied", "is_reserved": False},
            {"slot_id": "slot_2", "camera_id": "camera_01", "zone": "A", "state": "free", "is_reserved": True},
        ]

    async def sessions(self, *, active_only=False, camera_id=None, plate=None, limit=200):
        rows = [
            {"session_uid": "S1", "license_plate": "KA01AB1234", "slot_id": "slot_1",
             "camera_id": "camera_01", "entry_time": "2026-01-01T10:00:00", "exit_time": None,
             "duration_seconds": 0.0, "is_active": True, "violation_flags": []},
            {"session_uid": "S2", "license_plate": "KA02CD5678", "slot_id": "slot_2",
             "camera_id": "camera_01", "entry_time": "2026-01-01T09:00:00",
             "exit_time": "2026-01-01T10:30:00", "duration_seconds": 5400.0, "is_active": False,
             "violation_flags": ["OVERSTAY"]},
        ]
        if active_only:
            rows = [r for r in rows if r["is_active"]]
        return rows[:limit]

    async def vehicles(self, skip=0, limit=200, plate=None):
        rows = [
            {"id": "1", "license_plate": "KA01AB1234", "vehicle_type": "Sedan", "color": "White",
             "tracking_id": "t1", "plate_confidence": 0.95, "is_registered": True,
             "last_seen": "2026-01-01T10:00:00"},
            {"id": "2", "license_plate": None, "vehicle_type": "SUV", "color": "Black",
             "tracking_id": "t2", "plate_confidence": 0.0, "is_registered": False,
             "last_seen": "2026-01-01T09:00:00"},
        ]
        if plate:
            rows = [r for r in rows if r["license_plate"] == plate]
        return rows[:limit]

    async def events(self, *, source="module", event_type=None, camera_id=None, limit=500):
        return {"source": source, "events": [
            {"event_uid": "E1", "event_type": "violation_detected", "camera_id": "camera_01",
             "slot_id": "slot_2", "license_plate": "KA02CD5678", "timestamp": "2026-01-01T10:00:00"},
        ]}

    async def statistics(self):
        return {"active_sessions": 1, "total_sessions": 2, "average_duration_seconds": 5400.0}

    async def analytics_dashboard(self):
        return {
            "occupancy": {"current_occupancy": 2, "occupancy_percentage": 40.0,
                          "average_occupancy_percentage": 40.0, "free_slots": 2, "reserved_slots": 1},
            "traffic": {"vehicle_entries": 2, "vehicle_exits": 1, "active_vehicles": 1,
                        "vehicle_counts": {"total": 2, "distinct": 2, "active": 1}},
            "utilization": {"slot_utilization": 0.4, "slot_utilization_percentage": 40.0,
                            "used_slots": 2, "total_slots": 5, "average_parking_duration_seconds": 5400.0,
                            "average_parking_duration": "01:30:00", "turnover_rate": 0.4,
                            "most_used_slots": [{"slot_id": "slot_2", "usage_count": 1}]},
            "trends": {
                "occupancy_timeline": [{"timestamp": "2026-01-01T10:00:00", "current_occupancy": 2,
                                        "occupancy_percentage": 40.0, "free_slots": 2}],
                "traffic_timeline": [],
                "session_statistics": {"total_sessions": 2, "active_sessions": 1,
                                       "closed_sessions": 1, "average_duration_seconds": 5400.0,
                                       "average_duration": "01:30:00"},
                "duration_statistics": {"count": 1, "min_seconds": 5400.0, "max_seconds": 5400.0,
                                        "mean_seconds": 5400.0, "median_seconds": 5400.0,
                                        "distribution": [{"bucket_seconds": 5400, "count": 1}]},
            },
            "generated_at": "2026-01-01T10:00:00",
        }

    async def analytics_occupancy(self):
        return {"current_occupancy": 2, "occupancy_percentage": 40.0,
                "average_occupancy_percentage": 40.0}

    async def analytics_traffic(self):
        return {"vehicle_entries": 2, "vehicle_exits": 1, "active_vehicles": 1,
                "peak_hour": 10, "hourly_traffic": {}, "daily_traffic": [],
                "vehicle_counts": {"total": 2, "distinct": 2, "active": 1},
                "event_crosscheck": {"entries": 2, "exits": 1}}

    async def analytics_utilization(self):
        return {"slot_utilization": 0.4, "slot_utilization_percentage": 40.0, "used_slots": 2,
                "total_slots": 5, "average_parking_duration_seconds": 5400.0,
                "average_parking_duration": "01:30:00", "turnover_rate": 0.4,
                "most_used_slots": [{"slot_id": "slot_2", "usage_count": 1}],
                "least_used_slots": [{"slot_id": "slot_1", "usage_count": 0}]}

    async def analytics_trends(self, history_limit=200):
        return {
            "occupancy_timeline": [{"timestamp": "2026-01-01T10:00:00", "current_occupancy": 2,
                                    "occupancy_percentage": 40.0, "free_slots": 2}],
            "traffic_timeline": [],
            "session_statistics": {"total_sessions": 2, "active_sessions": 1, "closed_sessions": 1,
                                   "average_duration_seconds": 5400.0, "average_duration": "01:30:00"},
            "duration_statistics": {"count": 1, "min_seconds": 5400.0, "max_seconds": 5400.0,
                                    "mean_seconds": 5400.0, "median_seconds": 5400.0, "distribution": []},
        }


@pytest.mark.asyncio
@pytest.mark.parametrize("report_type", available_report_types())
async def test_generator_produces_report_data(report_type):
    gen = get_generator(report_type)
    data = await gen.generate(FakeFetcher(), {})
    assert data.report_type == report_type
    assert data.title == REPORT_TYPE_TITLES[report_type]
    assert data.generated_at
    assert len(data.sections) > 0
    # Every section must be serializable (store round-trips through JSON).
    import json
    json.dumps(data.to_dict(), default=str)


@pytest.mark.asyncio
@pytest.mark.parametrize("report_type", available_report_types())
async def test_template_produces_view(report_type):
    gen = get_generator(report_type)
    data = await gen.generate(FakeFetcher(), {})
    view = apply_template(report_type, data)
    assert view.report_type == report_type
    assert len(view.panels) > 0
    for panel in view.panels:
        assert panel.title
        assert panel.kind in ("metrics", "table", "list", "text")
    # JSON export of the view must be valid.
    import json
    json.dumps(view.to_dict(), default=str)


@pytest.mark.asyncio
async def test_parking_summary_metrics():
    data = await get_generator("parking_summary").generate(FakeFetcher(), {})
    view = apply_template("parking_summary", data)
    metrics = {m["label"]: m["value"] for p in view.panels if p.kind == "metrics" for m in p.metrics}
    assert metrics["Occupied"] == 2
    assert metrics["Free"] == 2
    assert metrics["Total Slots"] == 5


@pytest.mark.asyncio
async def test_violation_report_counts():
    data = await get_generator("violation").generate(FakeFetcher(), {})
    view = apply_template("violation", data)
    metrics = {m["label"]: m["value"] for p in view.panels if p.kind == "metrics" for m in p.metrics}
    assert metrics["Sessions With Violations"] == 1
    assert metrics["Total Violation Flags (sessions)"] == 1
    assert metrics["Violation Events (module)"] == 1


@pytest.mark.asyncio
async def test_unknown_report_type_raises():
    from modules.reporting.generators import get_generator as gg
    with pytest.raises(ValueError):
        gg("nope")
