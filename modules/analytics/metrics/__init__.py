"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Metrics package: shared, side-effect-free helpers used by every analytics
calculator (occupancy / traffic / utilization / trends).
"""

from .base import (
    aggregate_by_day,
    aggregate_by_hour,
    clamp01,
    date_key,
    hour_of,
    iso_now,
    mean,
    median,
    now_utc,
    parse_ts,
    percentile,
    round2,
    safe_div,
    top_n,
)

__all__ = [
    "round2",
    "safe_div",
    "mean",
    "median",
    "percentile",
    "clamp01",
    "now_utc",
    "parse_ts",
    "hour_of",
    "date_key",
    "iso_now",
    "aggregate_by_hour",
    "aggregate_by_day",
    "top_n",
]
