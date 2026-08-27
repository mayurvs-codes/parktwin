# API Reference

All routers are mounted at the root by `backend/app/app.py`. The base URL is
`http://localhost:8000` (frontend `NEXT_PUBLIC_API_BASE`). Interactive docs
(Swagger) are at `/docs` and ReDoc at `/redoc`.

> **The `/integration` gateway is the preferred external surface** for frontend
> and external consumers. The direct `/vehicles` and `/parking` routers remain the
> low-level module surface.

## Routers

| Area | Prefix | Doc |
|------|--------|-----|
| Meta | `/` | [health.md](health.md) |
| Health | `/health` | [health.md](health.md) |
| Cameras | `/cameras` | [cameras.md](cameras.md) |
| Vehicles (M1) | `/vehicles` | [vehicles.md](vehicles.md) |
| Parking (M2) | `/parking` | [parking.md](parking.md) |
| Integration gateway (M3) | `/integration` | [integration.md](integration.md) |
| Analytics (M4) | `/analytics` | [analytics.md](analytics.md) |
| Reporting (M5) | `/reports` | [reporting.md](reporting.md) |
| WebSocket (M3) | `/integration/ws` | [websocket.md](websocket.md) |

## Common notes

- **Auth:** none implemented. Do not expose publicly without adding auth
  (see [Security](../../SECURITY.md)).
- **Errors:** routers return JSON `{ "detail": "..." }`. Many return verbose
  internal detail strings on 500 — normalise these before external exposure.
- **Content type:** JSON unless noted. Multipart (`UploadFile`) for video
  ingestion.
- **Response shapes:** M1/M2/reporting use typed Pydantic models; the gateway
  read endpoints declare `Gateway*` DTOs but currently return raw dicts;
  analytics returns untyped `Dict[str, Any]`.
