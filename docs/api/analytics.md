# Analytics — `/analytics` (Module 4)

Exposes the Analytics Engine over a single `/analytics` router. The engine
consumes the Integration Layer **only** and never re-implements occupancy/duration
math — it surfaces Module 2's authoritative values. The router is a thin
transport; it contains no business logic.

Defined in `modules/analytics/api/router.py`. Responses are currently **untyped**
`Dict[str, Any]`; the shapes below describe the returned JSON.

## `GET /analytics/occupancy`

Current occupancy analytics.

**Query params:** `store` (bool, default `true`) — persist a snapshot for trend
history.

**Response `200`** — `object`

| Field | Type | Description |
|-------|------|-------------|
| `current_occupancy` | int | occupied slot count |
| `occupancy_percentage` | float | % occupied |
| `average_occupancy_percentage` | float | historical average |
| `free_slots` | int | — |
| `reserved_slots` | int | — |
| `total_slots` | int | — |
| … | | (plus per-camera breakdown) |

## `GET /analytics/traffic`

Traffic analytics.

**Query params:** `store` (bool, default `true`).

**Response `200`** — `object`

| Field | Type |
|-------|------|
| `vehicle_counts` | object |
| `peak_hour` | int / string |
| `peak_hour_entries` | int |
| `hourly_traffic` | list |
| `daily_traffic` | list |
| … | |

## `GET /analytics/utilization`

Utilization analytics.

**Query params:** `store` (bool, default `true`).

**Response `200`** — `object`

| Field | Type |
|-------|------|
| `slot_utilization_percentage` | float |
| `average_parking_duration` | string / float |
| `most_used_slots` | list |
| `least_used_slots` | list |
| `turnover_rate` | float |
| … | |

## `GET /analytics/trends`

Occupancy / traffic timelines + session & duration statistics.

**Query params:** `history_limit` (int, `1`–`2000`, default `200`).

**Response `200`** — `object`

| Field | Type |
|-------|------|
| `occupancy_timeline` | list (snapshots over time) |
| `traffic_timeline` | list |
| `session_statistics` | object |
| `duration_statistics` | object |

## `GET /analytics/dashboard`

Compute + persist every metric and return the combined dashboard.

**Response `200`** — `object` — combination of the occupancy + traffic +
utilization + trends payloads above (`AnalyticsDashboardDTO`).

## Notes

- Each `store=true` call writes a snapshot to `analytics.db` (separate SQLite
  store). Calling `/analytics/dashboard` once is enough to seed trend history.
- The frontend `apps/web` Analytics view issues **one** `GET /analytics/dashboard`
  request and consumes every value verbatim (no recomputation on the client).
- The `/analytics` endpoints have **no time-range parameter**; client-side
  windowing (Today / 7d / 30d) happens in the dashboard UI only.
