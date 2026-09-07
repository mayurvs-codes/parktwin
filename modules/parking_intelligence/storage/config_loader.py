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
    
    if camera is not None:
        slot_ids = list(getattr(camera, "parking_slots", []) or [])
        # If camera explicitly has empty parking_slots, use that (0 slots).
        # Only fall back to global parking config if parking_slots attribute doesn't exist.
        if not slot_ids and not hasattr(camera, "parking_slots"):
            parking = getattr(settings, "parking", None)
            if parking is not None:
                prefix = getattr(parking, "slot_prefix", "P")
                total = getattr(parking, "total_slots", 100)
                slot_ids = [f"{prefix}{i:02d}" for i in range(1, total + 1)]
    else:
        parking = getattr(settings, "parking", None)
        if parking is not None:
            prefix = getattr(parking, "slot_prefix", "P")
            total = getattr(parking, "total_slots", 100)
            slot_ids = [f"{prefix}{i:02d}" for i in range(1, total + 1)]
        else:
            slot_ids = [f"P{i:02d}" for i in range(1, 101)]

    defs: List[Dict] = []
    for sid in slot_ids:
        geom = layout.get(sid)
        zone = getattr(camera, "zone", "general") or "general" if camera else "general"
        defs.append({
            "slot_id": sid,
            "camera_id": camera_id,
            "zone": zone,
            "is_reserved": False,
            "reserved_for": None,
            "position": list(geom) if geom else None,
        })
    return defs
