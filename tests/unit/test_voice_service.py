"""
Unit tests — Voice Assistant Service (Phase 4 Backend).
========================================================
Verifies:
  - message text built from real assignment/route
  - condensation of verbose navigation waypoints into concise instructions
  - dedup by event_id
  - per-vehicle cooldown for same message kind
  - priority pre-emption (warnings pre-empt route directions)
  - each failure-case message (unknown plate, no assignment, bay unavailable, no route)
  - resilience: internal exceptions caught cleanly without raising
"""

import time
import pytest
from modules.integration_layer.voice.models import VoiceMessageKind
from modules.integration_layer.voice.service import VoiceService


@pytest.fixture
def voice():
    return VoiceService(cooldown_seconds=1.0, event_ttl_seconds=60.0)


def test_assignment_message_built_from_real_assignment_and_route(voice):
    """Assignment text correctly combines designated bay and condensed route instructions."""
    directions = [
        "Start at B2 Access Point",
        "Proceed through North Junction",
        "Proceed through Upper West Junction",
        "Arrive at destination Slot P07",
    ]
    msg = voice.build_assignment_message(
        event_id="EV-ANPR-001",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        route_directions=directions,
        source="test",
    )
    assert msg is not None
    assert "Your designated parking space is SP-07" in msg.text
    assert "Follow the driving aisle" in msg.text
    assert "North Junction" in msg.text
    assert "Upper West Junction" in msg.text
    assert msg.priority == 50
    assert msg.kind == VoiceMessageKind.ASSIGNMENT.value


def test_dedup_by_event_id_suppresses_duplicates(voice):
    """Same event_id processed multiple times emits exactly once."""
    msg1 = voice.build_assignment_message(
        event_id="EV-DUP-100",
        vehicle_id="VEH-002",
        assigned_bay="SP-14",
    )
    assert msg1 is not None

    # Duplicate call with identical event_id
    msg2 = voice.build_assignment_message(
        event_id="EV-DUP-100",
        vehicle_id="VEH-002",
        assigned_bay="SP-14",
    )
    assert msg2 is None  # Suppressed


def test_per_vehicle_cooldown(voice):
    """Same vehicle triggering same kind within cooldown window is throttled."""
    msg1 = voice.build_assignment_message(
        event_id="EV-CD-1",
        vehicle_id="VEH-003",
        assigned_bay="SP-04",
    )
    assert msg1 is not None

    # Immediate second event for same vehicle & kind
    msg2 = voice.build_assignment_message(
        event_id="EV-CD-2",
        vehicle_id="VEH-003",
        assigned_bay="SP-04",
    )
    assert msg2 is None  # Throttled by cooldown

    # Different vehicle is NOT throttled
    msg3 = voice.build_assignment_message(
        event_id="EV-CD-3",
        vehicle_id="VEH-004",
        assigned_bay="SP-05",
    )
    assert msg3 is not None


def test_priority_preemption_warning_preempts_route(voice):
    """Wrong-bay warning (priority 100) pre-empts lower priority route speech (priority 50)."""
    route_msg = voice.build_assignment_message(
        event_id="EV-ROUTE-01",
        vehicle_id="VEH-005",
        assigned_bay="SP-07",
    )
    assert route_msg is not None

    # Urgent warning arrives
    warn_msg = voice.build_wrong_bay_warning(
        event_id="EV-WARN-01",
        vehicle_id="VEH-005",
        assigned_bay="SP-07",
        actual_bay="SP-11",
    )
    assert warn_msg is not None
    assert warn_msg.priority == 100
    assert "Warning! This is not your designated parking space." in warn_msg.text
    assert "Please move to space SP-07" in warn_msg.text

    # Log records the preemption
    log = voice.get_announcements_log(limit=10)
    preempted_entries = [e for e in log if e.get("preempted_message_id") == route_msg.message_id]
    assert len(preempted_entries) == 1


def test_failure_case_messages(voice):
    """Verify distinct spoken announcements for each failure mode."""
    # Unknown plate
    msg_unknown = voice.build_failure_message("unknown_plate")
    assert "Vehicle not recognised" in msg_unknown.text

    # No assignment
    msg_no_assign = voice.build_failure_message("no_assignment")
    assert "No parking space is assigned" in msg_no_assign.text

    # Bay unavailable
    msg_unavail = voice.build_failure_message("bay_unavailable")
    assert "currently unavailable" in msg_unavail.text

    # No route -> announces destination only without inventing directions
    msg_no_route = voice.build_failure_message("no_route", assigned_bay="SP-14")
    assert "Your designated parking space is SP-14" in msg_no_route.text
    assert "Follow" not in msg_no_route.text  # No invented directions!


def test_voice_exception_never_raises(voice, monkeypatch):
    """Simulate internal exception in message building; service catches and returns None."""
    def bad_condense(*args):
        raise RuntimeError("Speech synthesis fault")

    monkeypatch.setattr(voice, "condense_directions", bad_condense)
    res = voice.build_assignment_message(
        event_id="EV-ERR-1",
        vehicle_id="VEH-ERR",
        assigned_bay="SP-01",
        route_directions=["step 1"],
    )
    assert res is None  # Caught cleanly, no exception raised
