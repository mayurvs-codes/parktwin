"""
ParkTwin AI — Stable Slot Mapper
=================================
Maintains a persistent, frame-to-frame mapping between tracked vehicles and
parking slots for a camera. This is the heart of Module 2: a vehicle keeps
the same slot across frames, and a slot is only released once its vehicle has
been absent for ``release_after`` consecutive frames.

Inputs are plain ``VehicleTrack`` objects so the mapper has no dependency on
Module 1 internals — Module 1's ``VehicleRecord`` / ``Track`` are adapted
into ``VehicleTrack`` at the engine boundary.

Outputs a ``MappingResult`` describing what changed this frame so the engine
can open/close sessions and emit events.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from uuid import UUID

from ..slot_detection.slot_config import SlotConfig
from ..slot_detection.slot_detector import nearest_free_slot


@dataclass
class VehicleTrack:
    """Normalized vehicle observation consumed by the mapper."""

    track_id: int
    bbox: List[float]                          # normalized {x1,y1,x2,y2}
    class_name: str = "car"
    confidence: float = 0.0
    license_plate: Optional[str] = None
    vehicle_id: Optional[UUID] = None

    @classmethod
    def from_record(cls, record) -> Optional["VehicleTrack"]:
        """Adapt a Module 1 ``VehicleRecord`` (duck-typed) to a VehicleTrack.

        Returns None when the record has no usable track id (cannot be mapped).
        """
        track_id = getattr(record, "tracking_id", None)
        if track_id is None:
            return None
        bbox = getattr(record, "bbox", None) or []
        if len(bbox) != 4:
            return None
        return cls(
            track_id=int(track_id),
            bbox=list(bbox),
            class_name=getattr(record, "vehicle_type", "car") or "car",
            confidence=float(getattr(record, "detection_confidence", 0.0) or 0.0),
            license_plate=getattr(record, "license_plate", None),
            vehicle_id=getattr(record, "vehicle_id", None),
        )


@dataclass
class MappingResult:
    """What changed in the mapping on a single frame."""

    assignments: Dict[int, str] = field(default_factory=dict)     # track_id -> slot_id
    newly_assigned: Dict[int, str] = field(default_factory=dict)   # this frame only
    released: List[Tuple[int, str]] = field(default_factory=list)   # (track_id, slot_id)
    reidentified: List[int] = field(default_factory=list)         # track_ids re-spotted by plate


@dataclass
class SlotAssignment:
    """Authoritative per-frame slot ownership produced by Module 2.

    Pure data carrier for the parking-slot mapping. Module 2 is the single
    owner of slot assignment; consumers (Integration Layer, REST endpoints)
    read ownership from this object rather than from Module 1's record.

    Holds the same ownership fields as :class:`MappingResult` for one camera.
    """

    camera_id: str
    assignments: Dict[int, str] = field(default_factory=dict)     # track_id -> slot_id
    newly_assigned: Dict[int, str] = field(default_factory=dict)  # this frame only
    released: List[Tuple[int, str]] = field(default_factory=list) # (track_id, slot_id)

    def slot_for(self, track_id: int) -> Optional[str]:
        """Return the slot_id currently owned by ``track_id``, or None."""
        return self.assignments.get(track_id)


class SlotMapper:
    """Stateful, per-camera vehicle↔slot mapping."""

    def __init__(self, release_after: int = 30, distance_threshold: float = 0.35) -> None:
        self._release_after = max(1, int(release_after))
        self._threshold = float(distance_threshold)

        # camera_id -> {track_id -> slot_id}
        self._assign: Dict[str, Dict[int, str]] = {}
        # camera_id -> {slot_id -> track_id}
        self._reverse: Dict[str, Dict[str, int]] = {}
        # camera_id -> {track_id -> consecutive-missing-frame count}
        self._missing: Dict[str, Dict[int, int]] = {}
        # camera_id -> {license_plate -> set(track_ids) that carried it}
        self._plate_tracks: Dict[str, Dict[str, set]] = {}

    # ── Public API ─────────────────────────────────────────────────────────

    def get_assignment(self, camera_id: str, track_id: int) -> Optional[str]:
        return self._assign.get(camera_id, {}).get(track_id)

    def get_state(self, camera_id: str) -> Dict[int, str]:
        """Current track_id -> slot_id mapping for a camera (snapshot)."""
        return dict(self._assign.get(camera_id, {}))

    def update(
        self,
        camera_id: str,
        tracks: List[VehicleTrack],
        slot_configs: List[SlotConfig],
    ) -> MappingResult:
        """Advance the mapping by one frame and return what changed."""
        assign = self._assign.setdefault(camera_id, {})
        reverse = self._reverse.setdefault(camera_id, {})
        missing = self._missing.setdefault(camera_id, {})
        plate_tracks = self._plate_tracks.setdefault(camera_id, {})

        present_ids = {t.track_id for t in tracks}
        occupied_slots = set(reverse.keys())

        result = MappingResult()

        # 1. Assign slots to vehicles that do not yet have one.
        for track in tracks:
            if track.track_id in assign:
                continue  # already mapped — keep stable

            slot = nearest_free_slot(
                track.bbox,
                slot_configs,
                occupied_slots,
                reserved_for=track.license_plate,
                distance_threshold=self._threshold,
            )
            if slot is None:
                continue  # no free slot reachable right now

            assign[track.track_id] = slot.slot_id
            reverse[slot.slot_id] = track.track_id
            occupied_slots.add(slot.slot_id)
            result.newly_assigned[track.track_id] = slot.slot_id

            # Re-identification: a brand-new track carrying a plate we already
            # saw on a *different* track id is the same physical vehicle.
            if track.license_plate:
                prior = plate_tracks.get(track.license_plate, set())
                if track.track_id not in prior and prior:
                    result.reidentified.append(track.track_id)
                prior.add(track.track_id)
                plate_tracks[track.license_plate] = prior

        # 2. Decay missing counters and release long-gone vehicles.
        for track_id in list(assign.keys()):
            if track_id in present_ids:
                missing[track_id] = 0
                continue
            missing[track_id] = missing.get(track_id, 0) + 1
            if missing[track_id] >= self._release_after:
                slot_id = assign.pop(track_id)
                reverse.pop(slot_id, None)
                missing.pop(track_id, None)
                result.released.append((track_id, slot_id))

        result.assignments = dict(assign)
        return result

    def force_release(self, camera_id: str, track_id: int) -> Optional[str]:
        """Explicitly release a track (e.g. tracker reported it gone)."""
        assign = self._assign.get(camera_id, {})
        reverse = self._reverse.get(camera_id, {})
        missing = self._missing.get(camera_id, {})
        slot_id = assign.pop(track_id, None)
        if slot_id is not None:
            reverse.pop(slot_id, None)
        missing.pop(track_id, None)
        return slot_id

    def reset_camera(self, camera_id: str) -> None:
        self._assign.pop(camera_id, None)
        self._reverse.pop(camera_id, None)
        self._missing.pop(camera_id, None)
        self._plate_tracks.pop(camera_id, None)
