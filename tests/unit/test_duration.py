"""
Unit tests — Duration Tracker (Module 2).
"""

from datetime import datetime, timedelta, timezone

from modules.parking_intelligence.duration.duration_tracker import (
    duration_seconds,
    format_duration,
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
