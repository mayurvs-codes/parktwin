# Cameras — `/cameras`

Register, list, retrieve, and delete camera sources. Module 1 (M1) config
endpoints. No authentication.

Defined in `backend/api/routers/cameras.py`. Schema:
`backend/schemas` (`CameraCreate`, `CameraResponse`).

## `GET /cameras`

List all registered cameras.

**Response `200`** — `List[CameraResponse]`

```json
[
  {
    "camera_id": "camera_01",
    "name": "Entrance Gate A",
    "url": 0,
    "zone": "entrance",
    "fps_target": 25,
    "is_enabled": true,
    "id": "uuid",
    "status": "online",
    "created_at": "2026-07-20T00:00:00Z"
  }
]
```

## `POST /cameras/add`

Register a new camera and start its ingestion thread.

**Request body** — `CameraCreate`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `camera_id` | string | yes | unique id |
| `name` | string | yes | display name |
| `url` | any | yes | `0` (webcam), RTSP string, or file path |
| `zone` | string | no | default `general` |
| `fps_target` | int | no | default `25` |
| `is_enabled` | bool | no | default `true` |

**Response `201`** — `CameraResponse`

**Errors**

| Status | When |
|--------|------|
| `400` | camera id already registered |

## `GET /cameras/{camera_id}`

Retrieve a single camera.

**Path params:** `camera_id` (string).

**Response `200`** — `CameraResponse`
**Errors:** `404` if not found.

## `DELETE /cameras/{camera_id}`

Remove a camera from the DB and stop its capture thread.

**Path params:** `camera_id` (string).

**Response `200`** — `{ "detail": "Camera '...' deleted successfully." }`
**Errors:** `404` if not found.

## Notes

- Adding/removing a camera also starts/stops the `FrameProcessor` capture thread.
- Real-time preview/streaming endpoints are out of scope for M1; live updates
  flow through the Integration Layer WebSocket.
