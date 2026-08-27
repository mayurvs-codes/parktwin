# Deployment Guide

This guide covers running ParkTwin AI in production-oriented environments. The
platform is **production-ready for an internal / trusted-network deployment**;
the single blocker for public exposure is authentication (see
[Security](../../SECURITY.md)).

> ⚠️ The current backend has **no authentication** on any REST router or the
> `/integration/ws` WebSocket. Do not expose it beyond a trusted network without
> adding auth first.

## Sections

- [Production deployment](production.md) — topology, quick start, hardening, startup order.
- [Docker Compose](docker-compose.md) — dev + production Compose (profiles, volumes, networks, health checks).
- [Reverse proxy](reverse-proxy.md) — Nginx / Caddy configs (HTTPS, WS, caching, compression, headers).
- [HTTPS](https.md) — TLS termination recommendations.
- [Environment variables](environment-variables.md) — dev/test/prod templates + the `/api` prefix.
- [Health checks](health-checks.md) — endpoints, probes, dependency ordering, monitoring.
- [Logging](logging.md) — structured JSON, rotation, shipping.
- [Monitoring & Observability](monitoring.md) — Prometheus metrics, Grafana dashboards, request_id tracing.
- [Troubleshooting](troubleshooting.md) — common failures and fixes.

## Quick topology (trusted network, full stack)

```
[ Browser ] ──HTTPS(:443)──> [ Reverse proxy (Nginx or Caddy) ]
                                  ├── /api/*  ──▶ backend:8000  (FastAPI)
                                  └── /*      ──▶ frontend:3000 (Next.js)
```

For a quick local/trusted deployment without a proxy, the provided dev Compose
file runs the backend container directly on `:8000`.

## Files added for production

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.prod.yml` | Full production stack (backend + frontend + proxy + optional infra) |
| `docker/compose/docker-compose.prod.caddy.yml` | Caddy proxy override |
| `apps/web/Dockerfile` · `apps/web/.dockerignore` | Frontend image |
| `docker/reverse-proxy/nginx/*` · `docker/reverse-proxy/caddy/*` | Proxy images + configs |
| `.env.production.example` · `.env.backend.example` · `.env.frontend.example` · `.env.test.example` | Env templates (no secrets) |

The dev Compose (`docker/compose/docker-compose.dev.yml`) is unchanged.
