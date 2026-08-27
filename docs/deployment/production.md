# Production Deployment

This document describes a complete, containerised **production** deployment of
ParkTwin AI — backend (FastAPI) **and** the Next.js frontend (`apps/web`) — behind
a single reverse proxy.

> ⚠️ **Authentication is not implemented.** Before any public/external exposure,
> add API-key/JWT auth to all REST routers and a token/origin check to the
> `/integration/ws` WebSocket, and normalise 5xx error responses. See
> [Security](../../SECURITY.md).

## Topology (recommended)

```
[ Clients / browser ] ──HTTPS(:443)──▶ [ Reverse Proxy (Nginx or Caddy) ]
                                           │  TLS termination, CORS-free, headers
                                           ├── /api/*   ──strip /api──▶ [ backend:8000  ]  (FastAPI)
                                           └── /*       ──────────────▶ [ frontend:3000 ]  (Next.js SPA)
                                                                    │
                                                        [ postgres / redis ] (optional, --profile)
```

The frontend and backend are served from the **same origin**; the API is exposed
under the `/api` prefix and the proxy strips it before forwarding to the backend.
This gives:

- **No CORS** (browser → proxy → backend is same-origin).
- **No mixed content** (frontend `NEXT_PUBLIC_API_BASE` is `https://<domain>/api`).
- **No route clash** with frontend pages (`/analytics`, `/reports`, `/vehicles`,
  `/parking`) — those stay on the frontend; the backend's `/analytics`,
  `/reports`, … live under `/api`.
- **WebSocket** `wss://<domain>/api/integration/ws` is forwarded with Upgrade
  headers (or handled transparently by Caddy).

## What ships

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.prod.yml` | Full production stack (backend + frontend + proxy + optional infra) |
| `docker/compose/docker-compose.prod.caddy.yml` | Override to swap Nginx → Caddy (auto-TLS) |
| `docker/backend/Dockerfile` | Backend image (Python 3.12-slim, non-root, healthcheck) |
| `apps/web/Dockerfile` | Frontend image (multi-stage Next.js, non-root, healthcheck) |
| `docker/reverse-proxy/nginx/*` | Nginx image + config template (`${DOMAIN}`) |
| `docker/reverse-proxy/caddy/*` | Caddy image + Caddyfile (`{$DOMAIN}`) |
| `.env.production.example` | Backend env loaded by the prod compose (`env_file`) |
| `.env.backend.example` · `.env.frontend.example` · `.env.test.example` | Env templates (no secrets) |

The dev Compose (`docker/compose/docker-compose.dev.yml`) is **unchanged** and
remains the backend-only development file.

## Quick start (SQLite, single process)

```bash
# 1. Configure
cp .env.production.example .env.production        # set a REAL SECRET_KEY
export DOMAIN=parktwin.example.com                # your domain

# 2. Provision TLS certs for Nginx (Caddy users skip this — it auto-issues):
#    place fullchain.pem + privkey.pem in the `certs` volume, e.g.:
#    docker compose -f docker/compose/docker-compose.prod.yml run --rm \
#      -v "$(pwd)/certs:/certs"  alpine sh -c 'cp /certs/* /dev/null'   # (mount your certs)
#    # or mount a host cert dir into the proxy's /etc/nginx/certs.

# 3. Build + run
docker compose -f docker/compose/docker-compose.prod.yml up -d --build
```

Frontend build note: `NEXT_PUBLIC_API_BASE` is inlined at **build time**. The
compose passes it as a build arg (`https://$DOMAIN/api`). If you change the
domain, rebuild the frontend: `docker compose … build frontend`.

## Process / restart / resilience

- Every service uses `restart: unless-stopped`.
- Container logs are rotated by the Docker `json-file` driver
  (`max-size: 10m`, `max-file: 5`) — see [Logging](logging.md).
- Health checks gate dependencies: `proxy` waits for `backend` **and**
  `frontend` to be healthy; `frontend` waits for `backend` healthy. See
  [Health checks](health-checks.md).

## Startup order

```
1. Volumes created (DB / models / datasets / logs / reports / certs)
2. backend        → init_db() + load AI models + spawn camera threads  (lifespan)
3. backend healthy (/health == 200)
4. frontend       → next start  (serves SPA)
5. frontend healthy (GET / == 200)
6. proxy          → TLS + route /api/* → backend, /* → frontend
7. proxy healthy  → :443 published; system Ready
```

## Database

- **Default / simple:** SQLite (`sqlite+aiosqlite:///./data/parktwin.db`) on the
  `backend-data` named volume. Single process only.
- **Production (scale):** PostgreSQL behind `--profile postgres`. Set
  `DATABASE_URL=postgresql+asyncpg://parktwin:STRONG@db:5432/parktwin_db` and run
  with `--profile postgres`. This allows multiple workers.

## Event bus

- `INTEGRATION_EVENT_BUS=memory` (default) — single process.
- `INTEGRATION_EVENT_BUS=redis` behind `--profile redis` (provides `cache`).

## Hardening checklist

- [ ] Set a strong `SECRET_KEY` (the default placeholder triggers a production warning).
- [ ] `ENVIRONMENT=production` and `LOG_LEVEL=INFO` (never `DEBUG` in prod).
- [ ] Serve only over HTTPS (Nginx or Caddy, both provided).
- [ ] Mount real TLS certificates (Nginx) or let Caddy auto-issue.
- [ ] Persist `backend-data`, `backend-models`, `backend-logs` (named volumes — done by default).
- [ ] Run as non-root (both images already do).
- [ ] Add authentication before any external exposure (see Security note above).
- [ ] Restrict `docs`/`redoc` at the proxy if you do not want them public.
