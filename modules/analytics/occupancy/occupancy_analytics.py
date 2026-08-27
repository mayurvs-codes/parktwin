"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Occupancy analytics.

Consumes the Integration Layer occupancy DTO (``/integration/occupancy``)
and the slot list (``/integration/slots``) — never Module 1 / Module 2
internals. Produces:

  - current occupancy      (occupied slots right now)
  - occupancy percentage   (occupied / total, as a percentage)
  - free slots
  - reserved slots
  - average occupancy      (mean of per-camera occupancy rates)
"""

from __future__ import annotations

from typing import Any, Dict, List

from ..metrics.base import clamp01, round2, safe_div


def compute_occupancy(
    occupancy: Dict[str, Any],
    slots: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Compute occupancy analytics from Integration Layer outputs.

    ``occupancy`` is the ``GatewayOccupancy``-style dict returned by the
    Integration Service. ``slots`` is the list of slot DTOs (used only to
    report the reserved-slot breakdown consistently with the live state).
    """
    total = int(occupancy.get("total_slots", 0) or 0)
    occupied = int(occupancy.get("occupied", 0) or 0)
    free = int(occupancy.get("free", 0) or 0)
    reserved = int(occupancy.get("reserved", 0) or 0)
    unknown = int(occupancy.get("unknown", 0) or 0)
    per_camera = occupancy.get("per_camera", {}) or {}

    # Canonical occupancy rate from the Integration Layer DTO (sourced from M2 occupancy_manager).
    rate = occupancy.get("occupancy_rate")
    if rate is None:
        rate = safe_div(occupied, total)
    overall_rate = clamp01(float(rate))

    # Average occupancy across cameras: mean of per-camera occupancy rates,
    # weighting each camera equally (a fleet-level view, robust to a camera
    # with zero configured slots).
    cam_rates: List[float] = []
    for cam, c in per_camera.items():
        ct = int(c.get("total", 0) or 0)
        co = int(c.get("occupied", 0) or 0)
        if ct > 0:
            cam_rates.append(co / ct)
    average_occupancy = round2(safe_div(sum(cam_rates), len(cam_rates))) if cam_rates else overall_rate

    return {
        "current_occupancy": occupied,
        "occupancy_percentage": round2(overall_rate * 100.0),
        "free_slots": free,
        "reserved_slots": reserved,
        "unknown_slots": unknown,
        "average_occupancy": average_occupancy,
        "average_occupancy_percentage": round2(average_occupancy * 100.0),
        "total_slots": total,
        "per_camera": per_camera,
    }


__all__ = ["compute_occupancy"]
