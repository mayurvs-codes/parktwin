import pytest
from backend.services.navigation_service import compute_route, NAV_NODES

def test_navigation_nodes_exist():
    # Canonical Digital Twin navigation nodes
    assert "ACCESS_POINT_B2" in NAV_NODES
    assert "NORTH_JUNCTION" in NAV_NODES
    assert "P01" in NAV_NODES
    assert "P07" in NAV_NODES
    # Canonical floor plan coordinates (PDF points)
    assert NAV_NODES["ACCESS_POINT_B2"]["x"] == 706
    assert NAV_NODES["ACCESS_POINT_B2"]["y"] == 138
    assert NAV_NODES["P01"]["x"] == 648
    assert NAV_NODES["P01"]["y"] == 720
    assert NAV_NODES["P06"]["x"] == 476
    assert NAV_NODES["P06"]["y"] == 1480

def test_route_access_point_to_p01():
    route = compute_route("ACCESS_POINT_B2", "P01")
    assert route is not None
    assert route["source"] == "ACCESS_POINT_B2"
    assert route["destination"] == "P01"
    assert route["path"] == ["ACCESS_POINT_B2", "NORTH_JUNCTION", "UPPER_WEST_JUNCTION", "P01"]
    assert route["distance_meters"] == 431.0
    assert len(route["waypoints"]) == 4
    assert len(route["directions"]) == 4

def test_route_access_point_to_p06():
    route = compute_route("ACCESS_POINT_B2", "P06")
    assert route is not None
    assert route["source"] == "ACCESS_POINT_B2"
    assert route["destination"] == "P06"
    assert route["path"] == ["ACCESS_POINT_B2", "NORTH_JUNCTION", "UPPER_WEST_JUNCTION", "MID_WEST_JUNCTION", "P06"]
    assert route["distance_meters"] == 992.0

def test_invalid_nodes():
    assert compute_route("NON_EXISTENT", "P01") is None
    assert compute_route("ACCESS_POINT_B2", "INVALID_SLOT") is None
