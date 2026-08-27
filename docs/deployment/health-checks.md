# Health Checks

Health checks drive container/orchestrator probes, load-balancer checks, and the
Compose dependency ordering in the production stack.

## Backend endpoints

| Method | Path | Returns | Use |
|--------|------|---------|-----|
| GET | `/health` | `status`, `version`, `environment`, `database`, `event_bus`, `gpu`, `active_cameras`, `uptime_seconds`, `pipeline_ready` | liveness / readiness |
| GET | `/health/db` | `{ status, database }` | DB-only connectivity |
| GET | `/health/stats` | pipeline + tracker statistics | ops / debugging |

`/health` reports `status: "healthy"` when the DB is connected, otherwise
`"degraded"`. The `database` field is `"connected"` or `"disconnected"`. The DB
check is best-effort and does **not** block the 200 response (the service is
considered up even before models finish loading).

## Container health checks

### Backend (Dockerfile + Compose)

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).status == 200 else 1)"
```

The slim image ships no `curl`, so the probe uses Python's stdlib `urllib`.

### Frontend (Dockerfile + Compose)

The SPA root returns HTTP 200 (HTML). Node 20 has global `fetch`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

> The frontend is a static SPA with no server-side health route; "frontend
> health" is the proxy/SPA returning 200 for `GET /`. The dashboard's live
> backend indicator uses `GET /integration/health` (`GatewayHealth`), which is a
> UI signal, not an infra probe.

### Proxy

- **Nginx:** `service nginx status` (process alive).
- **Caddy:** `caddy version` (binary/process alive).

### Optional infra

- **PostgreSQL:** `pg_isready -U parktwin -d parktwin_db`.
- **Redis:** `redis-cli ping`.

## Dependency ordering (production Compose)

`depends_on` uses `condition: service_healthy` so the stack comes up in order:

```
backend  ──healthy──▶  frontend  ──healthy──▶  proxy
   │                        │
   └── (postgres profile) ──┘
```

This guarantees the backend (DB + models) is ready before the frontend serves
traffic and before the proxy starts routing.

## Orchestrator probes (example)

```yaml
livenessProbe:
  httpGet: { path: /health, port: 8000 }
  initialDelaySeconds: 30
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /health, port: 8000 }
  periodSeconds: 10
```

## Monitoring strategy

- **Liveness/readiness:** the `/health` endpoint (and the container healthchecks
  above) are the source of truth for orchestrators.
- **Application logs:** structured JSON on stdout (Docker `json-file`, rotated
  10 MB × 5) + a rotating file in `backend-logs`. Ship via Promtail/Filebeat or
  the Docker logging driver to your aggregator. See [Logging](logging.md).
- **Metrics:** poll `/health/stats` and `/integration/health` for pipeline/tracker
  state, camera counts, and event-bus status. No Prometheus exporter ships today;
  scrape these endpoints or add an exporter later.
- **Frontend:** client-side errors surface via React error boundaries
  (`app/error.tsx`); no server-side frontend logger.
- **Alerting recommendations:** backend `status != healthy`, DB `disconnected`,
  `pipeline_ready == false`, or zero `active_cameras` when cameras are configured.
