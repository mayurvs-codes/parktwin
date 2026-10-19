"""
Integration test — Pipeline End-to-End Wiring (Task 2).
======================================================
Tests the full wired call path:
  tracker output -> BayEntryDetector -> ViolationEngine -> VoiceService -> EventBus -> WebSocket

Asserts that:
  1. Vehicle entering wrong bay triggers BayEntryDetector -> ViolationEngine -> VoiceService warning.
  2. Voice announcement is published to real InMemoryEventBus and broadcast via real ConnectionManager.
  3. ANPR assignment computes Dijkstra navigation route and broadcasts condensed spoken directions.
  4. Vehicle departing the wrong bay resolves the episode and broadcasts VOICE_CANCEL over WebSocket.
"""

import asyncio
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import pytest
from shapely.geometry import box

from modules.integration_layer.events.memory_bus import InMemoryEventBus
from modules.integration_layer.services.integration_service import IntegrationService
from modules.integration_layer.sync.synchronizer import Synchronizer
from modules.integration_layer.voice import get_voice_service
from modules.integration_layer.websocket.manager import ConnectionManager
from modules.parking_intelligence import ParkingIntelligenceEngine
from backend.database.session import AsyncSessionLocal


@dataclass
class MockTrackRecord:
    track_id: int
    tracking_id: int
    vehicle_id: str
    license_plate: str
    camera_id: str
    floor_coords: tuple
    assigned_bay: Optional[str] = None
    bbox: Optional[list] = None

    def to_api_dict(self) -> Dict[str, Any]:
        return {
            "tracking_id": self.tracking_id,
            "vehicle_id": self.vehicle_id,
            "license_plate": self.license_plate,
            "camera_id": self.camera_id,
            "bbox": self.bbox or [100, 100, 200, 200],
            "floor_coords": self.floor_coords,
            "assigned_bay": self.assigned_bay,
        }


class MockWebSocketClient:
    def __init__(self):
        self.received_messages: List[Dict[str, Any]] = []

    async def accept(self) -> None:
        pass

    async def close(self, code: int = 1000, reason: str = "") -> None:
        pass

    async def send_json(self, msg: Dict[str, Any]) -> None:
        self.received_messages.append(msg)


@pytest.mark.asyncio
async def test_pipeline_tracker_to_bay_entry_violation_voice_websocket():
    """
    Feeds vehicle tracking frames through IntegrationService and asserts
    that a wrong bay entry triggers VoiceAnnouncement on the WebSocket channel 'events'.
    """
    # 1. Instantiate the real integration components (no mocks of the event bus or ws manager)
    bus = InMemoryEventBus()
    ws_manager = ConnectionManager()
    sync = Synchronizer()
    engine = ParkingIntelligenceEngine()
    voice_service = get_voice_service()
    voice_service.reset()

    service = IntegrationService(
        event_bus=bus,
        ws_manager=ws_manager,
        synchronizer=sync,
        parking_engine=engine,
    )

    # 2. Connect a WebSocket receiver to the 'events' channel
    ws_client = MockWebSocketClient()
    await ws_manager.connect(ws_client, channel="events", token="dev_admin_token")

    # 3. Setup test bay geometries on the real BayEntryDetector
    # SP-07 at (4.8, -6.2), SP-11 at (-14.4, 6.2)
    engine.bay_entry_detector.register_camera("CAM-02", status="calibrated")
    engine.bay_entry_detector.register_bay(
        "SP-07",
        box(4.8 - 1.4, -6.2 - 2.7, 4.8 + 1.4, -6.2 + 2.7),
        center=(4.8, -6.2),
    )
    engine.bay_entry_detector.register_bay(
        "SP-11",
        box(-14.4 - 1.4, 6.2 - 2.7, -14.4 + 1.4, 6.2 + 2.7),
        center=(-14.4, 6.2),
    )

    async with AsyncSessionLocal() as db:
        await service.ensure_initialized(db)

        # 4. Feed frames: Vehicle VEH-001 (assigned SP-07) enters wrong bay SP-11
        # Approaches and sustains inside SP-11 for 1.5 seconds (>= 800ms required)
        start_ts = 1000.0
        for step in range(15):
            ts = start_ts + step * 0.1
            # Moving toward SP-11 center (-14.4, 6.2)
            prog = min(1.0, step / 10.0)
            y = 2.0 + prog * 4.2  # moves from y=2.0 into y=6.2
            rec = MockTrackRecord(
                track_id=101,
                tracking_id=101,
                vehicle_id="VEH-001",
                license_plate="KA01MJ5001",
                camera_id="CAM-02",
                floor_coords=(-14.4, y),
                assigned_bay="SP-07",
            )
            await service.handle_frame(db, "CAM-02", [rec], ts=ts)

    # 5. Assert: BayEntryDetector confirmed entry and ViolationEngine produced warning
    ep = engine.violations.get_active_episode("VEH-001")
    assert ep is not None, "Violation episode was not opened for VEH-001"
    assert ep["assigned_bay"] == "SP-07"
    assert ep["actual_bay"] == "SP-11"
    assert ep["state"] == "WARNED"

    # 6. Assert: Real InMemoryEventBus received WrongBayWarning and VoiceAnnouncement
    bus_events = bus.get_recent(limit=50)
    event_types = [e["event_type"] for e in bus_events]
    assert "WrongBayWarning" in event_types, f"WrongBayWarning missing from bus: {event_types}"
    assert "VoiceAnnouncement" in event_types, f"VoiceAnnouncement missing from bus: {event_types}"

    # 7. Assert: WebSocket received VOICE_ANNOUNCEMENT on 'events' channel
    ws_voice_msgs = [
        m for m in ws_client.received_messages
        if m.get("event_type") == "VOICE_ANNOUNCEMENT"
    ]
    assert len(ws_voice_msgs) >= 1, f"No VOICE_ANNOUNCEMENT broadcast over WS. Received: {ws_client.received_messages}"
    warning_payload = ws_voice_msgs[0].get("payload", {})
    assert warning_payload["kind"] == "WRONG_BAY_WARNING"
    assert warning_payload["vehicle_id"] == "VEH-001"
    assert "SP-07" in warning_payload["text"]
    assert "Warning!" in warning_payload["text"]

    # 8. Test ANPR Assignment path: ANPR -> compute route -> Voice announcement
    anpr_msg = await service.process_anpr_assignment(
        camera_id="CAM-01",
        vehicle_id="VEH-002",
        assigned_bay="SP-07",
        source="live",
    )
    assert anpr_msg is not None
    assert anpr_msg["kind"] == "ASSIGNMENT"
    assert anpr_msg["vehicle_id"] == "VEH-002"
    assert "SP-07" in anpr_msg["text"]

    # Verify ANPR assignment reached the WebSocket client
    ws_asn_msgs = [
        m for m in ws_client.received_messages
        if m.get("event_type") == "VOICE_ANNOUNCEMENT" and m.get("payload", {}).get("kind") == "ASSIGNMENT"
    ]
    assert len(ws_asn_msgs) >= 1, "ANPR voice assignment was not broadcast over WebSocket"

    # 9. Test Vehicle departure / resolution: Vehicle exits SP-11
    # Move vehicle out of SP-11 for 15 frames (1.5 seconds)
    async with AsyncSessionLocal() as db2:
        for step in range(25):
            y_exit = 6.2 - (step * 0.5)  # moves away from bay
            exit_ts = 1002.0 + (step * 0.1)
            rec = MockTrackRecord(
                track_id=101,
                tracking_id=101,
                vehicle_id="VEH-001",
                license_plate="KA01MJ5001",
                camera_id="CAM-02",
                floor_coords=(-14.4, y_exit),
                assigned_bay="SP-07",
            )
            await service.handle_frame(db2, "CAM-02", [rec], ts=exit_ts)

    # Assert violation episode resolved
    ep_after = engine.violations.get_episode(ep["episode_id"])
    assert ep_after["state"] == "RESOLVED"
    assert ep_after["resolution_reason"] == "left_bay"

    # Assert VOICE_CANCEL broadcast over WebSocket
    ws_cancel_msgs = [
        m for m in ws_client.received_messages
        if m.get("event_type") == "VOICE_CANCEL"
    ]
    assert len(ws_cancel_msgs) >= 1, "VOICE_CANCEL was not broadcast over WebSocket upon bay exit"
