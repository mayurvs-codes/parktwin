# Docker Compose

ParkTwin AI ships two Compose files: a **dev** file (backend only) and a
**production** file (full stack). This page documents both.

## Dev Compose (backend only)

```bash
docker compose -f docker/compose/docker-compose.dev.yml up --build
```

- Builds the backend image from `docker/backend/Dockerfile`.
- Runs `uvicorn backend.app.app:app --host 0.0.0.0 --port 8000` on `:8000`.
- Runs as the host UID/GID so bind-mounted volumes stay writable.
- Ships a container health check against `GET /health`.
- Mounts `datasets/`, `models/`, logs, outputs, snapshots as volumes.
- Uses `ENVIRONMENT=development` and SQLite (`DATABASE_URL` in `.env.docker`).

This file is **unchanged** by the production work and remains for local dev.

## Production Compose (full stack)

File: `docker/compose/docker-compose.prod.yml`.

```bash
cp .env.production.example .env.production          # set SECRET_KEY
export DOMAIN=parktwin.example.com
docker compose -f docker/compose/docker-compose.prod.yml up -d --build
```

### Services

| Service | Image | Published ports | Notes |
|---------|-------|-----------------|-------|
| `backend` | `parktwin-ai/backend:prod` | none (internal) | FastAPI; `expose: 8000`; health `/health` |
| `frontend` | `parktwin-ai/web:prod` | none (internal) | Next.js SPA; `expose: 3000`; health `GET /` |
| `proxy` | `parktwin-ai/proxy:prod` | `80`, `443` | Nginx; `/api/*`→backend, `/*`→frontend |
| `db` *(profile)* | `postgres:16-alpine` | internal | `--profile postgres` |
| `cache` *(profile)* | `redis:7-alpine` | internal | `--profile redis` |

### Production features

- **Restart policy** `unless-stopped` on every service.
- **Named volumes** for persistence: `backend-data`, `backend-models`,
  `backend-datasets`, `backend-logs`, `backend-reports`, `certs` (+ `pgdata` /
  `redisdata` for the profiles).
- **Network isolation** — `parktwin-internal` (no external exposure) hosts
  backend/frontend/infra; only `proxy` joins `parktwin-edge` and publishes
  `80`/`443`.
- **Health checks + dependency ordering** — `proxy` depends on
  `backend` **and** `frontend` healthy; `frontend` depends on `backend` healthy.
- **Container log rotation** via the `json-file` driver (`10m` / `5` files).

### Profiles

```bash
# PostgreSQL for multi-worker / concurrent writes:
docker compose -f docker/compose/docker-compose.prod.yml --profile postgres up -d --build
# Redis event bus:
docker compose -f docker/compose/docker-compose.prod.yml --profile redis up -d --build
# Both:
docker compose -f docker/compose/docker-compose.prod.yml --profile postgres --profile redis up -d --build
```

With PostgreSQL, set `DATABASE_URL` to the asyncpg URL in your prod env file.

### Swap the proxy to Caddy (auto-TLS)

```bash
DOMAIN=parktwin.example.com EMAIL=admin@parktwin.example.com \
  docker compose -f docker/compose/docker-compose.prod.yml \
                 -f docker/compose/docker-compose.prod.caddy.yml up -d --build
```

Caddy obtains and renews certificates automatically — no certificate files to
manage. See [Reverse proxy](reverse-proxy.md).

## Environment files

| File | Used by |
|------|---------|
| `.env.production.example` | `env_file` for the `backend` service in prod compose |
| `.env.backend.example` | generic backend template |
| `.env.frontend.example` | `apps/web` build-time (`NEXT_PUBLIC_*`) template |
| `.env.test.example` | backend test suite |
| `.env.example` · `.env.docker` | local / dev (unchanged) |

No live `.env` is committed — only `*.example` templates. See
[Environment variables](environment-variables.md).
