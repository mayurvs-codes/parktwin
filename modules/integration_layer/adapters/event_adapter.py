"""
ParkTwin AI — Event Adapter (Module events → Integration events)
=============================================================
Translates the lifecycle events emitted by Module 2's ``EventEngine`` into
the canonical integration event types (see :data:`INTEGRATION_EVENT_TYPES`).

The mapping is deliberately explicit and loss-less: the original Module 2 event
dict is carried through as the integration event ``payload`` so downstream
consumers can inspect raw fields, while the ``event_type`` is normalized to the
integration vocabulary.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from ..events.bus import INTEGRATION_EVENT_TYPES

# Module 2 EventEngine type → integration event type(s).
_MODULE_TO_INTEGRATION: Dict[str, List[str]] = {
    "vehicle_entered": ["VehicleDetected"],
    "vehicle_parked": ["VehicleParked", "SessionStarted"],
    "vehicle_left": ["VehicleExited", "SessionEnded"],
    "slot_occupied": ["SlotOccupied"],
    "slot_released": ["SlotReleased"],
    "vehicle_reidentified": ["VehicleTracked"],
}


def translate(
    module_event_type: str,
    payload: Dict[str, Any],
) -> List[Tuple[str, Dict[str, Any]]]:
    """Map a single Module 2 event to zero-or-more integration events.

    Returns a list of ``(integration_event_type, payload)`` tuples. The
    payload is the original event dict (it is safe to share — it is never
    mutated by consumers).
    """
    integration_types = _MODULE_TO_INTEGRATION.get(module_event_type)
    if not integration_types:
        return []
    return [(t, payload) for t in integration_types]


def module_event_id(payload: Dict[str, Any]) -> str:
    """Stable id helper for dedup / correlation (uses the module event uid)."""
    return payload.get("event_uid") or payload.get("event_type") or "unknown"


def is_integration_type(event_type: str) -> bool:
    """True if ``event_type`` is a known integration event type."""
    return event_type in INTEGRATION_EVENT_TYPES
