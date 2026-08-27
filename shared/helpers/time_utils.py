"""
ParkTwin AI — Canonical Time & Duration Helpers
================================================
Canonical single source of truth for ISO timestamps, duration calculation,
and HH:MM:SS string formatting across all modules.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional


def iso_now() -> str:
    """Current UTC timestamp as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def format_duration(seconds: Optional[float]) -> str:
    """Render a duration in HH:MM:SS (clamped at zero)."""
    secs = int(max(0.0, float(seconds or 0.0)))
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


# Alias for backward compatibility across reporting/analytics
fmt_duration = format_duration


def to_number(value: Any, default: float = 0.0) -> float:
    """Coerce a value into a float, tolerating None / non-numeric values."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
