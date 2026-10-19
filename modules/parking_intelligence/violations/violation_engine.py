"""
ParkTwin AI — Violation Engine
================================
Flags parking-policy breaches on active / closed sessions and manages
wrong-bay violation episodes with immediate warning and 10-minute escalation.

Flags
-----
  overstay            : vehicle stayed longer than ``max_duration_hours``
  reserved_occupied  : a non-matching vehicle occupies a reserved slot
  unauthorized_parking: vehicle in a slot with no readable plate / not registered

Violation Episodes (Phase 3)
----------------------------
  - Immediate wrong-bay entry warning (WRONG_BAY_ENTRY_WARNING)
  - Preserved 10-minute escalation threshold (WRONG_BAY_ESCALATED at 600s)
  - Resolution on exit / relocation / assignment match (WRONG_BAY_RESOLVED)
  - Distinction from authorized long-stay alerts (LONG_STAY_ALERT)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from modules.parking_intelligence.duration.duration_tracker import (
    PARKING_DURATION_THRESHOLD_SECONDS,
    duration_seconds,
)


class ViolationEngine:
    """Evaluates parking-policy violations and wrong-bay episode lifecycles."""

    FLAG_OVERSTAY = "overstay"
    FLAG_RESERVED = "reserved_occupied"
    FLAG_UNAUTHORIZED = "unauthorized_parking"

    # Event constants
    EVENT_WRONG_BAY_ENTRY_WARNING = "WRONG_BAY_ENTRY_WARNING"
    EVENT_WRONG_BAY_ESCALATED = "WRONG_BAY_ESCALATED"
    EVENT_WRONG_BAY_RESOLVED = "WRONG_BAY_RESOLVED"
    EVENT_UNASSIGNED_VEHICLE = "UNASSIGNED_VEHICLE_IN_BAY"
    EVENT_LONG_STAY_ALERT = "LONG_STAY_ALERT"

    def __init__(self, max_duration_hours: float = 24.0) -> None:
        self._max_seconds = max(0.0, float(max_duration_hours)) * 3600.0
        self._episodes: Dict[str, Dict[str, Any]] = {}
        self._active_by_vehicle: Dict[str, str] = {}
        self._active_by_bay: Dict[str, str] = {}

    # ── Original Session Evaluation (Preserved for compatibility) ─────────────

    def evaluate(
        self,
        *,
        duration_seconds: float,
        is_reserved_slot: bool = False,
        reserved_for: Optional[str] = None,
        license_plate: Optional[str] = None,
        is_registered: bool = False,
    ) -> List[str]:
        """Return the list of violation flags applicable to this observation."""
        flags: List[str] = []

        if duration_seconds > self._max_seconds > 0:
            flags.append(self.FLAG_OVERSTAY)

        if is_reserved_slot and reserved_for:
            # Occupied by someone other than the reservation holder.
            if not license_plate or license_plate != reserved_for:
                flags.append(self.FLAG_RESERVED)

        if not license_plate or not is_registered:
            # No readable plate (or unknown vehicle) in a slot.
            flags.append(self.FLAG_UNAUTHORIZED)

        return flags

    @staticmethod
    def merge(existing: Optional[list], new: List[str]) -> List[str]:
        """Union two flag lists deterministically (sorted, de-duplicated)."""
        combined = list(existing or []) + list(new)
        return sorted(set(combined))

    # ── Episode Management (Phase 3) ──────────────────────────────────────────

    def on_bay_entry(
        self,
        track_id: int,
        bay_id: str,
        *,
        vehicle_id: Optional[str] = None,
        assigned_bay: Optional[str] = None,
        license_plate: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        source: str = "live",
    ) -> List[Dict[str, Any]]:
        """
        Process a confirmed bay entry for a vehicle.

        Rules:
          - Unassigned / unknown vehicle -> UNASSIGNED_VEHICLE_IN_BAY (no warning)
          - bay_id == assigned_bay -> correct bay; resolves any pending wrong-bay episode
          - bay_id != assigned_bay -> opens violation episode, emits WRONG_BAY_ENTRY_WARNING once
          - relocation wrong A -> wrong B: closes A, opens fresh B with reset timer
        """
        now = timestamp or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        events: List[Dict[str, Any]] = []
        v_ident = vehicle_id or license_plate

        # 1. Unassigned / unknown vehicle check
        if not v_ident or not assigned_bay:
            ev = {
                "event_type": self.EVENT_UNASSIGNED_VEHICLE,
                "track_id": track_id,
                "bay_id": bay_id,
                "vehicle_id": v_ident,
                "timestamp": now.isoformat(),
                "source": source,
                "message": f"Unassigned vehicle (track {track_id}) detected in bay {bay_id}.",
            }
            return [ev]

        # 2. Correct bay parking
        if bay_id == assigned_bay:
            # If vehicle previously had a wrong-bay episode open, resolve it
            if v_ident in self._active_by_vehicle:
                old_ep_id = self._active_by_vehicle[v_ident]
                res_events = self.resolve_episode(
                    old_ep_id,
                    reason="entered_assigned_bay",
                    timestamp=now,
                    source=source,
                )
                events.extend(res_events)
            return events

        # 3. Wrong bay parking
        # Check if already active in this exact bay
        existing_ep_id = self._active_by_vehicle.get(v_ident)
        if existing_ep_id:
            existing_ep = self._episodes.get(existing_ep_id)
            if existing_ep and existing_ep["actual_bay"] == bay_id and existing_ep["state"] != "RESOLVED":
                # Already warned for this episode in this bay — suppress duplicate warning
                return []
            elif existing_ep and existing_ep["actual_bay"] != bay_id and existing_ep["state"] != "RESOLVED":
                # Relocation from wrong-bay A to wrong-bay B: close A first
                res_events = self.resolve_episode(
                    existing_ep_id,
                    reason="relocated_to_another_bay",
                    timestamp=now,
                    source=source,
                )
                events.extend(res_events)

        # Open fresh violation episode for wrong bay
        ep_id = f"VE-{uuid.uuid4().hex[:10]}"
        episode = {
            "episode_id": ep_id,
            "vehicle_id": v_ident,
            "license_plate": license_plate or v_ident,
            "assigned_bay": assigned_bay,
            "actual_bay": bay_id,
            "started_at": now,
            "resolved_at": None,
            "state": "WARNED",
            "resolution_reason": None,
            "duration_seconds": 0.0,
            "escalated": False,
            "source": source,
        }
        self._episodes[ep_id] = episode
        self._active_by_vehicle[v_ident] = ep_id
        self._active_by_bay[bay_id] = ep_id

        warning_event = {
            "event_type": self.EVENT_WRONG_BAY_ENTRY_WARNING,
            "episode_id": ep_id,
            "vehicle_id": v_ident,
            "license_plate": license_plate or v_ident,
            "assigned_bay": assigned_bay,
            "actual_bay": bay_id,
            "timestamp": now.isoformat(),
            "source": source,
            "message": f"Wrong bay warning: Vehicle {v_ident} entered {bay_id} instead of assigned {assigned_bay}.",
        }
        events.append(warning_event)
        return events

    def evaluate_episodes(self, now: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Evaluate active violation episodes for long-stay escalation (600s / 10 min).

        Uses existing PARKING_DURATION_THRESHOLD_SECONDS (600.0) without changing threshold.
        """
        current_time = now or datetime.now(timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        escalation_events: List[Dict[str, Any]] = []

        for ep in self._episodes.values():
            if ep["state"] == "WARNED" and not ep["escalated"]:
                dur = (current_time - ep["started_at"]).total_seconds()
                ep["duration_seconds"] = max(0.0, dur)

                if dur >= PARKING_DURATION_THRESHOLD_SECONDS:
                    ep["state"] = "ESCALATED"
                    ep["escalated"] = True

                    ev = {
                        "event_type": self.EVENT_WRONG_BAY_ESCALATED,
                        "episode_id": ep["episode_id"],
                        "vehicle_id": ep["vehicle_id"],
                        "license_plate": ep["license_plate"],
                        "assigned_bay": ep["assigned_bay"],
                        "actual_bay": ep["actual_bay"],
                        "duration_seconds": round(dur, 1),
                        "timestamp": current_time.isoformat(),
                        "source": ep["source"],
                        "message": (
                            f"Wrong bay escalated: Vehicle {ep['vehicle_id']} in unauthorized bay "
                            f"{ep['actual_bay']} exceeded 10 minutes ({round(dur, 1)}s)."
                        ),
                    }
                    escalation_events.append(ev)

        return escalation_events

    def on_bay_exit(
        self,
        bay_id: str,
        *,
        vehicle_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        source: str = "live",
    ) -> List[Dict[str, Any]]:
        """Resolve violation episode when vehicle departs the wrong bay."""
        ep_id = None
        if vehicle_id and vehicle_id in self._active_by_vehicle:
            ep_id = self._active_by_vehicle[vehicle_id]
        elif bay_id in self._active_by_bay:
            ep_id = self._active_by_bay[bay_id]

        if not ep_id:
            return []

        return self.resolve_episode(ep_id, reason="left_bay", timestamp=timestamp, source=source)

    def on_facility_exit(
        self,
        vehicle_id: str,
        *,
        timestamp: Optional[datetime] = None,
        source: str = "live",
    ) -> List[Dict[str, Any]]:
        """Resolve violation episode when vehicle exits the facility."""
        ep_id = self._active_by_vehicle.get(vehicle_id)
        if not ep_id:
            return []

        return self.resolve_episode(
            ep_id,
            reason="facility_exit",
            timestamp=timestamp,
            source=source,
        )

    def resolve_episode(
        self,
        episode_id: str,
        reason: str,
        timestamp: Optional[datetime] = None,
        source: str = "live",
    ) -> List[Dict[str, Any]]:
        """Mark an episode as RESOLVED and emit WRONG_BAY_RESOLVED."""
        ep = self._episodes.get(episode_id)
        if not ep or ep["state"] == "RESOLVED":
            return []

        now = timestamp or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        final_dur = max(0.0, (now - ep["started_at"]).total_seconds())
        ep["state"] = "RESOLVED"
        ep["resolved_at"] = now
        ep["resolution_reason"] = reason
        ep["duration_seconds"] = final_dur

        # Remove from active maps
        v_ident = ep["vehicle_id"]
        if self._active_by_vehicle.get(v_ident) == episode_id:
            del self._active_by_vehicle[v_ident]

        actual_bay = ep["actual_bay"]
        if self._active_by_bay.get(actual_bay) == episode_id:
            del self._active_by_bay[actual_bay]

        ev = {
            "event_type": self.EVENT_WRONG_BAY_RESOLVED,
            "episode_id": episode_id,
            "vehicle_id": v_ident,
            "license_plate": ep["license_plate"],
            "assigned_bay": ep["assigned_bay"],
            "actual_bay": actual_bay,
            "reason": reason,
            "duration_seconds": round(final_dur, 1),
            "timestamp": now.isoformat(),
            "source": source,
            "message": f"Wrong bay episode {episode_id} resolved: {reason}.",
        }
        return [ev]

    def get_episodes(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Return list of violation episodes formatted for API responses."""
        episodes = []
        for ep in self._episodes.values():
            if active_only and ep["state"] == "RESOLVED":
                continue
            episodes.append({
                "episode_id": ep["episode_id"],
                "vehicle_id": ep["vehicle_id"],
                "license_plate": ep["license_plate"],
                "assigned_bay": ep["assigned_bay"],
                "actual_bay": ep["actual_bay"],
                "started_at": ep["started_at"].isoformat() if isinstance(ep["started_at"], datetime) else ep["started_at"],
                "resolved_at": ep["resolved_at"].isoformat() if isinstance(ep["resolved_at"], datetime) else ep["resolved_at"],
                "state": ep["state"],
                "resolution_reason": ep["resolution_reason"],
                "duration_seconds": round(ep["duration_seconds"], 1),
                "escalated": ep["escalated"],
                "source": ep["source"],
            })
        return episodes

    def reset(self) -> None:
        """Clear all violation episodes and tracking maps."""
        self._episodes.clear()
        self._active_by_vehicle.clear()
        self._active_by_bay.clear()
