import pytest
from backend.services.navigation_service import compute_route, NAV_NODES

def test_navigation_nodes_exist():
    assert "ENTRY_GATE" in NAV_NODES
    assert "EXIT_RAMP" in NAV_NODES
    assert "P01" in NAV_NODES
    assert "P07" in NAV_NODES

def test_route_entry_to_p02():
    route = compute_route("ENTRY_GATE", "P02")
    assert route is not None
    assert route["source"] == "ENTRY_GATE"
    assert route["destination"] == "P02"
    assert route["path"] == ["ENTRY_GATE", "MAIN_LANE", "JUNCTION_A", "AISLE_A", "P02"]
    assert route["distance_meters"] == 42.0
    assert len(route["waypoints"]) == 5
    assert len(route["directions"]) == 5

def test_route_entry_to_p07():
    route = compute_route("ENTRY_GATE", "P07")
    assert route is not None
    assert route["source"] == "ENTRY_GATE"
    assert route["destination"] == "P07"
    assert route["path"] == ["ENTRY_GATE", "MAIN_LANE", "JUNCTION_B", "AISLE_B", "P07"]
    assert route["distance_meters"] == 42.0

def test_invalid_nodes():
    assert compute_route("NON_EXISTENT", "P02") is None
    assert compute_route("ENTRY_GATE", "INVALID_SLOT") is None
