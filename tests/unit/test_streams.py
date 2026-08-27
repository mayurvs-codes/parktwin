"""
Unit Tests — Camera Streams Router
====================================
Tests /streams/start, /streams, /streams/stop, and /streams/{camera_id}/frame.
"""

import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from backend.app.app import create_app
from backend.auth.token import create_access_token
from backend.api.dependencies import get_frame_processor
from engine.frame_processor import FrameProcessor, CameraStream
from backend.core.config import CameraSource


@pytest.fixture
def mock_frame_processor():
    fp = MagicMock(spec=FrameProcessor)
    fp._streams = {}
    
    def add_cam(source):
        stream = MagicMock(spec=CameraStream)
        stream.source = source
        stream.fps = 25.0
        stream.frame_count = 100
        stream.is_connected = True
        fp._streams[source.id] = stream

    def remove_cam(cam_id):
        return fp._streams.pop(cam_id, None) is not None

    def get_latest_frame(cam_id):
        if cam_id in fp._streams:
            return b"\xff\xd8\xff\xe0\x00\x10JFIF"
        return None

    fp.add_camera.side_effect = add_cam
    fp.remove_camera.side_effect = remove_cam
    fp.get_latest_frame.side_effect = get_latest_frame
    return fp


@pytest.fixture
def client(mock_frame_processor):
    app = create_app()
    app.dependency_overrides[get_frame_processor] = lambda: mock_frame_processor
    return TestClient(app)


@pytest.fixture
def admin_headers():
    token = create_access_token("admin", "admin")
    return {"Authorization": f"Bearer {token}"}



def test_start_stream(client, admin_headers, mock_frame_processor):
    payload = {"camera_id": "cam_test_01", "source_url": "rtsp://192.168.1.100/live"}
    response = client.post("/streams/start", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["camera_id"] == "cam_test_01"
    assert data["status"] == "started"
    assert data["source_url"] == "rtsp://192.168.1.100/live"
    mock_frame_processor.add_camera.assert_called_once()


def test_list_streams(client, admin_headers, mock_frame_processor):
    source = CameraSource(id="cam_test_01", name="cam_test_01", url="rtsp://192.168.1.100/live", enabled=True)
    mock_frame_processor.add_camera(source)

    response = client.get("/streams", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["camera_id"] == "cam_test_01"
    assert data[0]["status"] == "connected"
    assert data[0]["fps"] == 25.0


def test_get_stream_frame(client, admin_headers, mock_frame_processor):
    source = CameraSource(id="cam_test_01", name="cam_test_01", url="rtsp://192.168.1.100/live", enabled=True)
    mock_frame_processor.add_camera(source)

    response = client.get("/streams/cam_test_01/frame", headers=admin_headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content.startswith(b"\xff\xd8")

    # Non-existent camera
    resp_404 = client.get("/streams/non_existent/frame", headers=admin_headers)
    assert resp_404.status_code == 404


def test_stop_stream(client, admin_headers, mock_frame_processor):
    source = CameraSource(id="cam_test_01", name="cam_test_01", url="rtsp://192.168.1.100/live", enabled=True)
    mock_frame_processor.add_camera(source)

    response = client.post("/streams/stop?camera_id=cam_test_01", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["camera_id"] == "cam_test_01"
    assert data["status"] == "stopped"
    assert "cam_test_01" not in mock_frame_processor._streams
