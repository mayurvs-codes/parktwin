# Health & Meta — `/` and `/health`

Service health, database connectivity, and pipeline statistics. No authentication.

## `GET /`

Service meta dictionary.

**Response `200`** — `application/json`

```json
{
  "service": "ParkTwin AI",
  "module": "vehicle_recognition_anpr",
  "version": "1.0.0",
  "docs": "/docs"
}
```

## `GET /health`

Overall service health.

**Response `200`** — `application/json`

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `healthy` (DB connected) or `degraded` |
| `version` | string | app version |
| `environment` | string | `development` / `production` |
| `database` | string | `connected` / `disconnected` |
| `event_bus` | string | `memory` / `redis` (from `INTEGRATION_EVENT_BUS`) |
| `gpu` | string | `disabled` |
| `active_cameras` | int | number of cameras with a live frame |
| `uptime_seconds` | float | process uptime |
| `pipeline_ready` | bool | whether the AI pipeline is initialised |

## `GET /health/db`

Database connectivity probe only.

**Response `200`** — `application/json`

```json
{ "status": "healthy", "database": "connected" }
```

On failure: `{ "status": "unhealthy", "database": "disconnected", "error": "..." }`.

## `GET /health/stats`

Internal pipeline + tracker statistics.

**Response `200`** — `application/json` (untyped) — `pipeline.get_stats()` output.

## Errors

| Status | When |
|--------|------|
| `200` | always (DB failure is reported in the body, not as a 5xx) |
