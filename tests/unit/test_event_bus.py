"""
Unit tests — Integration Event Bus (Module 3)
============================================
Verifies the interface-based bus: all 8 canonical event types are
accepted, recent/by-type queries work, and the buffer is bounded.
"""

import asyncio

import pytest

from modules.integration_layer.events.bus import (
    INTEGRATION_EVENT_TYPES,
    IntegrationEvent,
)
from modules.integration_layer.events.factory import get_event_bus, reset_event_bus
from modules.integration_layer.events.memory_bus import InMemoryEventBus


def _event(etype, camera="camera_01"):
    return IntegrationEvent(event_type=etype, camera_id=camera, payload={"n": 1})


@pytest.fixture
def bus():
    b = InMemoryEventBus()
    reset_event_bus(b)
    yield b
    reset_event_bus(None)


def test_all_canonical_types_accepted(bus):
    for t in INTEGRATION_EVENT_TYPES:
        asyncio.run(bus.publish(_event(t)))
    assert bus.count() == len(INTEGRATION_EVENT_TYPES)
    present = {e["event_type"] for e in bus.get_recent(limit=1000)}
    assert present == set(INTEGRATION_EVENT_TYPES)


def test_get_recent_limit_and_filter(bus):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    for t in ("VehicleDetected", "VehicleParked", "VehicleExited"):
        loop.run_until_complete(bus.publish(_event(t)))

    recent = bus.get_recent(limit=2)
    assert len(recent) == 2  # last 2 only

    filtered = bus.get_recent(limit=100, event_type="VehicleParked")
    assert len(filtered) == 1
    assert filtered[0]["event_type"] == "VehicleParked"


def test_all_types_counts(bus):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    for _ in range(3):
        loop.run_until_complete(bus.publish(_event("VehicleDetected")))
    loop.run_until_complete(bus.publish(_event("SlotOccupied")))
    counts = bus.all_types()
    assert counts["VehicleDetected"] == 3
    assert counts["SlotOccupied"] == 1


def test_clear(bus):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(bus.publish(_event("VehicleDetected")))
    assert bus.count() == 1
    loop.run_until_complete(bus.clear())
    assert bus.count() == 0


def test_buffer_is_bounded():
    b = InMemoryEventBus(max_buffer=5)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    for i in range(10):
        loop.run_until_complete(b.publish(IntegrationEvent(event_type="VehicleDetected", payload={"i": i})))
    assert b.count() == 5
    # oldest dropped: first kept is i==5
    assert b.get_recent(limit=100)[0]["payload"]["i"] == 5


def test_factory_default_is_inmemory():
    reset_event_bus(None)
    b = get_event_bus()
    assert isinstance(b, InMemoryEventBus)
