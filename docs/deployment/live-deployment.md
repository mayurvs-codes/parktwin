# Live Production Deployment — ParkTwin AI

> **Scope:** This document covers the **real production deployment** performed for
> ParkTwin AI v1.0.0-RC1. It deploys the exact application that exists in the
> repository — no application code, API, database schema, or architecture was
> changed. Only deployment blockers were fixed (env secrets, local TLS, host-port
> mapping on a Windows Docker host).
>
> Companion reference: `docs/deployment/README.md` and the per-topic files in
> this directory. Canonical architecture: `PROJECT_MEMORY.md`.

---

## 1. What was deployed

| Component | Image / Service | Internal port | Host port |
|-----------|----------------|--------------|-----------|
| Backend (FastAPI + AI pipeline) | `parktwin-ai/backend:prod` | 8000 | (internal only) |
| Frontend (Next.js 15 SPA) | `parktwin-ai/web:prod` | 3000 | (internal only) |
| Reverse proxy (Caddy) | `parktwin-ai/proxy-caddy:prod` | 80 / 443 | **8080 / 8443** |
| Database | SQLite (`parktwin.db`) on a named volume | — | — |
| Volumes | `backend-data`, `backend-models`, `backend-datasets`, `backend-logs`, `backend-reports`, `caddy-data`, `caddy-config` | — | — |

Topology (same-origin, `/api` prefix — no CORS, no route clash):

```
Browser ──HTTPS :8443──▶ Caddy (:443)
                         ├── /api/*   ──strip /api──▶ backend:8000   (FastAPI)
                         └── /*       ──────────────▶ frontend:3000  (Next.js)
HTTP :8080 is redirected to HTTPS :8443.
WebSocket: wss://<host>:8443/api/integration/ws  (Caddy upgrades transparently).
```

### Deployment target
- **OS:** Windows 11 (Docker Desktop, WSL2 backend) — used here as the deployment
  host. On a production Linux server (Ubuntu 22.04+/24.04+, Debian, Rocky) the same
  compose files run unchanged; only the host ports and TLS provider differ.
- **Container runtime:** Docker 29.6.1, Docker Compose v5.3.0.
- **Reverse proxy:** **Caddy** (chosen over Nginx for this local deployment because
  it auto-issues a local TLS certificate via `tls internal` — no cert files and no
  public DNS required). The Nginx config in `docker/reverse-proxy/nginx` remains
  available and untouched for environments that prefer it.

### HTTPS status (this deployment)
- **Enabled**, using Caddy's **internal (self-signed) CA** for `localhost`.
  Browsers show a "not secure" warning for the self-signed cert; use `curl -k`
  for scripting. This is correct for a local / internal deployment.
- **HTTP → HTTPS redirect:** configured (`:80` → `https://localhost:8443`).
- **WebSocket forwarding:** configured (Caddy upgrades WS transparently).
- **Compression:** `gzip` enabled.
- **Security headers:** HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Server` removed.
- **Static-asset caching:** `/_next/static/*` immutable, 1-year cache.

> **To enable trusted HTTPS in production:** set `DOMAIN=<your.domain>`,
> uncomment `email {$EMAIL}` in `docker/reverse-proxy/caddy/Caddyfile`, remove
> `tls internal` (Caddy then uses Let's Encrypt), and publish on host `80:80` /
> `443:443` (edit `docker/compose/docker-compose.prod.yml` proxy `ports`).

---

## 2. Server requirements

- Docker Engine ≥ 24 and Docker Compose ≥ v2 (Compose v5 / v2 plugin).
- ~6 GB free RAM for the backend container (the ML stack — torch, ultralytics,
  paddleocr, easyocr — loads into memory).
- ~20 GB free disk for images + named volumes (ML weights download into
  `backend-models` on first run).
- Outbound internet access for the first build (PyPI) and first model download.
- A domain + ports 80/443 open to the internet **only** if you want public,
  trusted HTTPS via Let's Encrypt. Otherwise the stack runs fully on localhost.

---

## 3. Installation

No host packages are required beyond Docker. (On a bare Linux server, install
Docker Engine + Compose Plugin per the OS instructions; the compose files pull
all application images.)

1. Clone / copy the repository to the host.
2. Ensure Docker is running.
3. (Production domain only) provision TLS certs or rely on Caddy `tls internal`
   for local use.

---

## 4. Deployment

### 4.1 Production environment file
Create `.env.production` at the repository root (gitignored, never committed):

```bash
cp .env.backend.example .env.production
# then set a STRONG, unique SECRET_KEY:
python -c "import secrets;print(secrets.token_urlsafe(64))"
# paste the value into SECRET_KEY= in .env.production
```

The live deployment uses these values (already set):

```ini
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=<generated>
DATABASE_URL=sqlite+aiosqlite:///./data/parktwin.db
INTEGRATION_EVENT_BUS=memory
```

> Never commit `.env.production`. It is excluded from the Docker build context
> (`.dockerignore` ignores `.env.*`) and is injected at runtime only.

### 4.2 Choose a domain / host-port strategy
- **Local / internal (this deployment):** `DOMAIN=localhost:8443`. Caddy issues a
  local cert; the proxy publishes on host **8080/8443** (this Windows host already
  holds `:80` via HTTP.SYS, so we avoid it).
- **Public Linux server:** `DOMAIN=parktwin.example.com`, publish `80:80`/`443:443`,
  use Let's Encrypt (see §1).

### 4.3 Build & start
```bash
# From the repository root.
export DOMAIN=localhost:8443          # or your production domain
docker compose -f docker/compose/docker-compose.prod.yml \
               -f docker/compose/docker-compose.prod.caddy.yml \
               up -d --build
```

This builds the `backend`, `frontend`, and `proxy` images and starts them with
`depends_on: service_healthy` ordering (backend → frontend → proxy) and per-service
health checks + log rotation. Optional PostgreSQL / Redis are available via
`--profile postgres` / `--profile redis` (not used in this deployment).

### 4.4 Verify startup
```bash
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml ps
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml logs -f
```
All three services should reach `healthy`.

---

## 5. Access & validation URLs

| Resource | URL |
|----------|-----|
| Frontend (Dashboard) | `https://localhost:8443/` (redirects to `/dashboard`) |
| Live Parking | `https://localhost:8443/parking` |
| Vehicle Management | `https://localhost:8443/vehicles` |
| Analytics | `https://localhost:8443/analytics` |
| Reports | `https://localhost:8443/reports` |
| Backend health | `https://localhost:8443/api/health` |
| Integration health | `https://localhost:8443/api/integration/health` |
| WebSocket | `wss://localhost:8443/api/integration/ws` |

Quick checks (self-signed cert → `-k`):
```bash
curl -k https://localhost:8443/api/health
curl -k https://localhost:8443/api/integration/health
curl -k https://localhost:8443/dashboard -o /dev/null -w "%{http_code}\n"
```

---

## 6. Updating

```bash
# Pull/rebuild with the latest source, zero-downtime per service:
export DOMAIN=localhost:8443
docker compose -f docker/compose/docker-compose.prod.yml \
               -f docker/compose/docker-compose.prod.caddy.yml \
               up -d --build
```
Images are rebuilt from the current source; named volumes (DB, models, logs,
reports) are preserved across rebuilds, so data survives updates.

---

## 7. Restarting

```bash
# Restart one service (order: backend, then frontend, then proxy):
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml restart backend

# Restart everything:
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml restart
```

---

## 8. Backup

The durable state lives in named volumes:

| Volume | Contents |
|--------|----------|
| `backend-data` | `parktwin.db` (primary database) |
| `backend-models` | downloaded ML weights |
| `backend-datasets` | reference datasets |
| `backend-logs` | rotated application logs |
| `backend-reports` | generated report files |
| `caddy-data` / `caddy-config` | Caddy TLS material + config |

Backup the database and reports (stop the stack first to get a consistent copy):
```bash
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml stop backend
docker run --rm -v parktwin_backend-data:/data -v $(pwd)/backup:/backup alpine \
  tar czf /backup/parktwin-db-$(date +%F).tar.gz -C /data .
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml start backend
```

---

## 9. Recovery

- **Lost container / corrupted image:** `up -d --build` recreates containers from
  the images; data in named volumes is untouched.
- **Lost `backend-data` volume:** restore from the §8 backup tarball into the
  `parktwin_backend-data` volume, or let the app re-create an empty schema on next
  start (`init_db` creates all tables and seeds cameras; parking slots seed on
  first gateway request).
- **Lost `backend-models`:** weights re-download automatically on next start.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Proxy won't bind `:80` | Another process holds the port (on Windows, HTTP.SYS / PID 4). Use the 8080/8443 mapping in `docker-compose.prod.yml`. |
| Backend never becomes `healthy` | Model load at startup can take >2 min on first run (weights download). Check `docker compose logs backend`; increase `healthcheck.start_period` if needed. |
| `curl` shows cert error | Expected for `tls internal`. Use `curl -k`. For trusted certs, switch to Let's Encrypt (§1). |
| Frontend shows API errors | Confirm `NEXT_PUBLIC_API_BASE` was baked as `https://<DOMAIN>/api` at build time (`docker compose config` → frontend `build.args`). Rebuild if wrong. |
| 502 from proxy | Backend not healthy yet, or `backend` service name unreachable on `parktwin-internal`. Wait for healthy state. |
| DB locked / write errors | SQLite is single-writer. Do not run multiple backend workers; use the PostgreSQL profile for concurrency. |

See `docs/deployment/troubleshooting.md` for the full matrix.

---

## 11. Rollback

Images are tagged `parktwin-ai/backend:prod` and `parktwin-ai/web:prod`. To roll
back to a previous image:

```bash
# Re-tag a known-good image and redeploy:
docker tag parktwin-ai/backend:prod-previous parktwin-ai/backend:prod
export DOMAIN=localhost:8443
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml up -d
```
Named volumes preserve data, so a code rollback does not lose the database. For a
full point-in-time rollback, restore the `backend-data` volume from the §8 backup
before starting.

---

## 12. Security posture (verified)

- **Secrets:** `SECRET_KEY` is generated and stored only in `.env.production`
  (gitignored, excluded from build context); never baked into images.
- **Debug disabled:** `ENVIRONMENT=production`, `LOG_LEVEL=INFO` (never `DEBUG`).
- **Non-root containers:** backend runs as `appuser` (uid 10001); frontend as
  `nextjs`.
- **Network isolation:** backend/frontend run on the internal `parktwin-internal`
  network (no published ports); only the proxy publishes on the edge.
- **Production logging:** JSON-file driver with rotation (`max-size 10m`,
  `max-file 5`).
- **No default/placeholder secret in production** (the `__GENERATE...__` template
  value is not used at runtime).
