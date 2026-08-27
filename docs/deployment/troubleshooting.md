# Troubleshooting

Common failures and how to fix them.

## Backend fails to start

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ModuleNotFoundError: ...backend...` | `PYTHONPATH` not set / not installed | `pip install -e .` from the repo root; ensure `PYTHONPATH=/app` in containers. |
| ` KeyError: weights` / model missing | Model weights not downloaded | Run once locally so weights auto-download into `models/`; mount `models/` as a volume in Docker. |
| `ImportError: libc...` at runtime | Missing system libs (opencv/paddle/torch) | Use the provided `docker/backend/Dockerfile` (Python 3.12 + the listed `apt` libs). On bare metal, install `libgl1`, `libglib2.0-0`, `libsm6`, `libxext6`, `libxrender1`, `libgomp1`. |
| DB locked / `database is locked` | Multiple writers on SQLite | Use PostgreSQL, or keep `--workers 1` with the in-memory bus. |
| Event bus errors mention redis | `INTEGRATION_EVENT_BUS=redis` but no Redis | Start Redis (`--profile redis`), or set `INTEGRATION_EVENT_BUS=memory`. |
| Proxy 502 to backend | backend not healthy yet / crashed | `docker ps` (health), `docker logs parktwin-backend`. The proxy only starts after backend is healthy. |

## Permission denied on a volume

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PermissionError` writing `parktwin.db` / logs | named volume owned by root, container runs as non-root | The backend image pre-creates `/app/data`, `/app/logs`, `/app/reports_output`, `/app/backend/{logs,outputs,snapshots}`, `/app/models`, `/app/datasets` as the `appuser` (uid 10001) so Docker populates the named volume with the right ownership on first mount. If you mounted a host bind dir instead, `chown 10001:10001` it. |

## Camera / capture issues

- `add_camera` reports the camera as `offline` → the source URL is wrong or the
  device isn't available. Check `configs/settings.yaml` `cameras.sources[].url`
  (`0` = webcam, RTSP string, or file path).
- Inference endpoints return 500 with a decoder message → bad base64 or
  unsupported image format. Ensure `image_base64` is a valid image.

## Frontend cannot reach the backend

| Symptom | Fix |
|---------|-----|
| All panels show errors / no data | The frontend calls `${NEXT_PUBLIC_API_BASE}/integration/...`. In production that is `https://<domain>/api` and the proxy strips `/api`. Confirm the proxy routes `/api/` → backend and that `NEXT_PUBLIC_API_BASE` was built with the `/api` suffix. **Rebuild** the frontend after changing it (`npm run build`). |
| Mixed-content blocked | Page is HTTPS but API base is HTTP → set `NEXT_PUBLIC_API_BASE` to `https://.../api`. |
| WebSocket not connecting | `NEXT_PUBLIC_API_BASE` must be an **absolute** `http(s)://` URL (the WS code does `apiBase.replace(/^http/, "ws")`). Empty/relative bases break the socket. Ensure the proxy forwards `/api/integration/ws` with Upgrade headers (Nginx) / handles it (Caddy). |

## API returns 404 for `/analytics`, `/reports`, `/vehicles`, `/parking`

These backend routes live under the `/api` prefix in the proxy topology. Request
them as `/api/analytics`, `/api/reports`, etc. The SPA pages at `/analytics`,
`/reports` are the frontend and are served by the frontend container — they are
not backend routes.

## Analytics / Reporting empty

- Analytics returns empty timelines → call `GET /api/analytics/dashboard` at least
  once (it persists snapshots into `analytics.db`), or run frame ingestion so
  Module 2 produces data for Module 4.
- Reports list is empty → generate one via `POST /api/reports/generate`. Reports
  persist in `reports.db` and files in the `backend-reports` volume.

## TLS / certificates

| Symptom | Fix |
|---------|-----|
| Nginx fails to start: `cannot load certificate` | Provision `fullchain.pem` + `privkey.pem` into the `certs` volume mounted at `/etc/nginx/certs`. See [Reverse proxy](reverse-proxy.md). |
| Caddy can't issue a cert | Ensure `DOMAIN` is a real, publicly-resolvable hostname and port 80 is reachable for ACME. For local testing use `tls internal` + `DOMAIN=localhost`. |

## Logs & health

- `GET /api/health` and `GET /api/health/db` — `status` tells you if the DB is
  connected.
- Inspect logs: `docker logs parktwin-backend` (JSON on stdout) or the
  `backend-logs` volume (`parktwin.json.log`).

## Tests

- `pytest -q` fails on ownership regression → a change reintroduced slot
  ownership in Module 1 or broke the dependency direction. See
  [Dependency rules](../developer-guide/dependency-rules.md).
- `test_parktwin.db` reappears after the suite → expected (regenerated each run,
  gitignored).
- Frontend gates: `npm run typecheck && npm run lint && npm run build` in
  `apps/web` must all pass.
