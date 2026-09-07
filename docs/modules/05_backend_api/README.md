# Section 05: Backend API Architecture

The **Backend API** layer (`backend/`) is built on **FastAPI** and **SQLAlchemy 2.0**, exposing asynchronous REST and WebSocket interfaces for video ingestion, vehicle management, parking control, multi-station journeys, and configuration.

---

## Architecture & Router Topology

```mermaid
graph TD
    Client[Web Browser / Next.js / Mobile / API Client] --> App[backend/app/app.py<br>FastAPI App & Lifespan Hooks]
    
    App --> Auth[auth/deps.py<br>Bearer Token Auth]
    
    App --> R1[routers/anpr.py<br>POST /api/v1/anpr/upload]
    App --> R2[routers/vehicles.py<br>GET /api/v1/vehicles]
    App --> R3[routers/parking.py<br>GET /api/v1/parking/*]
    App --> R4[routers/journey.py<br>POST /api/v1/journey/upload]
    App --> R5[routers/cameras.py<br>GET /api/v1/cameras]
    App --> R6[routers/health.py<br>GET /health]
    App --> R7[gateway/router.py<br>/integration/slots, occupancy, sessions]
    App --> R8[websocket/router.py<br>/ws/realtime]
    
    R1 & R4 --> AS[services/anpr_service.py]
    R2 & R3 & R5 & R7 --> DB[(SQLite / PostgreSQL<br>SQLAlchemy 2.0 Engine)]
```

---

## Router Directory Reference

| Document | Endpoint Prefix | Purpose |
| :--- | :--- | :--- |
| [`anpr_api.md`](./anpr_api.md) | `/api/v1/anpr` | Multipart video upload, batch ANPR pipeline, annotated video, CSV/JSON downloads, auto-cleanup |
| [`vehicles_api.md`](./vehicles_api.md) | `/api/v1/vehicles` | Search, filter, and retrieve historical vehicle recognition records and snapshot crops |
| [`parking_api.md`](./parking_api.md) | `/api/v1/parking` | Parking slot status queries, reservation overrides, bay configuration |
| [`journey_api.md`](./journey_api.md) | `/api/v1/journey` | Multi-camera journey tracking across Entry Station, Parking Lot, and Exit Station |
| [`auth_and_security.md`](./auth_and_security.md) | N/A | Bearer token authentication, API keys, role-based authorization |
| [`database.md`](./database.md) | N/A | SQLAlchemy ORM models, SQLite WAL mode, schema tables, indexes, and connection pooling |
| [`configuration.md`](./configuration.md) | N/A | Full annotated reference of `settings.yaml` and environment variables |
