"""
Unit tests — Per-slot WebSocket Broadcasting & SlotStateChanged Events (Module 3)
================================================================================
Verifies that:
1. A slot state change in handle_frame triggers a SlotStateChanged integration event.
2. SlotStateChanged events are published to the EventBus.
3. ConnectionManager broadcasts SlotStateChanged event payloads on the "slots" channel.
"""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from modules.integration_layer.events.bus import IntegrationEvent, WS_CHANNELS
from modules.integration_layer.services.integration_service import IntegrationService
from modules.integration_layer.websocket.manager import ConnectionManager
from modules.parking_intelligence.storage.models import ParkingSlot, SlotState


@pytest.mark.asyncio
async def test_slot_state_change_triggers_event_and_broadcast():
    """Assert slot state change triggers SlotStateChanged event and broadcasts on slots channel."""
    mock_bus = AsyncMock()
    mock_ws = AsyncMock()
    mock_sync = AsyncMock()
    mock_sync.reconcile.return_value = {}
    mock_engine = AsyncMock()
    mock_engine.initialized = True
    mock_engine._events._buffer = []
    mock_engine._events.count = MagicMock(return_value=0)
    mock_engine.ingest_frame.return_value = {"assignment": None}
    mock_engine.occupancy_summary.return_value = {}

    service = IntegrationService(
        event_bus=mock_bus,
        ws_manager=mock_ws,
        synchronizer=mock_sync,
        parking_engine=mock_engine,
    )

    db = AsyncMock()

    # Slot before state: FREE
    before_slot = MagicMock(spec=ParkingSlot)
    before_slot.slot_id = "A-01"
    before_slot.camera_id = "camera_01"
    before_slot.state = SlotState.FREE

    # Slot after state: OCCUPIED
    after_slot = MagicMock(spec=ParkingSlot)
    after_slot.slot_id = "A-01"
    after_slot.camera_id = "camera_01"
    after_slot.state = SlotState.OCCUPIED

    get_slots_call_count = 0

    async def mock_get_slots(db_sess, camera_id=None, state=None):
        nonlocal get_slots_call_count
        get_slots_call_count += 1
        if get_slots_call_count == 1:
            return [before_slot]
        return [after_slot]

    with patch(
        "modules.integration_layer.services.integration_service.parking_crud.get_slots",
        side_effect=mock_get_slots,
    ), patch(
        "modules.integration_layer.services.integration_service.parking_crud.list_sessions",
        return_value=[],
    ):
        result = await service.handle_frame(db, "camera_01", [])

    # Verify SlotStateChanged event was published
    published_types = [
        call.args[0].event_type for call in mock_bus.publish.call_args_list if call.args
    ]
    assert "SlotStateChanged" in published_types

    # Find the SlotStateChanged event
    slot_event = next(
        call.args[0]
        for call in mock_bus.publish.call_args_list
        if call.args and call.args[0].event_type == "SlotStateChanged"
    )
    assert slot_event.payload["slot_id"] == "A-01"
    assert slot_event.payload["camera_id"] == "camera_01"
    assert slot_event.payload["state"] == "occupied"
    assert "timestamp" in slot_event.payload

    # Verify ConnectionManager broadcast on "slots" channel
    slots_broadcast_calls = [
        call for call in mock_ws.broadcast.call_args_list if call.args and call.args[0] == "slots"
    ]
    assert len(slots_broadcast_calls) == 1
    broadcast_payload = slots_broadcast_calls[0].args[1]
    assert broadcast_payload["event_type"] == "SlotStateChanged"
    assert broadcast_payload["payload"]["slot_id"] == "A-01"
    assert broadcast_payload["payload"]["state"] == "occupied"


def test_ws_channels_includes_slots():
    """Assert "slots" channel is registered in WS_CHANNELS and ConnectionManager."""
    assert "slots" in WS_CHANNELS
    mgr = ConnectionManager()
    assert "slots" in mgr._channels
    assert mgr.channel_counts()["slots"] == 0
