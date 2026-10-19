"""
Unit tests — Violation Engine (Module 2 + Phase 3 Episodes).

Verifies:
  - Original violation flags: overstay, reserved_occupied, unauthorized_parking
  - Phase 3 episodes:
      * wrong entry -> exactly one warning; repeated frames -> still one
      * stays 600 s (fake clock) -> one escalation
      * leaves at 5 min -> resolved, no escalation
      * A->B relocation -> timer reset
      * wrong->assigned -> resolved, no carry-over
      * exit before threshold -> no violation
      * unassigned vehicle -> UNASSIGNED_VEHICLE_IN_BAY (no wrong-bay warning)
      * authorised long-stay > 10 min -> LONG_STAY_ALERT separate from wrong-bay
"""

from datetime import datetime, timedelta, timezone
from modules.parking_intelligence.violations.violation_engine import ViolationEngine
from modules.parking_intelligence.duration.duration_tracker import evaluate_long_stay_alert


def _dt(offset_sec: float = 0.0) -> datetime:
    return datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc) + timedelta(seconds=offset_sec)


# ── Original Tests (Preserved) ────────────────────────────────────────────────

def test_overstay_flag():
    v = ViolationEngine(max_duration_hours=1)
    flags = v.evaluate(duration_seconds=2 * 3600, is_reserved_slot=False)
    assert ViolationEngine.FLAG_OVERSTAY in flags


def test_no_overstay_within_limit():
    v = ViolationEngine(max_duration_hours=24)
    flags = v.evaluate(duration_seconds=3600, is_reserved_slot=False)
    assert ViolationEngine.FLAG_OVERSTAY not in flags


def test_reserved_occupied_flag():
    v = ViolationEngine()
    flags = v.evaluate(
        duration_seconds=10, is_reserved_slot=True,
        reserved_for="OWNER1", license_plate="KA01AB1234",
    )
    assert ViolationEngine.FLAG_RESERVED in flags


def test_reserved_owner_ok():
    v = ViolationEngine()
    flags = v.evaluate(
        duration_seconds=10, is_reserved_slot=True,
        reserved_for="KA01AB1234", license_plate="KA01AB1234",
    )
    assert ViolationEngine.FLAG_RESERVED not in flags


def test_unauthorized_when_no_plate():
    v = ViolationEngine()
    flags = v.evaluate(duration_seconds=10, is_reserved_slot=False, license_plate=None)
    assert ViolationEngine.FLAG_UNAUTHORIZED in flags


def test_registered_authorized_no_flag():
    v = ViolationEngine()
    flags = v.evaluate(
        duration_seconds=10, is_reserved_slot=False,
        license_plate="KA01AB1234", is_registered=True,
    )
    assert flags == []


def test_merge_union_sorted():
    merged = ViolationEngine.merge(["overstay"], ["unauthorized_parking", "overstay"])
    assert merged == ["overstay", "unauthorized_parking"]


# ── Phase 3 Episode Tests ─────────────────────────────────────────────────────

def test_wrong_entry_emits_exactly_one_warning_repeated_frames_suppressed():
    """Vehicle assigned SP-07 enters SP-11: exactly one warning emitted across repeated frames."""
    v = ViolationEngine()
    t0 = _dt(0)

    # Frame 1: Wrong bay entry
    events1 = v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )
    assert len(events1) == 1
    assert events1[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ENTRY_WARNING
    assert events1[0]["actual_bay"] == "SP-11"
    assert events1[0]["assigned_bay"] == "SP-07"

    # Frame 2-5: Vehicle remains in SP-11
    for step in range(1, 5):
        events_n = v.on_bay_entry(
            track_id=1,
            bay_id="SP-11",
            vehicle_id="VEH-001",
            assigned_bay="SP-07",
            timestamp=_dt(step * 0.1),
        )
        assert len(events_n) == 0  # No duplicate warnings

    episodes = v.get_episodes(active_only=True)
    assert len(episodes) == 1
    assert episodes[0]["state"] == "WARNED"


def test_stays_600s_produces_one_escalation():
    """Vehicle stays in wrong bay for 600s (10 min) -> WRONG_BAY_ESCALATED."""
    v = ViolationEngine()
    t0 = _dt(0)

    v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )

    # Check at 480s: duration warning
    warn_480 = v.evaluate_episodes(now=_dt(480.0))
    assert len(warn_480) == 1
    assert warn_480[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_DURATION_WARNING

    # Check at 599s: not yet escalated
    esc_599 = [e for e in v.evaluate_episodes(now=_dt(599.0)) if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED]
    assert len(esc_599) == 0

    # Check at 600s: escalated!
    esc_600 = [e for e in v.evaluate_episodes(now=_dt(600.0)) if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED]
    assert len(esc_600) == 1
    assert esc_600[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED
    assert esc_600[0]["duration_seconds"] == 600.0

    # Check at 650s: no duplicate escalation
    esc_650 = [e for e in v.evaluate_episodes(now=_dt(650.0)) if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED]
    assert len(esc_650) == 0



def test_leaves_at_5_min_resolved_no_escalation():
    """Vehicle leaves wrong bay at 300s (5 min) -> WRONG_BAY_RESOLVED, timer stopped, no escalation."""
    v = ViolationEngine()
    t0 = _dt(0)

    v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )

    # Leaves at 300s
    t_leave = _dt(300.0)
    res_events = v.on_bay_exit("SP-11", vehicle_id="VEH-001", timestamp=t_leave)
    assert len(res_events) == 1
    assert res_events[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_RESOLVED
    assert res_events[0]["reason"] == "left_bay"
    assert res_events[0]["duration_seconds"] == 300.0

    # At 700s, evaluation should find NO active episodes to escalate
    esc_700 = v.evaluate_episodes(now=_dt(700.0))
    assert len(esc_700) == 0

    active_eps = v.get_episodes(active_only=True)
    assert len(active_eps) == 0


def test_relocation_a_to_b_resets_timer():
    """Vehicle moves from wrong-bay SP-11 to wrong-bay SP-12 -> closes episode A, starts B with fresh 0s timer."""
    v = ViolationEngine()
    t0 = _dt(0)

    # Enters SP-11 at t=0
    v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )

    # At t=400s, vehicle moves to SP-12
    t_move = _dt(400.0)
    move_events = v.on_bay_entry(
        track_id=1,
        bay_id="SP-12",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t_move,
    )

    # Must contain resolution for SP-11 AND warning for SP-12
    res = [e for e in move_events if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_RESOLVED]
    warn = [e for e in move_events if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ENTRY_WARNING]
    assert len(res) == 1
    assert res[0]["actual_bay"] == "SP-11"
    assert res[0]["reason"] == "relocated_to_another_bay"
    assert len(warn) == 1
    assert warn[0]["actual_bay"] == "SP-12"

    # At t=650s (250s after entering SP-12), SP-12 should NOT escalate yet
    esc_650 = v.evaluate_episodes(now=_dt(650.0))
    assert len(esc_650) == 0

    # At t=881s (481s after entering SP-12), SP-12 emits duration warning
    warn_881 = v.evaluate_episodes(now=_dt(881.0))
    assert len(warn_881) == 1
    assert warn_881[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_DURATION_WARNING

    # At t=1001s (601s after entering SP-12), SP-12 escalates
    esc_1001 = v.evaluate_episodes(now=_dt(1001.0))
    assert len(esc_1001) == 1
    assert esc_1001[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED
    assert esc_1001[0]["actual_bay"] == "SP-12"



def test_wrong_to_assigned_resolved_no_carry_over():
    """Vehicle in wrong bay moves to assigned bay SP-07 -> episode resolved, timer discarded, no warning."""
    v = ViolationEngine()
    t0 = _dt(0)

    v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )

    # Moves to assigned bay SP-07 at t=200s
    t_correct = _dt(200.0)
    events = v.on_bay_entry(
        track_id=1,
        bay_id="SP-07",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t_correct,
    )

    res = [e for e in events if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_RESOLVED]
    warn = [e for e in events if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ENTRY_WARNING]
    assert len(res) == 1
    assert res[0]["reason"] == "entered_assigned_bay"
    assert len(warn) == 0
    assert len(v.get_episodes(active_only=True)) == 0


def test_facility_exit_before_threshold_no_violation():
    """Vehicle leaves facility at 450s (< 600s) -> episode resolved, no escalation."""
    v = ViolationEngine()
    t0 = _dt(0)

    v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )

    exit_events = v.on_facility_exit("VEH-001", timestamp=_dt(450.0))
    assert len(exit_events) == 1
    assert exit_events[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_RESOLVED
    assert exit_events[0]["reason"] == "facility_exit"

    # At 700s, no escalation occurs
    esc = v.evaluate_episodes(now=_dt(700.0))
    assert len(esc) == 0


def test_unassigned_vehicle_in_bay_emits_info_only():
    """Unknown vehicle with no assigned bay emits UNASSIGNED_VEHICLE_IN_BAY, not wrong-bay warning."""
    v = ViolationEngine()
    events = v.on_bay_entry(
        track_id=99,
        bay_id="SP-03",
        vehicle_id=None,
        assigned_bay=None,
        timestamp=_dt(0),
    )
    assert len(events) == 1
    assert events[0]["event_type"] == ViolationEngine.EVENT_UNASSIGNED_VEHICLE
    assert len(v.get_episodes(active_only=True)) == 0


def test_authorised_long_stay_separate_from_wrong_bay():
    """
    Authorised vehicle parked in correct bay SP-07 for >10 min triggers LONG_STAY_ALERT,
    while wrong-bay warning/escalation remains completely untouched.
    """
    v = ViolationEngine()
    t0 = _dt(0)

    # Vehicle parks in designated bay SP-07
    entry_events = v.on_bay_entry(
        track_id=1,
        bay_id="SP-07",
        vehicle_id="VEH-001",
        assigned_bay="SP-07",
        timestamp=t0,
    )
    # No wrong-bay warning
    assert len(entry_events) == 0
    assert len(v.get_episodes(active_only=True)) == 0

    # Authorised duration tracker evaluates at 10 minutes (600s)
    res = evaluate_long_stay_alert(t0, "SP-07", "SP-07", now=_dt(600.0))
    assert res["is_alert"] is True
    assert res["status"] == "LONG_STAY_ALERT"
    # Violation engine episodes still 0
    assert len(v.evaluate_episodes(now=_dt(600.0))) == 0


def test_violations_api_endpoint():
    """Test GET /violations/episodes endpoint returns active episodes."""
    from fastapi.testclient import TestClient
    from backend.app.app import create_app
    from modules.integration_layer.services.registry import get_integration_service

    app = create_app()
    client = TestClient(app, base_url="http://testserver")

    # Ingest a wrong-bay episode in the canonical engine
    integ = get_integration_service()
    integ.engine.violations.reset()
    integ.engine.violations.on_bay_entry(
        track_id=77,
        bay_id="SP-11",
        vehicle_id="VEH-TEST-99",
        assigned_bay="SP-07",
    )

    resp = client.get("/violations/episodes?active=true", headers={"Authorization": "Bearer dev_admin_token"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    ep = next((e for e in data if e["vehicle_id"] == "VEH-TEST-99"), None)
    assert ep is not None
    assert ep["actual_bay"] == "SP-11"
    assert ep["assigned_bay"] == "SP-07"
    assert ep["state"] == "WARNED"


def test_wrong_bay_clock_injection_599s_and_601s():
    """Task B.1: wrong-bay entry, advance to 599s (no escalation), then 601s (exactly one escalation), leave before 600s (none)."""
    v = ViolationEngine()
    t0 = _dt(0)

    # 1. Entry at t=0
    v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-CLOCK-01",
        assigned_bay="SP-07",
        timestamp=t0,
    )

    # Advance to 480s: duration warning emitted
    warn_480 = v.evaluate_episodes(now=_dt(480.0))
    assert len(warn_480) == 1
    assert warn_480[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_DURATION_WARNING

    # Advance to 599s: no escalation
    esc_599 = [e for e in v.evaluate_episodes(now=_dt(599.0)) if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED]
    assert len(esc_599) == 0, "At 599s, no escalation must occur"
    ep_active = v.get_episode(v._active_by_vehicle["VEH-CLOCK-01"])
    assert ep_active["escalated"] is False

    # Advance to 601s: exactly one WRONG_BAY_ESCALATED
    esc_601 = [e for e in v.evaluate_episodes(now=_dt(601.0)) if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED]
    assert len(esc_601) == 1, "At 601s, exactly one escalation must be emitted"
    assert esc_601[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED
    assert esc_601[0]["actual_bay"] == "SP-11"
    assert esc_601[0]["assigned_bay"] == "SP-07"
    assert esc_601[0]["duration_seconds"] == 601.0
    assert ep_active["state"] == "ESCALATED"

    # Subsequent advance to 650s: no duplicate escalation
    esc_650 = [e for e in v.evaluate_episodes(now=_dt(650.0)) if e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED]
    assert len(esc_650) == 0, "No duplicate escalation allowed"


    # 2. Leave before 600s (e.g. at 350s) -> none
    v2 = ViolationEngine()
    v2.on_bay_entry(
        track_id=2,
        bay_id="SP-11",
        vehicle_id="VEH-CLOCK-02",
        assigned_bay="SP-07",
        timestamp=t0,
    )
    v2.on_bay_exit("SP-11", vehicle_id="VEH-CLOCK-02", timestamp=_dt(350.0))
    # At 601s: no escalation occurs because episode was resolved
    esc_v2 = v2.evaluate_episodes(now=_dt(601.0))
    assert len(esc_v2) == 0, "Vehicle that left before 600s must never escalate"


def test_timeline_479s_481s_599s_601s_with_relocation_and_exit():
    """Task E.2: 479s (WARNED only) / 481s (DURATION_WARNING) / 599s (no escalation) / 601s (escalation).
    Also: leave at 5 min (none), relocate to assigned bay at 9 min (resolved, no warning/escalation), exit at 7 min (none).
    """
    v = ViolationEngine()
    t0 = _dt(0)

    # Vehicle enters SP-11 instead of assigned SP-07
    entry_events = v.on_bay_entry(
        track_id=1,
        bay_id="SP-11",
        vehicle_id="VEH-TIME-01",
        assigned_bay="SP-07",
        timestamp=t0,
    )
    assert len(entry_events) == 1
    assert entry_events[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ENTRY_WARNING

    # At 479s: WARNED only (grace period still active)
    ev_479 = v.evaluate_episodes(now=_dt(479.0))
    assert len(ev_479) == 0
    ep = v.get_episode(v._active_by_vehicle["VEH-TIME-01"])
    assert ep["state"] == "WARNED"

    # At 481s: DURATION_WARNING (exactly one event, grace period ending)
    ev_481 = v.evaluate_episodes(now=_dt(481.0))
    assert len(ev_481) == 1
    assert ev_481[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_DURATION_WARNING
    assert ev_481[0]["status"] == "grace period ending"
    assert ev_481[0]["duration_seconds"] == 481.0
    assert ep["state"] == "WARNING_DURATION"

    # Repeated check at 490s: no duplicate duration warning
    assert len(v.evaluate_episodes(now=_dt(490.0))) == 0

    # At 599s: no escalation
    ev_599 = v.evaluate_episodes(now=_dt(599.0))
    assert len(ev_599) == 0
    assert ep["state"] == "WARNING_DURATION"

    # At 601s: exactly one escalation
    ev_601 = v.evaluate_episodes(now=_dt(601.0))
    assert len(ev_601) == 1
    assert ev_601[0]["event_type"] == ViolationEngine.EVENT_WRONG_BAY_ESCALATED
    assert ep["state"] == "ESCALATED"

    # Leave at 5 min (300s): none
    v_leave5 = ViolationEngine()
    v_leave5.on_bay_entry(track_id=2, bay_id="SP-11", vehicle_id="VEH-L5", assigned_bay="SP-07", timestamp=t0)
    v_leave5.on_bay_exit("SP-11", vehicle_id="VEH-L5", timestamp=_dt(300.0))
    assert len(v_leave5.evaluate_episodes(now=_dt(481.0))) == 0
    assert len(v_leave5.evaluate_episodes(now=_dt(601.0))) == 0

    # Relocate to assigned bay at 9 min (540s): resolved, no escalation, new timer at 0
    v_reloc = ViolationEngine()
    v_reloc.on_bay_entry(track_id=3, bay_id="SP-11", vehicle_id="VEH-R9", assigned_bay="SP-07", timestamp=t0)
    # At 481s it gets duration warning
    assert len(v_reloc.evaluate_episodes(now=_dt(481.0))) == 1
    # At 540s (9 min), moves into assigned bay SP-07!
    reloc_evs = v_reloc.on_bay_entry(track_id=3, bay_id="SP-07", vehicle_id="VEH-R9", assigned_bay="SP-07", timestamp=_dt(540.0))
    assert any(e["event_type"] == ViolationEngine.EVENT_WRONG_BAY_RESOLVED for e in reloc_evs)
    # At 601s (or 1000s): no wrong-bay escalation occurs
    assert len(v_reloc.evaluate_episodes(now=_dt(601.0))) == 0

    # Exit at 7 min (420s): none
    v_exit7 = ViolationEngine()
    v_exit7.on_bay_entry(track_id=4, bay_id="SP-11", vehicle_id="VEH-E7", assigned_bay="SP-07", timestamp=t0)
    v_exit7.on_bay_exit("SP-11", vehicle_id="VEH-E7", timestamp=_dt(420.0))
    assert len(v_exit7.evaluate_episodes(now=_dt(481.0))) == 0
    assert len(v_exit7.evaluate_episodes(now=_dt(601.0))) == 0


def test_single_episode_deduplication_all_stages():
    """Task E.3: Confirm early-entry warning, parked frames, 8-min warning, and 10-min escalation all belong to one episode."""
    v = ViolationEngine()
    t0 = _dt(0)

    # 1. Early-entry / wrong-space warning
    e1 = v.on_bay_entry(track_id=1, bay_id="SP-11", vehicle_id="VEH-DEDUP", assigned_bay="SP-07", timestamp=t0)
    assert len(e1) == 1
    ep_id = e1[0]["episode_id"]

    # 2. Repeated parked frames in SP-11: zero duplicate warnings
    for s in range(1, 10):
        e_n = v.on_bay_entry(track_id=1, bay_id="SP-11", vehicle_id="VEH-DEDUP", assigned_bay="SP-07", timestamp=_dt(s))
        assert len(e_n) == 0

    # 3. 8-min warning belongs to same episode_id
    e_8min = v.evaluate_episodes(now=_dt(481.0))
    assert len(e_8min) == 1
    assert e_8min[0]["episode_id"] == ep_id

    # Repeated calls at 8-min: 0 duplicates
    assert len(v.evaluate_episodes(now=_dt(482.0))) == 0
    assert len(v.evaluate_episodes(now=_dt(500.0))) == 0

    # 4. 10-min escalation belongs to same episode_id
    e_10min = v.evaluate_episodes(now=_dt(601.0))
    assert len(e_10min) == 1
    assert e_10min[0]["episode_id"] == ep_id

    # Repeated calls at 10-min+: 0 duplicates
    assert len(v.evaluate_episodes(now=_dt(602.0))) == 0
    assert len(v.evaluate_episodes(now=_dt(700.0))) == 0

    # All events belonged to the exact single episode
    active = v.get_episodes(active_only=True)
    assert len(active) == 1
    assert active[0]["episode_id"] == ep_id


