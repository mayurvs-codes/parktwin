# Reporting — `/reports` (Module 5)

Exposes the Reporting Engine over a single `/reports` router. The engine is a
**pure consumer** of the Analytics Engine and the Integration Layer — it never
reads Module 1 / Module 2 internals directly. The router is a thin transport.

Defined in `modules/reporting/api/router.py`. Schemas:
`modules/reporting/api/schemas.py` (`GenerateRequest`, `GenerateResponse`,
`ReportSummary`, `ReportDetail`). Constants: `modules/reporting/types.py`.

## Report types (`REPORT_TYPES`)

`parking_summary` · `occupancy` · `vehicle` · `parking_session` · `violation` ·
`analytics_summary`

## Export formats (`EXPORT_FORMATS`)

`json` · `csv` · `pdf`

## Status values

`generated` · `regenerating` · `failed`

## `GET /reports`

List stored reports (metadata only).

**Query params:** `report_type` (optional filter), `limit` (int, `1`–`1000`,
default `100`).

**Response `200`** — `List[ReportSummary]`

`ReportSummary`: `id`, `type`, `generated_at`, `status`, `file_path`, `format`.

## `GET /reports/history`

Full generation history, newest first.

**Query params:** `report_type` (optional), `limit` (int, `1`–`5000`, default
`500`).

**Response `200`** — `List[ReportSummary]`

## `POST /reports/generate`

Generate (or regenerate) a report and persist it.

**Request body** — `GenerateRequest`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `report_type` | string | yes | one of `REPORT_TYPES` |
| `formats` | list[str] | no | default `["json"]`; subset of `EXPORT_FORMATS` |
| `params` | object | no | generator-specific parameters |
| `report_id` | string | no | existing id → regenerate **in place** |

**Response `200`** — `GenerateResponse`

`GenerateResponse`: `id`, `type`, `status`, `generated_at`, `format`,
`file_path`, `formats`, `download_url`.

**Errors**

| Status | When |
|--------|------|
| `400` | unsupported format, or invalid `report_type` (ValueError) |

## `GET /reports/download`

Download a report file (served from disk or re-rendered on demand).

**Query params:** `report_id` (required), `format` (optional `json`/`csv`/`pdf`;
defaults to the primary format).

**Response `200`** — file bytes with
`Content-Disposition: attachment; filename="..."` and the format's media type.
**Errors:** `404` if the report/file is not found.

## `GET /reports/{report_id}`

Fetch one report, including its stored content.

**Path params:** `report_id` (string).

**Response `200`** — `ReportDetail` (`ReportSummary` + `meta`, `content`).
**Errors:** `404` if not found.

## Notes

- **No delete endpoint.** The frontend omits a Delete action accordingly.
- Literal sub-paths (`/history`, `/generate`, `/download`) are declared before the
  `/{report_id}` catch-all so they are not matched as a report id.
- The frontend `apps/web` Reports view pins its type list and export formats to
  the backend constants; it performs no report generation, formatting, or storage.
