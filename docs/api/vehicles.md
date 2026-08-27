# Vehicles — `/vehicles` (Module 1)

CRUD for detected vehicles plus the manual inference endpoints. Module 1 (M1)
low-level surface. Prefer `/integration/vehicles` for external consumers.

Defined in `backend/api/routers/vehicles.py`. Schemas: `backend/schemas`
(`VehicleResponse`, `RecognizeRequest`, `RecognizeResponse`).

## `GET /vehicles`

List detected vehicles, optionally filtered by a plate substring.

**Query params**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `skip` | int | `0` | pagination offset |
| `limit` | int | `100` | pagination limit |
| `plate` | string | — | case-insensitive plate substring filter |

**Response `200`** — `List[VehicleResponse]`

`VehicleResponse` fields: `id`, `license_plate`, `vehicle_type`, `brand`, `model`,
`color`, `tracking_id`, `plate_confidence`, `detection_confidence`,
`color_confidence`, `is_registered`, `last_seen`, `created_at`.

## `GET /vehicles/{vehicle_id}`

Retrieve a single vehicle by primary key.

**Path params:** `vehicle_id` (UUID).

**Response `200`** — `VehicleResponse`
**Errors:** `404` if not found.

## `POST /vehicles/recognize`

Run plate detection + OCR on a submitted base64 image (crop or full frame).

**Request body** — `RecognizeRequest`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `image_base64` | string | yes | base64 (optionally a data-URI) |
| `camera_id` | string | no | — |
| `enhance` | bool | no | default `true` (pre-OCR enhancement) |

**Response `200`** — `RecognizeResponse`

```json
{
  "success": true,
  "vehicles": [
    {
      "license_plate": "AB12CD3456",
      "raw_text": "AB12CD 3456",
      "confidence": 0.91,
      "format": "indian_standard",
      "bbox": [x, y, w, h],
      "ocr_engine": "paddleocr"
    }
  ],
  "inference_time_ms": 42.3
}
```

**Errors**

| Status | When |
|--------|------|
| `400` | invalid/malformed base64 or undecodable image |
| `500` | OCR recognition error (verbose detail) |

## `POST /vehicles/process-frame`

Run one submitted frame through the full ANPR + classification pipeline and feed
the result into Module 2. Slot ownership in the returned `records` is composed
**exclusively** from Module 2's `SlotAssignment`.

**Request body** — `ProcessFrameRequest`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `image_base64` | string | yes | — |
| `camera_id` | string | no | `CAM_EVAL` |
| `frame_id` | int | no | `0` |

**Response `200`** — `application/json`

```json
{
  "success": true,
  "records": [ "/* Module-2-owned live vehicles */" ],
  "inference_time_ms": 123.4
}
```

**Errors:** `400` bad image · `500` frame processing error.

## `POST /vehicles/process-video`

Decode an uploaded video, run every Nth frame (`cameras.frame_skip`) through the
pipeline, persist each detection, and feed Module 2.

**Request** — `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `video` | file | yes | video upload |
| `camera_id` | string (query) | no | default `CAM_VIDEO` |

**Response `200`** — `application/json`

```json
{
  "success": true,
  "frames_processed": 120,
  "vehicles_detected": 84,
  "records": [ "/* live vehicles */" ],
  "processing_time_ms": 9876.5
}
```

**Errors:** `400` unopenable video · `500` processing error.

## Note on duplication

`/vehicles/process-frame` and `/vehicles/process-video` overlap with the
`/integration` and `/parking` equivalents (see
[Duplicate registry D9](../../DUPLICATE_REGISTRY.md)). The integration gateway is
the intended unified entry; these remain as the low-level M1 surface.
