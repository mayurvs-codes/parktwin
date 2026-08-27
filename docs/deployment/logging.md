# Logging

ParkTwin AI uses **Loguru** via the canonical logger in
`shared/logging/logger.py` (`get_logger(__name__)`). Backend code uses this
logger — not bare `print()`.

## Configuration

Logging is configured in `configs/settings.yaml` under `logging:` and overridable
with the `LOG_LEVEL` environment variable.

```yaml
logging:
  level: "INFO"            # DEBUG / INFO / WARNING / ERROR  (set by LOG_LEVEL in prod)
  format: "json"          # json | text
  file: "logs/parktwin.log"
  max_size_mb: 100
  backup_count: 5
  log_detections: true
  log_ocr: true
  log_tracking: true
  log_api: true
  log_gpu: true
```

`LOG_LEVEL` (environment) overrides `logging.level`.

## Production characteristics (verified)

- **Structured logging** — JSON lines by default (`format: json`), easy to ship
  to aggregators. Set `format: "text"` for human-readable local logs.
- **Rotation** — the file sink rotates at `max_size_mb` (default 100 MB) keeping
  `backup_count` files (default 5).
- **Log levels** — `LOG_LEVEL` controls verbosity. **Production must use
  `INFO` (or `WARNING`), never `DEBUG`.** The prod env template and Compose set
  `LOG_LEVEL=INFO`.
- **Container logging** — the structured logger mirrors to **stderr**, which
  Docker captures via the `json-file` driver (rotated `10m` × `5` in the prod
  Compose). No `curl`/`tail` needed — `docker logs` works.
- **Error logs** — exceptions are emitted through the same logger (level
  `ERROR`/`CRITICAL`); `app.critical(...)` fires on DB / model-load failure and on
  the default `SECRET_KEY` in production.
- **Access logs** — uvicorn access logs and the reverse proxy access logs
  (Nginx/Caddy) provide request-level visibility in front of the app.

## Where logs go

- **File:** `LOG_DIR/parktwin.json.log` (default `logs/`, or
  `/app/backend/logs` in the prod container, mounted as the `backend-logs`
  volume so logs persist and rotate across restarts).
- **Console:** mirrored to stderr (Docker `json-file`, rotated).
- **Format:** JSON lines for easy shipping.

## What is logged

Per the flags above: detection results, OCR passes, tracking updates, API
requests, GPU status. Adjust the boolean flags to reduce noise in production.

## Shipping to an aggregator

Because logs are JSON lines on stdout plus a rotating file, point Filebeat /
Promtail / the Docker logging driver at the console stream or the `backend-logs/`
directory (mounted volume). No code change required.

## Frontend

The Next.js frontend has no server-side logger. Client errors surface through
React error boundaries (`app/error.tsx`) and the browser console; there is no
`console.log` in the shipped components.
