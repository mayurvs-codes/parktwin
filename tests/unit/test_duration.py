"""
Unit tests — Duration Tracker (Module 2).
"""

from datetime import datetime, timedelta, timezone

from modules.parking_intelligence.duration.duration_tracker import (
    duration_seconds,
    format_duration,
    evaluate_long_stay_alert,
)


def _dt(off_minutes=0):
    return datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc) + timedelta(minutes=off_minutes)


def test_duration_active_uses_now():
    entry = _dt(0)
    now = _dt(10)  # 10 minutes later
    assert duration_seconds(entry, now=now) == 600.0


def test_duration_closed_uses_exit():
    entry = _dt(0)
    exit_ = _dt(90)  # 1.5 hours
    assert duration_seconds(entry, exit_time=exit_) == 5400.0


def test_duration_never_negative():
    entry = _dt(30)
    now = _dt(0)
    assert duration_seconds(entry, now=now) == 0.0


def test_format_duration():
    assert format_duration(0) == "00:00:00"
    assert format_duration(65) == "00:01:05"
    assert format_duration(3661) == "01:01:01"
    assert format_duration(5400) == "01:30:00"


def test_long_stay_alert_triggers_at_10_minutes():
    entry = _dt(0)
    now = _dt(10)  # exactly 10 minutes = 600 seconds
    res = evaluate_long_stay_alert(entry, "SP-07", "SP-07", now=now)
    assert res["is_alert"] is True
    assert res["status"] == "LONG_STAY_ALERT"
    assert res["duration_seconds"] == 600.0
    assert "exceeded 10 minutes" in res["message"]


def test_long_stay_alert_warning_at_8_minutes():
    entry = _dt(0)
    now = _dt(8)  # 8 minutes = 480 seconds
    res = evaluate_long_stay_alert(entry, "SP-07", "SP-07", now=now)
    assert res["is_alert"] is False
    assert res["status"] == "WARNING"


def test_long_stay_alert_normal_under_8_minutes():
    entry = _dt(0)
    now = _dt(5)  # 5 minutes = 300 seconds
    res = evaluate_long_stay_alert(entry, "SP-07", "SP-07", now=now)
    assert res["is_alert"] is False
    assert res["status"] == "NORMAL"


def test_long_stay_alert_not_triggered_if_vehicle_moved_or_changed_space():
    entry = _dt(0)
    now = _dt(15)  # 15 minutes later, but observed in SP-11 instead of original SP-07
    res = evaluate_long_stay_alert(entry, "SP-07", "SP-11", now=now)
    assert res["is_alert"] is False
    assert res["status"] == "NORMAL"
    assert "no longer in the same space" in res["message"]

    # Also test when vehicle has unparked / empty
    res_none = evaluate_long_stay_alert(entry, "SP-07", None, now=now)
    assert res_none["is_alert"] is False
    assert res_none["status"] == "NORMAL"
