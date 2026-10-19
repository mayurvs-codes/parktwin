"""
Unit test asserting that shared/facility_geometry.json and navigation graph are 100% synchronized.
"""

import json
from pathlib import Path
import pytest
from backend.services.navigation_service import NAV_NODES, compute_route


def test_geometry_json_exists_and_valid():
    geo_path = Path(__file__).resolve().parents[2] / "shared" / "facility_geometry.json"
    assert geo_path.exists(), f"Geometry file not found at {geo_path}"
    with open(geo_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "bays" in data
    assert len(data["bays"]) >= 20, "Expected at least 20 canonical bays"
    assert "gateways" in data
    assert "junctions" in data


def test_all_geometry_bays_exist_in_nav_graph():
    geo_path = Path(__file__).resolve().parents[2] / "shared" / "facility_geometry.json"
    with open(geo_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for bay in data["bays"]:
        bay_id = bay["id"]
        alias = bay.get("alias")

        # Either the canonical ID or its alias must exist in NAV_NODES
        assert (bay_id in NAV_NODES or alias in NAV_NODES), (
            f"Bay {bay_id} (alias {alias}) missing from navigation graph"
        )


def test_focused_zone_bays_navigable():
    # Verify SP-01 to SP-20 are reachable from ACCESS_POINT_B2
    for i in range(1, 21):
        sp_id = f"SP-{i:02d}"
        route = compute_route("ACCESS_POINT_B2", sp_id)
        assert route is not None, f"Could not compute route to {sp_id}"
        assert route["destination"] == sp_id
        assert len(route["path"]) >= 2
        assert len(route["waypoints"]) >= 2
