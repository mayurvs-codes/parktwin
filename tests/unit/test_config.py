"""Unit tests for the configuration loader (YAML + env overrides)."""

from backend.core.config import get_settings, Settings


def test_settings_load_from_yaml():
    s = get_settings()
    assert isinstance(s, Settings)
    assert s.app.name == "ParkTwin AI"
    assert s.models.detector.name == "yolov8m"
    assert s.tracking.algorithm == "bytetrack"


def test_device_resolution_auto():
    s = get_settings()
    # 'auto' must resolve to a concrete device string on this machine.
    resolved = s.get_device("auto")
    assert resolved in ("cuda", "cpu", "mps")


def test_device_passthrough():
    s = get_settings()
    assert s.get_device("cpu") == "cpu"
    assert s.get_device("cuda") == "cuda"


def test_cameras_configured():
    s = get_settings()
    # At least the entrance camera is defined in settings.yaml.
    assert any(c.id.upper() in ("CAMERA_01", "CAM-01") for c in s.cameras.sources)
