# Environment Variables

ParkTwin AI is configured primarily by `configs/settings.yaml`. The settings
loader reads **only a small set of backend variables** from the environment; the
frontend reads its `NEXT_PUBLIC_*` variables **at build time** (they are inlined
into the client bundle). Everything else is overridden in the YAML file.

## Environments

| Environment | Template file | Notes |
|-------------|--------------|-------|
| Development | `.env.example` (local) · `.env.docker` (container) | `LOG_LEVEL=DEBUG` by default |
| Testing | `.env.test.example` | isolated, non-debug config for `pytest` |
| Production | `.env.production.example` (loaded by prod compose) · `.env.backend.example` (reference) | `ENVIRONMENT=production`, `LOG_LEVEL=INFO` |

No live `.env` is committed — only `*.example` / `.env.docker` templates.

## Backend (read from environment)

The loader reads these from the environment (highest priority):

| Variable | Default | Scope | Notes |
|----------|---------|-------|-------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/parktwin.db` | Backend | `postgresql+asyncpg://user:pass@host:5432/db` for PostgreSQL |
| `REDIS_URL` | `redis://cache:6379/0` | Backend | Used by the Redis event bus (optional) |
| `SECRET_KEY` | `changeme` | Backend | **Change before any production deployment** |
| `LOG_LEVEL` | `DEBUG` | Backend | `DEBUG` / `INFO` / `WARNING` / `ERROR` — never `DEBUG` in prod |
| `ENVIRONMENT` | `development` | Backend | `development` or `production` |
| `INTEGRATION_EVENT_BUS` | `memory` | Backend | `memory` or `redis` (reads `REDIS_URL` when `redis`) |
| `LOG_DIR` | `logs` | Backend | Directory for the rotated JSON log file |

`configs/settings.yaml` also has the most commonly changed values
(`api.cors_origins`, `api.workers`, `models.*`, `tracking.*`, `ocr.*`,
`cameras.*`, `parking.*`, `storage.*`, `logging.*`). See the file for the full
list.

## Frontend (`apps/web`, `NEXT_PUBLIC_*`, build-time)

These are inlined at build time. In production they are passed as **build args**
to `apps/web/Dockerfile` (the prod compose passes `NEXT_PUBLIC_API_BASE` as
`https://$DOMAIN/api`).

| Variable | Default | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8000` (dev) / `https://<domain>/api` (prod) | Backend base URL. **Must be absolute** because the WebSocket code does `apiBase.replace(/^http/, "ws")`. Use the same-origin `/api` prefix in prod. |
| `NEXT_PUBLIC_APP_NAME` | `ParkTwin AI` | App name shown in the shell/header |
| `NEXT_PUBLIC_API_TIMEOUT` | `15000` | Axios request timeout (ms) |
| `NEXT_PUBLIC_DEFAULT_PAGE_SIZE` | `20` | Default page size for paginated responses |

The frontend holds **only** `NEXT_PUBLIC_*` variables — no secrets, no API keys,
no business logic.

## Why the `/api` prefix

`NEXT_PUBLIC_API_BASE=https://<domain>/api` means the browser calls
`https://<domain>/api/integration/...` and connects to
`wss://<domain>/api/integration/ws`. The reverse proxy strips `/api`, so the
backend receives `/integration/...` with no code changes. This keeps the
deployment same-origin (no CORS, no mixed content) and avoids route clashes with
the frontend's own `/analytics`, `/reports`, `/vehicles`, `/parking` pages.

## Rebuilding after a change

Because `NEXT_PUBLIC_*` is build-time, changing the domain requires rebuilding
the frontend image:

```bash
DOMAIN=parktwin.example.com \
  docker compose -f docker/compose/docker-compose.prod.yml build frontend
```
