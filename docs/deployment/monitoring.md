# Monitoring & Observability Stack

ParkTwin AI provides built-in Prometheus metrics, structured log enrichment with `request_id`, and pre-configured Grafana dashboards for monitoring system health, camera frame processing speeds, and parking lot occupancy in production.

## 1. Overview

The monitoring architecture consists of:
- **FastAPI Prometheus Instrumentator**: Exposes `GET /metrics` on the backend for standard HTTP request latency, status codes, and in-flight request counts.
- **Custom Business Metrics** (`modules/integration_layer/metrics.py`):
  - `parktwin_parking_occupancy_rate` (Gauge per `camera_id`)
  - `parktwin_vehicles_detected_total` (Counter per `camera_id`)
  - `parktwin_frame_processing_duration_seconds` (Histogram)
- **Structured Log Context**: Every log line includes `[request_id]` via `logger.contextualize()`.
- **Reverse Proxy Protection**: Public external access to `/metrics` is blocked by default in Nginx and Caddy (returns HTTP 403 Forbidden).

---

## 2. Running Prometheus & Grafana

The monitoring stack is defined as an optional profile in `docker/compose/docker-compose.prod.yml`.

To launch ParkTwin AI with monitoring enabled:

```bash
docker compose -f docker/compose/docker-compose.prod.yml --profile monitoring up -d
```

### Services

| Service | Internal URL | External Port (Host) | Default Credentials |
|---------|--------------|----------------------|--------------------|
| **Prometheus** | `http://prometheus:9090` | Internal network only | None |
| **Grafana** | `http://grafana:3000` | `http://localhost:3001` | `admin` / `${GRAFANA_ADMIN_PASSWORD}` |

---

## 3. Prometheus Metrics Endpoint

The `/metrics` endpoint is exposed directly on the FastAPI backend:

```bash
curl http://localhost:8000/metrics
```

Example metrics output:

```text
# HELP parktwin_parking_occupancy_rate Parking occupancy rate (0.0 to 1.0) per camera
# TYPE parktwin_parking_occupancy_rate gauge
parktwin_parking_occupancy_rate{camera_id="CAM-001"} 0.75

# HELP parktwin_vehicles_detected_total Total count of vehicles detected per camera
# TYPE parktwin_vehicles_detected_total counter
parktwin_vehicles_detected_total{camera_id="CAM-001"} 42.0

# HELP parktwin_frame_processing_duration_seconds Time spent processing a video frame in seconds
# TYPE parktwin_frame_processing_duration_seconds histogram
parktwin_frame_processing_duration_seconds_bucket{le="0.1"} 12
```

---

## 4. Health Telemetry (`GET /health/stats`)

Extended system statistics are available at `GET /health/stats`:

```json
{
  "active_tracks": 4,
  "uptime_seconds": 3600.5,
  "request_count_last_minute": 150,
  "error_count_last_minute": 0
}
```
