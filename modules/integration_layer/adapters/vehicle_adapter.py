"""
ParkTwin AI — Vehicle Recognition Adapter (Module 1 → Integration)
==============================================================
Maps Module 1 outputs into integration-layer DTOs. It reads the public
ORM / record structures only — it never imports Module 1 business code.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def vehicle_to_dto(vehicle) -> Dict[str, Any]:
    """Adapt a Module 1 ``Vehicle`` ORM row to an integration vehicle DTO."""
    return {
        "id": str(vehicle.id) if getattr(vehicle, "id", None) is not None else None,
        "license_plate": getattr(vehicle, "license_plate", None),
        "vehicle_type": getattr(vehicle, "vehicle_type", None),
        "brand": getattr(vehicle, "brand", None),
        "model": getattr(vehicle, "model", None),
        "color": getattr(vehicle, "color", None),
        "tracking_id": getattr(vehicle, "tracking_id", None),
        "plate_confidence": getattr(vehicle, "plate_confidence", 0.0),
        "detection_confidence": getattr(vehicle, "detection_confidence", 0.0),
        "color_confidence": getattr(vehicle, "color_confidence", 0.0),
        "is_registered": bool(getattr(vehicle, "is_registered", False)),
        "last_seen": _iso(getattr(vehicle, "last_seen", None)),
        "created_at": _iso(getattr(vehicle, "created_at", None)),
    }


def _assignment_map(assignment: Any) -> Dict[int, str]:
    """Normalize a SlotAssignment (or its serialized dict) to {tracking_id: slot_id}."""
    if assignment is None:
        return {}
    raw = getattr(assignment, "assignments", None)
    if raw is None and isinstance(assignment, dict):
        raw = assignment.get("assignments")
    if not raw:
        return {}
    mapping: Dict[int, str] = {}
    for tid, slot in raw.items():
        try:
            mapping[int(tid)] = slot
        except (TypeError, ValueError):
            continue
    return mapping


def record_to_live(records: List[Any], assignment: Any = None) -> List[Dict[str, Any]]:
    """Adapt Module 1 ``VehicleRecord`` outputs for the live WebSocket view.

    Slot ownership is sourced **exclusively** from Module 2's authoritative
    ``SlotAssignment`` (D5 Phase 6): each vehicle's ``slot`` / ``occupied``
    fields are set from the ``{tracking_id: slot_id}`` mapping keyed by
    ``tracking_id``. Module 1's own ``VehicleRecord.slot`` is no longer a
    source of slot ownership — tracks without a Module 2 assignment are
    reported as unoccupied.
    """
    mapping = _assignment_map(assignment)
    out: List[Dict[str, Any]] = []
    for r in records:
        d = r.to_api_dict() if hasattr(r, "to_api_dict") else dict(r)
        tid = d.get("tracking_id")
        mapped = tid is not None and int(tid) in mapping
        if mapped:
            d["slot"] = mapping[int(tid)]
            d["occupied"] = True
        else:
            # Ownership belongs to Module 2; assume unoccupied when absent.
            d["slot"] = None
            d["occupied"] = False
        # Architecture invariant (D5 Phase 8): a record whose tracking_id is
        # NOT present in Module 2's assignment must NEVER report a slot sourced
        # from its own backward-compat ``slot`` field. This fails loudly if any
        # future change re-introduces a Module 1 slot-ownership fallback.
        assert mapped or (d["slot"] is None and d["occupied"] is False), (
            "slot ownership leaked from Module 1 record; Module 2 is the "
            "sole owner (D5)"
        )
        out.append(d)
    return out


def _iso(value: Any) -> Optional[str]:
    return value.isoformat() if value is not None else None
