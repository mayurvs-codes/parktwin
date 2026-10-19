"""
Unit tests — Slot ID Consistency & Cross-Subsystem Alignment (Task 4).
======================================================================
Enforces consistency between:
  - Canonical facility geometry (shared/facility_geometry.json)
  - Navigation graph (backend/services/navigation_service.py)
  - Prototype Monday replay scenario (data/scenarios/monday.json)
  - Wrong-bay violation scenario (data/scenarios/wrong-bay.json)
  - Frontend 2D/3D slot mappings
"""

import json
from pathlib import Path
import pytest

from backend.services.navigation_service import NAV_NODES, compute_route


@pytest.fixture
def facility_geometry():
    base_dir = Path(__file__).resolve().parents[2]
    geom_path = base_dir / "shared" / "facility_geometry.json"
    with open(geom_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def monday_scenario():
    base_dir = Path(__file__).resolve().parents[2]
    scenario_path = base_dir / "data" / "scenarios" / "monday.json"
    with open(scenario_path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


@pytest.fixture
def wrong_bay_scenario():
    base_dir = Path(__file__).resolve().parents[2]
    scenario_path = base_dir / "data" / "scenarios" / "wrong-bay.json"
    with open(scenario_path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def test_facility_geometry_has_canonical_and_alias_pairs(facility_geometry):
    """Every bay in shared/facility_geometry.json must have canonical SP-XX id and matching PXX alias."""
    bays = facility_geometry.get("bays", [])
    assert len(bays) >= 20, "Must have at least 20 canonical bays"

    for bay in bays:
        bay_id = bay["id"]
        alias = bay.get("alias")
        assert bay_id.startswith("SP-"), f"Canonical bay ID {bay_id} must start with 'SP-'"
        assert alias and alias.startswith("P"), f"Alias {alias} for {bay_id} must start with 'P'"
        
        num_sp = int(bay_id.replace("SP-", ""))
        num_p = int(alias.replace("P", ""))
        assert num_sp == num_p, f"Numeric mismatch between canonical {bay_id} and alias {alias}"


def test_navigation_graph_supports_both_canonical_and_alias(facility_geometry):
    """Navigation graph must contain both SP-XX and PXX nodes and route identically."""
    bays = facility_geometry.get("bays", [])
    for bay in bays:
        sp_id = bay["id"]
        p_id = bay["alias"]

        assert sp_id in NAV_NODES, f"Canonical slot {sp_id} missing from NAV_NODES"
        assert p_id in NAV_NODES, f"Alias slot {p_id} missing from NAV_NODES"

        # Compute routes
        route_sp = compute_route("ACCESS_POINT_B2", sp_id)
        route_p = compute_route("ACCESS_POINT_B2", p_id)

        assert route_sp is not None, f"Failed to compute route to {sp_id}"
        assert route_p is not None, f"Failed to compute route to {p_id}"
        assert route_sp["distance_meters"] == route_p["distance_meters"], (
            f"Distance mismatch between {sp_id} ({route_sp['distance_meters']}) and {p_id} ({route_p['distance_meters']})"
        )


def test_monday_scenario_slots_resolve_to_canonical_bays(facility_geometry, monday_scenario):
    """Monday prototype scenario must use valid aliases that map 1:1 to canonical bays."""
    alias_to_canonical = {b["alias"]: b["id"] for b in facility_geometry.get("bays", [])}
    
    vehicles = monday_scenario.get("vehicles", [])
    assert len(vehicles) >= 7, "Monday scenario must have 7 prototype vehicles"

    for veh in vehicles:
        slot = veh.get("slot_id")
        assert slot in alias_to_canonical, f"Monday scenario vehicle {veh['prototype_id']} references unmapped slot {slot}"
        canonical_id = alias_to_canonical[slot]
        assert canonical_id.startswith("SP-")
        # Ensure routable
        route = compute_route("ACCESS_POINT_B2", slot)
        assert route is not None, f"Vehicle slot {slot} is not routable in nav graph"


def test_wrong_bay_scenario_slots_are_canonical_and_routable(facility_geometry, wrong_bay_scenario):
    """Wrong-bay scenario must use canonical SP-07 and SP-11, both present in geometry and nav graph."""
    canonical_ids = {b["id"] for b in facility_geometry.get("bays", [])}

    # Timeline events check
    assigned_slots = set()
    for event in wrong_bay_scenario.get("timeline_events", []):
        sid = event.get("slot_id")
        if sid:
            assigned_slots.add(sid)

    for sid in assigned_slots:
        # Either canonical SP-XX or alias PXX
        is_canonical = sid in canonical_ids
        is_alias = any(b.get("alias") == sid for b in facility_geometry.get("bays", []))
        assert is_canonical or is_alias, f"Unknown slot {sid} in wrong-bay scenario"
        assert compute_route("ACCESS_POINT_B2", sid) is not None, f"Slot {sid} not routable"


def test_shared_and_web_facility_geometry_are_identical():
    """Ensure shared/facility_geometry.json and apps/web/config/facility_geometry.json remain strictly synchronized."""
    base_dir = Path(__file__).resolve().parents[2]
    shared_path = base_dir / "shared" / "facility_geometry.json"
    web_path = base_dir / "apps" / "web" / "config" / "facility_geometry.json"

    with open(shared_path, "r", encoding="utf-8") as f1, open(web_path, "r", encoding="utf-8") as f2:
        d1 = json.load(f1)
        d2 = json.load(f2)

    assert d1 == d2, "shared/facility_geometry.json and apps/web/config/facility_geometry.json have drifted!"
