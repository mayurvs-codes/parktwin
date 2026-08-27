# Integration Gateway — `/integration` (Module 3)

The **preferred external surface**. A single router that exposes a unified API
over Module 1 (vehicles) and Module 2 (parking), plus the event bus, sync, and
frame ingestion. Clients that use this gateway never touch `/vehicles` or
`/parking` internals.

Defined in `modules/integration_layer/gateway/router.py`. DTOs:
`modules/integration_layer/gateway/schemas.py` (`GatewayVehicle`, `GatewaySlot`,
`GatewaySession`, `GatewayEvent`, `GatewayOccupancy`, `GatewayHealth`,
`ProcessFrameRequest`).

> The gateway read endpoints declare `Gateway*` DTOs but currently **return raw
> dicts** shaped like those DTOs.

## `GET /integration/health`

Unified integration-layer health.

**Response `200`** — `GatewayHealth`

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `ok` |
| `parking_engine_initialized` | bool | — |
| `event_bus` | string | `InMemoryEventBus` / `RedisEventBus` |
| `event_counts` | object | event type → count |
| `websocket_subscribers` | object | channel → subscriber count |
| `occupancy` | `GatewayOccupancy` | current occupancy |

## `GET /integration/vehicles`

List detected vehicles (M1) through the gateway.

**Query params:** `skip` (`0`), `limit` (`100`), `plate` (optional substring).

**Response `200`** — `List[GatewayVehicle]`

`GatewayVehicle`: `id`, `license_plate`, `vehicle_type`, `brand`, `model`, `color`,
`tracking_id`, `plate_confidence`, `detection_confidence`, `color_confidence`,
`is_registered`, `last_seen`, `created_at`.

## `GET /integration/slots`

List parking slots (M2) through the gateway.

**Query params:** `camera_id`, `state`.

**Response `200`** — `List[GatewaySlot]`

`GatewaySlot`: `id`, `slot_id`, `camera_id`, `zone`, `state`, `is_reserved`,
`reserved_for`, `position`, `created_at`, `updated_at`.

## `GET /integration/sessions`

List parking sessions (M2) through the gateway.

**Query params:** `active_only` (`false`), `camera_id`, `plate`, `skip` (`0`),
`limit` (`100`).

**Response `200`** — `List[GatewaySession]`

`GatewaySession`: `session_uid`, `camera_id`, `slot_id`, `license_plate`,
`tracking_id`, `entry_time`, `exit_time`, `duration_seconds`, `is_active`,
`violation_flags`.

## `GET /integration/occupancy`

Current occupancy snapshot (M2).

**Query params:** `camera_id` (optional).

**Response `200`** — `GatewayOccupancy`

| Field | Type |
|-------|------|
| `total_slots` | int |
| `free` | int |
| `occupied` | int |
| `reserved` | int |
| `unknown` | int |
| `occupancy_rate` | float |
| `per_camera` | object |

## `GET /integration/statistics`

Aggregate parking statistics (M2).

**Response `200`** — `object` (active_sessions, total_sessions, closed_sessions,
average/max duration, events, total_events, top_plates, violations).

## `GET /integration/events`

List events.

**Query params:**
- `source` — `integration` (default, canonical event bus: `VehicleDetected`,
  `VehicleParked`, …) or `module` (raw M2 lifecycle events from the DB).
- `event_type`, `camera_id`, `slot_id`, `skip` (`0`), `limit` (`200`).

**Response `200`** — `object` (event list + meta).

`GatewayEvent`: `event_id`, `event_type`, `timestamp`, `camera_id`, `payload`.

## `POST /integration/sync`

Force a cross-module consistency reconcile (Vehicle ↔ Session ↔ Slot ↔ Event).

**Query params:** `camera_id` (optional).
**Response `200`** — `object` (sync report).

## `POST /integration/process-frame`

Run one submitted frame through M1 and feed it into M2. Returns the unified
integration payload (summary, occupancy, sessions, integration events emitted
this frame, sync report) and pushes live updates to WebSocket subscribers.

**Request body** — `ProcessFrameRequest`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `image_base64` | string | yes | — |
| `camera_id` | string | no | `camera_01` |
| `frame_id` | int | no | `0` |

**Response `200`** — `object` (`success`, `summary`, `occupancy`, `sessions`,
`events`, `sync`, `inference_time_ms`).
**Errors:** `400` bad image · `500` integration frame error.

## `POST /integration/process-video`

Drive the end-to-end M1 → M2 flow over an uploaded video.

**Request** — `multipart/form-data`: `video` (file), `camera_id` (query, default
`camera_01`).
**Response `200`** — `object` (`success`, `camera_id`, `frames_processed`,
`occupancy`, `sync`, `processing_time_ms`).

## WebSocket

`/integration/ws?channel=` is documented separately in
[websocket.md](websocket.md) (mounted by this router).
