"""
ParkTwin AI — Slot Configuration Loader (Module 2)
====================================================
Translates deployment configuration into concrete parking-slot definitions.

Slot ids come from either:
  * a camera's explicit ``parking_slots`` list (prefered), or
  * the global ``parking`` block (``slot_prefix`` + ``total_slots``).

Optional per-camera geometry may be supplied via a ``parking.layout`` map
(``camera_id -> {slot_id: [x1,y1,x2,y2]}``); without it, slots have no
known footprint and the mapper falls back to deterministic pool allocation.
"""

from __future__ import annotations

from typing import Dict, List

from backend.core.config import Settings


def _layout(settings: Settings) -> Dict[str, Dict[str, List[float]]]:
    """Read an optional ``parking.layout`` block (tolerant if absent)."""
    parking = getattr(settings, "parking", None)
    if parking is None:
        return {}
    return dict(getattr(parking, "layout", {}) or {})


def load_slot_definitions(settings: Settings, camera_id: str) -> List[Dict]:
    """
    Build the slot definitions for one camera from settings.

    Returns a list of dicts ready for ``ParkingSlot(**d)`` plus an extra
    ``slot_id``/``camera_id`` always present.
    """
    layout = _layout(settings).get(camera_id, {})

    # Find the camera's explicit slot list (if configured).
    camera = next(
        (c for c in settings.cameras.sources if c.id == camera_id),
        None,
    )
    explicit = list(getattr(camera, "parking_slots", []) or []) if camera else []

    parking = settings.parking
    if explicit:
        slot_ids = explicit
    else:
        prefix = parking.slot_prefix
        total = parking.total_slots
        slot_ids = [f"{prefix}{i:02d}" for i in range(1, total + 1)]

    defs: List[Dict] = []
    for sid in slot_ids:
        geom = layout.get(sid)
        defs.append({
            "slot_id": sid,
            "camera_id": camera_id,
            "zone": getattr(camera, "zone", "general") or "general",
            "is_reserved": False,
            "reserved_for": None,
            "position": list(geom) if geom else None,
        })
    return defs
