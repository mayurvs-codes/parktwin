"""
ParkTwin AI — Voice Announcement Service (Phase 4)
===================================================
Authoritative service that determines *what* announcements to produce based on
validated ANPR assignments, navigation routes, and violation episodes.

Features:
  - Text generated from real assignment and navigation graph directions
  - Consecutive step condensation (max ~3 sentences)
  - Failure case announcements (unknown plate, unassigned, unavailable, no route)
  - Idempotency by event_id with deduplication
  - Per-vehicle cooldown by message kind
  - Priority pre-emption (warnings pre-empt route directions)
  - Full in-memory announcement logging for testing and audit trails
"""

from __future__ import annotations

import logging
import time
from collections import deque
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from .models import VoiceMessage, VoiceMessageKind

logger = logging.getLogger("voice_service")


# Display names spoken in the welcome message for the demo drivers (User A, User B, Guest).
DRIVER_NAMES = {"VEH-001": "User A", "VEH-002": "User B", "VEH-003": "Guest"}


class VoiceService:
    """Manages generation, deduplication, and lifecycle of driver voice announcements."""

    def __init__(
        self,
        cooldown_seconds: float = 5.0,
        event_ttl_seconds: float = 300.0,
        max_log_size: int = 200,
        announce_duration_warning: bool = False,
    ) -> None:
        self.cooldown_seconds = cooldown_seconds
        self.event_ttl_seconds = event_ttl_seconds
        self.announce_duration_warning = announce_duration_warning
        self._seen_events: Dict[str, float] = {}
        self._vehicle_last_spoken: Dict[Tuple[str, str], float] = {}
        self._active_message: Optional[VoiceMessage] = None
        self._announcement_log: deque = deque(maxlen=max_log_size)

    # ── Direction Condenser ───────────────────────────────────────────────────

    @staticmethod
    def condense_directions(directions: Optional[List[str]]) -> str:
        """
        Condense verbose navigation waypoints into 1-2 clean spoken sentences.
        Collapses consecutive intermediate waypoints.
        """
        if not directions:
            return ""

        # Filter out trivial steps
        steps = [
            s.strip()
            for s in directions
            if s and not s.lower().startswith("start at") and not s.lower().startswith("arrive at")
        ]

        if not steps:
            return ""

        if len(steps) == 1:
            return f"Follow the driving aisle through {steps[0].replace('Proceed through ', '')}."

        if len(steps) <= 3:
            cleaned = [s.replace("Proceed through ", "") for s in steps]
            return f"Follow the driving aisle via {', then '.join(cleaned)} to your bay."

        # More than 3 steps: summarize key intermediate waypoints
        first_waypoint = steps[0].replace("Proceed through ", "")
        last_waypoint = steps[-1].replace("Proceed through ", "")
        return f"Follow the driving aisle past {first_waypoint} toward {last_waypoint}."

    # ── Message Builders ──────────────────────────────────────────────────────

    def build_assignment_message(
        self,
        *,
        event_id: str,
        vehicle_id: str,
        assigned_bay: str,
        route_directions: Optional[List[str]] = None,
        driver_name: Optional[str] = None,
        source: str = "live",
    ) -> Optional[VoiceMessage]:
        """
        Create the announcement when a vehicle is verified and assigned a parking bay.

        Deliberately one short sentence group with no route talk:
        "Verification successful. Welcome <name>. Your place is <bay>."
        `route_directions` is accepted for caller compatibility but is not spoken.
        """
        try:
            if self._is_duplicate(event_id):
                return None

            if self._is_on_cooldown(vehicle_id, VoiceMessageKind.ASSIGNMENT.value):
                return None

            name = driver_name or DRIVER_NAMES.get(vehicle_id) or "driver"
            full_text = f"Verification successful. Welcome {name}. Your place is {assigned_bay}."

            msg = VoiceMessage(
                event_id=event_id,
                kind=VoiceMessageKind.ASSIGNMENT.value,
                text=full_text,
                priority=50,
                vehicle_id=vehicle_id,
                source=source,
            )
            return self._record_and_dispatch(msg)
        except Exception as e:
            logger.error(f"VoiceService failed to build assignment message: {e}", exc_info=True)
            return None

    def build_wrong_bay_warning(
        self,
        *,
        event_id: str,
        vehicle_id: str,
        assigned_bay: str,
        actual_bay: Optional[str] = None,
        source: str = "live",
    ) -> Optional[VoiceMessage]:
        """
        Create urgent warning when vehicle enters an incorrect bay.
        High priority (100) pre-empts any in-flight navigation speech.
        """
        try:
            if self._is_duplicate(event_id):
                return None

            if self._is_on_cooldown(vehicle_id, VoiceMessageKind.WRONG_BAY_WARNING.value):
                return None

            text = f"Warning! This is not your designated parking space. Please move to space {assigned_bay}."
            msg = VoiceMessage(
                event_id=event_id,
                kind=VoiceMessageKind.WRONG_BAY_WARNING.value,
                text=text,
                priority=100,
                vehicle_id=vehicle_id,
                source=source,
            )
            return self._record_and_dispatch(msg)
        except Exception as e:
            logger.error(f"VoiceService failed to build wrong bay warning: {e}", exc_info=True)
            return None

    def build_duration_warning_message(
        self,
        *,
        event_id: str,
        vehicle_id: str,
        assigned_bay: str,
        actual_bay: Optional[str] = None,
        source: str = "live",
    ) -> Optional[VoiceMessage]:
        """
        Build optional announcement when a vehicle is in duration warning state (8-min mark).
        Disabled by default (announce_duration_warning=False) to avoid unauthorized driver speech.
        """
        if not self.announce_duration_warning:
            return None

        try:
            if self._is_duplicate(event_id):
                return None

            if self._is_on_cooldown(vehicle_id, "WRONG_BAY_DURATION_WARNING"):
                return None

            text = f"Warning! Grace period ending in 2 minutes. Please relocate to space {assigned_bay}."
            msg = VoiceMessage(
                event_id=event_id,
                kind="WRONG_BAY_DURATION_WARNING",
                text=text,
                priority=90,
                vehicle_id=vehicle_id,
                source=source,
            )
            return self._record_and_dispatch(msg)
        except Exception as e:
            logger.error(f"VoiceService failed to build duration warning message: {e}", exc_info=True)
            return None

    def build_failure_message(
        self,
        failure_type: str,
        *,
        event_id: Optional[str] = None,
        vehicle_id: Optional[str] = None,
        assigned_bay: Optional[str] = None,
        source: str = "live",
    ) -> Optional[VoiceMessage]:
        """
        Create spoken announcements for parking failure modes.
          - unknown_plate: 'Vehicle not recognised. Please contact the attendant.'
          - no_assignment: 'No parking space is assigned. Please contact the attendant.'
          - bay_unavailable: 'Your assigned space is currently unavailable. Please contact the attendant.'
          - no_route: 'Your designated parking space is {assigned_bay}.'
        """
        try:
            eid = event_id or f"FAIL-{failure_type}-{int(time.time() * 1000)}"
            if self._is_duplicate(eid):
                return None

            if failure_type == "unknown_plate":
                text = "Vehicle not recognised. Please contact the attendant."
            elif failure_type == "no_assignment":
                text = "No parking space is assigned. Please contact the attendant."
            elif failure_type == "bay_unavailable":
                text = "Your assigned space is currently unavailable. Please contact the attendant."
            elif failure_type == "no_route":
                bay_label = assigned_bay or "your designated space"
                text = f"Your designated parking space is {bay_label}."
            else:
                text = "Please contact the parking attendant for assistance."

            msg = VoiceMessage(
                event_id=eid,
                kind=VoiceMessageKind.ERROR.value,
                text=text,
                priority=80,
                vehicle_id=vehicle_id,
                source=source,
            )
            return self._record_and_dispatch(msg)
        except Exception as e:
            logger.error(f"VoiceService failed to build failure message: {e}", exc_info=True)
            return None

    # ── Deduplication, Cooldown & Priority Dispatch ───────────────────────────

    def _is_duplicate(self, event_id: str) -> bool:
        """Check if an event_id was already processed within TTL."""
        now = time.time()
        self._prune_seen_events(now)
        return event_id in self._seen_events

    def _is_on_cooldown(self, vehicle_id: str, kind: str) -> bool:
        """Check if vehicle is on cooldown for a given message kind."""
        now = time.time()
        last = self._vehicle_last_spoken.get((vehicle_id, kind))
        if last and (now - last) < self.cooldown_seconds:
            return True
        return False

    def _prune_seen_events(self, now: float) -> None:
        """Remove expired event ids."""
        expired = [eid for eid, t in self._seen_events.items() if now - t > self.event_ttl_seconds]
        for eid in expired:
            del self._seen_events[eid]

    def _record_and_dispatch(self, msg: VoiceMessage) -> VoiceMessage:
        """Record dispatched message, track pre-emption, and update state."""
        now = time.time()
        self._seen_events[msg.event_id] = now
        if msg.vehicle_id:
            self._vehicle_last_spoken[(msg.vehicle_id, msg.kind)] = now

        # Priority pre-emption: check if higher priority replaces currently active
        canceled_msg = None
        if self._active_message and msg.priority > self._active_message.priority:
            canceled_msg = self._active_message
            self.cancel_message(canceled_msg.message_id, reason="preempted_by_higher_priority")

        self._active_message = msg
        log_entry = {
            "action": "ANNOUNCEMENT",
            "message_id": msg.message_id,
            "event_id": msg.event_id,
            "kind": msg.kind,
            "priority": msg.priority,
            "text": msg.text,
            "vehicle_id": msg.vehicle_id,
            "source": msg.source,
            "timestamp": msg.ts,
            "preempted_message_id": canceled_msg.message_id if canceled_msg else None,
        }
        self._announcement_log.append(log_entry)
        return msg

    def cancel_message(self, message_id: str, reason: str = "canceled") -> Dict[str, Any]:
        """Cancel a pending voice announcement."""
        cancel_event = {
            "action": "CANCEL",
            "message_id": message_id,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._announcement_log.append(cancel_event)
        if self._active_message and self._active_message.message_id == message_id:
            self._active_message = None
        return cancel_event

    def get_announcements_log(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return the recent voice announcement log."""
        out = list(self._announcement_log)
        return out[-max(1, limit):]

    def reset(self) -> None:
        """Clear all active announcements and cooldown tracking."""
        self._seen_events.clear()
        self._vehicle_last_spoken.clear()
        self._active_message = None
        self._announcement_log.clear()


# Global singleton voice service
_voice_service = VoiceService()


def get_voice_service() -> VoiceService:
    """Return the application singleton voice service."""
    return _voice_service
