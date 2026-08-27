"""
ParkTwin AI — Occupancy Manager
================================
Derives each slot's state from its reservation flag and whether a vehicle is
currently assigned to it. Produces the four supported states:

    FREE      : not reserved, nothing assigned
    OCCUPIED  : a vehicle is assigned to it
    RESERVED  : flagged reserved and not yet occupied by its owner
    UNKNOWN    : state could not be determined (e.g. unconfigured slot)

The manager is a pure function of its inputs and is fully unit-testable.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from ..storage.models import SlotState
from ..slot_detection.slot_config import SlotConfig


def compute_state(
    slot: SlotConfig,
    assigned_track_id: Optional[int],
) -> SlotState:
    """Resolve a single slot's state."""
    if slot.is_reserved:
        # Reserved slots read as RESERVED even when momentarily empty;
        # if their owner is parked they are also OCCUPIED, but the slot
        # keeps the RESERVED semantic so operators can still see the reservation.
        return SlotState.RESERVED
    if assigned_track_id is not None:
        return SlotState.OCCUPIED
    return SlotState.FREE


def compute_states(
    slot_configs: List[SlotConfig],
    assignments: Dict[int, str],  # track_id -> slot_id
) -> Dict[str, SlotState]:
    """Compute the state of every configured slot for a camera."""
    # Invert assignments: slot_id -> track_id
    slot_to_track: Dict[str, int] = {}
    for track_id, slot_id in assignments.items():
        slot_to_track[slot_id] = track_id

    states: Dict[str, SlotState] = {}
    for slot in slot_configs:
        assigned = slot_to_track.get(slot.slot_id)
        states[slot.slot_id] = compute_state(slot, assigned)
    return states


def classify_unknown(configured_slot_ids: List[str], known_states: Dict[str, SlotState]) -> Dict[str, SlotState]:
    """
    Mark configured slots absent from the computed set as UNKNOWN.

    Used when a camera's slot list cannot be fully evaluated (e.g. region
    outside the current frame coverage) so the operator sees an explicit gap
    rather than a silently missing row.
    """
    result = dict(known_states)
    for sid in configured_slot_ids:
        result.setdefault(sid, SlotState.UNKNOWN)
    return result
