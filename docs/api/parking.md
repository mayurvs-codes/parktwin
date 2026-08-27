# Parking — `/parking` (Module 2)

REST surface for the Parking Intelligence Engine. Module 2 (M2) low-level
surface. Prefer `/integration/*` for external consumers.

Defined in `backend/api/routers/parking.py`. Inline schemas: `SlotResponse`,
`SlotCreate`, `SlotUpdate`, `SessionResponse`, `EventResponse`,
`OccupancyResponse`, `StatisticsResponse`.

> The engine used here is the **single** `ParkingIntelligenceEngine` owned by the
> Integration Service (`get_parking_engine` dependency). The router-local
> duplicate was removed (D10).

## Slots

### `GET /parking/slots`

List parking slots, optionally filtered.

**Query params:** `camera_id` (string), `state` (string).

**Response `200`** — `List[SlotResponse]`

`SlotResponse`: `id`, `slot_id`, `camera_id`, `zone`, `state`, `is_reserved`,
`reserved_for`, `position`, `created_at`, `updated_at`.

### `GET /parking/slots/{slot_id}`

Retrieve one slot.

**Path params:** `slot_id` (string), optional query `camera_id`.
**Response `200`** — `SlotResponse` · **Errors:** `404` if not found.

### `POST /parking/slots`

Register or update a parking slot.

**Request body** — `SlotCreate`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `slot_id` | string | yes | — |
| `camera_id` | string | yes | — |
| `zone` | string | no | `general` |
| `is_reserved` | bool | no | `false` |
| `reserved_for` | string | no | — |
| `position` | list[float] | no | — |
| `state` | string | no | `free` |

**Response `201`** — `SlotResponse`
**Errors:** `400` invalid slot state.

### `PATCH /parking/slots/{slot_id}`

Patch a slot's state / reservation / geometry.

**Request body** — `SlotUpdate` (`state?`, `is_reserved?`, `reserved_for?`,
`position?`, `zone?`).
Reserving/unreserving with no explicit `state` flips the slot to `reserved`/`free`.

**Response `200`** — `SlotResponse` · **Errors:** `404` not found · `400` invalid state.

## Sessions

### `GET /parking/sessions`

List parking sessions.

**Query params:** `active_only` (bool, default `false`), `camera_id`, `plate`,
`skip` (int, `0`), `limit` (int, `100`).

**Response `200`** — `List[SessionResponse]`

`SessionResponse`: `id`, `session_uid`, `camera_id`, `slot_id`, `license_plate`,
`tracking_id`, `entry_time`, `exit_time`, `duration_seconds`, `is_active`,
`violation_flags`, `created_at`.

### `GET /parking/sessions/{session_uid}`

Retrieve one session. **Response `200`** — `SessionResponse` · **Errors:** `404`.

## Events

### `GET /parking/events`

List parking lifecycle events.

**Query params:** `event_type`, `camera_id`, `slot_id`, `skip` (`0`), `limit` (`200`).

**Response `200`** — `List[EventResponse]`

`EventResponse`: `id`, `event_uid`, `event_type`, `camera_id`, `slot_id`,
`tracking_id`, `license_plate`, `timestamp`, `meta`.

## Occupancy & Statistics

### `GET /parking/occupancy`

Current occupancy snapshot.

**Query params:** `camera_id` (optional).

**Response `200`** — `OccupancyResponse`

| Field | Type |
|-------|------|
| `total_slots` | int |
| `free` | int |
| `occupied` | int |
| `reserved` | int |
| `unknown` | int |
| `occupancy_rate` | float |
| `per_camera` | object |

### `GET /parking/statistics`

Aggregate parking statistics.

**Response `200`** — `StatisticsResponse`

| Field | Type |
|-------|------|
| `active_sessions` | int |
| `total_sessions` | int |
| `closed_sessions` | int |
| `average_duration_seconds` | float |
| `average_duration` | string (HH:MM:SS) |
| `max_duration_seconds` | float |
| `max_duration` | string |
| `events` | object (type → count) |
| `total_events` | int |
| `top_plates` | list[object] |
| `violations` | object (type → count) |

## Frame / Video ingestion (M1 → M2)

### `POST /parking/process-frame`

Run one frame through M1 (ANPR) and feed detections into the Parking Intelligence
Engine. Returns the live occupancy snapshot and events emitted on this frame.

**Request body** — `ProcessFrameRequest` (`image_base64`, `camera_id` default
`camera_01`, `frame_id` default `0`).
**Response `200`** — `{ success, camera_id, summary, occupancy, events,
inference_time_ms }` · **Errors:** `400` bad image · `500` processing error.

### `POST /parking/process-video`

Decode an uploaded video, run every Nth frame through M1, and feed each result
into the engine.

**Request** — `multipart/form-data`: `video` (file), `camera_id` (query, default
`camera_01`).
**Response `200`** — `{ success, camera_id, frames_processed, active_sessions,
total_events, occupancy, processing_time_ms }`.
