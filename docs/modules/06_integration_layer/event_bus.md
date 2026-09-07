# Event Bus Architecture (`modules/integration_layer/events/`)

Provides asynchronous, loosely coupled domain event propagation across the platform.

---

## Bus Implementations

1. **`MemoryBus` (Default)**: Uses Python `asyncio.Queue` for zero-dependency local development and single-container deployments.
2. **`RedisBus`**: Uses Redis Pub/Sub channels for multi-worker, clustered production scaling.

---

## Event Topics & Message Format

- `topic: vehicle.detected` — Fired when a vehicle is recognized.
- `topic: parking.slot_changed` — Fired when a slot changes occupancy state.
- `topic: parking.violation` — Fired when an overstay or unauthorized vehicle is detected.
