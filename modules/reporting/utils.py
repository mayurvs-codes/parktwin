"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Small shared helpers (time, id, formatting). Pure utilities only.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional


from shared.helpers.time_utils import iso_now, fmt_duration, to_number


def new_report_id() -> str:
    """Generate a stable, collision-resistant report identifier."""
    return f"RPT-{uuid.uuid4().hex[:16].upper()}"



def to_number(value: Any, default: float = 0.0) -> float:
    """Coerce a value into a float, tolerating None / non-numeric junk."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_get(d: Any, *keys: str, default: Any = None) -> Any:
    """Nested dict getter that tolerates missing keys / non-dicts."""
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
        if cur is None:
            return default
    return cur


__all__ = ["iso_now", "new_report_id", "fmt_duration", "to_number", "safe_get"]
