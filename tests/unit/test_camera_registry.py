"""Unit tests enforcing camera registry rules and single vehicle gateway constraints."""

import json
from pathlib import Path
import yaml
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_single_vehicle_gateway():
    """Facility geometry must have exactly one vehicle gateway ACCESS_POINT_B2."""
    geom_path = REPO_ROOT / "shared" / "facility_geometry.json"
    with open(geom_path, "r", encoding="utf-8") as f:
        geom = json.load(f)

    gateways = geom.get("gateways", [])
    assert len(gateways) == 1, f"Expected exactly 1 vehicle gateway, found {len(gateways)}"
    gw = gateways[0]
    assert gw["id"] == "ACCESS_POINT_B2"
    assert gw["cameras"]["entry"] == "CAM-01"
    assert gw["cameras"]["exit"] == "CAM-16"


def test_cam03_role_is_path_parking():
    """CAM-03 role must strictly be PATH/PARKING, not an exit ramp."""
    geom_path = REPO_ROOT / "shared" / "facility_geometry.json"
    with open(geom_path, "r", encoding="utf-8") as f:
        geom = json.load(f)

    cameras = {c["id"]: c for c in geom.get("cameras", [])}
    assert "CAM-03" in cameras
    assert cameras["CAM-03"]["role"] == "PATH/PARKING"


def test_cam16_role_is_exit():
    """CAM-16 role must strictly be EXIT."""
    geom_path = REPO_ROOT / "shared" / "facility_geometry.json"
    with open(geom_path, "r", encoding="utf-8") as f:
        geom = json.load(f)

    cameras = {c["id"]: c for c in geom.get("cameras", [])}
    assert "CAM-16" in cameras
    assert cameras["CAM-16"]["role"] == "EXIT"


def test_cam04_to_cam15_unverified_standby():
    """Cameras CAM-04 through CAM-15 must be marked unverified (verified=False, status=STANDBY)."""
    geom_path = REPO_ROOT / "shared" / "facility_geometry.json"
    with open(geom_path, "r", encoding="utf-8") as f:
        geom = json.load(f)

    cameras = {c["id"]: c for c in geom.get("cameras", [])}
    for i in range(4, 16):
        cam_id = f"CAM-{i:02d}"
        assert cam_id in cameras, f"Missing camera {cam_id}"
        assert cameras[cam_id]["verified"] is False, f"{cam_id} should be verified=False"
        assert cameras[cam_id]["status"] == "STANDBY", f"{cam_id} should be status=STANDBY"


def test_camera_calibration_all_unconfigured():
    """All cameras in configs/camera_calibration.yaml must be status=unconfigured at runtime."""
    calib_path = REPO_ROOT / "configs" / "camera_calibration.yaml"
    with open(calib_path, "r", encoding="utf-8") as f:
        calib = yaml.safe_load(f)

    cameras = calib.get("cameras", {})
    assert len(cameras) >= 16, f"Expected at least 16 cameras, found {len(cameras)}"
    for cam_id, cfg in cameras.items():
        assert cfg.get("status") == "unconfigured", (
            f"Camera {cam_id} has status={cfg.get('status')}; expected 'unconfigured' to prevent fabricated calibration."
        )
