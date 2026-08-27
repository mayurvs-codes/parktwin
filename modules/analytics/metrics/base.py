"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Shared metric helpers.

Pure, side-effect-free utilities used by every analytics calculator
(occupancy / traffic / utilization / trends). They operate on plain
Python values and the Integration Layer DTO dicts only — they never touch
the database or any Module 1 / Module 2 internals.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence


# ─── Numeric helpers ──────────────────────────────────────────────────────────

def round2(value: Optional[float]) -> float:
    """Round to 2 decimals, tolerating None / NaN."""
    if value is None:
        return 0.0
    try:
        if value != value:  # NaN
            return 0.0
    except TypeError:
        return 0.0
    return round(float(value) + 0.0, 2)


def safe_div(num: float, den: float, default: float = 0.0) -> float:
    """Division that returns ``default`` instead of raising on zero."""
    try:
        if not den:
            return default
        return num / den
    except (TypeError, ZeroDivisionError):
        return default


def mean(values: Sequence[float]) -> float:
    """Arithmetic mean; 0.0 for an empty sequence."""
    vals = [float(v) for v in values if v is not None]
    if not vals:
        return 0.0
    return sum(vals) / len(vals)


def median(values: Sequence[float]) -> float:
    """Median value; 0.0 for an empty sequence."""
    vals = sorted(float(v) for v in values if v is not None)
    n = len(vals)
    if n == 0:
        return 0.0
    mid = n // 2
    if n % 2:
        return vals[mid]
    return (vals[mid - 1] + vals[mid]) / 2.0


def percentile(values: Sequence[float], pct: float) -> float:
    """Nearest-rank percentile (0..100), per the NIST definition.

    rank = ceil(P/100 * N), clamped to the data. 0.0 for an empty sequence.
    """
    import math

    vals = sorted(float(v) for v in values if v is not None)
    if not vals:
        return 0.0
    if pct <= 0:
        return vals[0]
    if pct >= 100:
        return vals[-1]
    n = len(vals)
    rank = max(1, min(n, math.ceil(pct / 100.0 * n)))
    return vals[rank - 1]


def clamp01(value: float) -> float:
    """Clamp a ratio into the 0..1 range."""
    return max(0.0, min(1.0, float(value)))


# ─── Time helpers ───────────────────────────────────────────────────────────

def now_utc() -> datetime:
    """Current UTC timestamp."""
    return datetime.now(timezone.utc)


def parse_ts(value: Any) -> Optional[datetime]:
    """Parse an ISO-8601 string (or datetime) into an aware UTC datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def hour_of(value: Any) -> Optional[int]:
    """Hour-of-day (0..23) for a timestamp-ish value, or None."""
    dt = parse_ts(value)
    return dt.hour if dt is not None else None


def date_key(value: Any) -> Optional[str]:
    """``YYYY-MM-DD`` key for a timestamp-ish value, or None."""
    dt = parse_ts(value)
    return dt.strftime("%Y-%m-%d") if dt is not None else None


from shared.helpers.time_utils import iso_now


# ─── Bucketing helpers ─────────────────────────────────────────────────────

def aggregate_by_hour(items: Sequence[Dict[str, Any]], ts_key: str) -> Dict[int, int]:
    """Count ``items`` by the hour-of-day extracted from ``item[ts_key]``."""
    counts: Counter = Counter()
    for item in items:
        h = hour_of(item.get(ts_key))
        if h is not None:
            counts[h] += 1
    return dict(counts)


def aggregate_by_day(items: Sequence[Dict[str, Any]], ts_key: str) -> Dict[str, int]:
    """Count ``items`` by calendar date extracted from ``item[ts_key]``."""
    counts: Counter = Counter()
    for item in items:
        d = date_key(item.get(ts_key))
        if d is not None:
            counts[d] += 1
    return dict(counts)


def top_n(
    counter: Dict[Any, int],
    n: int = 10,
    reverse: bool = True,
) -> List[Dict[str, Any]]:
    """Return the top/bottom-``n`` of a {key: count} mapping as a list."""
    ordered = sorted(counter.items(), key=lambda kv: kv[1], reverse=reverse)
    return [{"key": k, "count": v} for k, v in ordered[: max(0, n)]]


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
