# Architecture

ParkTwin AI is a **multi-module** platform. Five backend modules and an
integration layer implement the full pipeline
(video → detection → tracking → OCR → parking intelligence → analytics → reports),
consumed by a React dashboard.

## Top-level layout

| Directory | Responsibility |
|---|---|
| `backend/` | Application infrastructure: FastAPI app factory, API routers, config loading, database/session, schemas, DI. The **single** place that wires every module. |
| `engine/` | End-to-end AI pipeline orchestration that wires the business modules together. |
| `modules/` | Business logic, organised by **capability**. One package per module: `vehicle_recognition` (M1), `parking_intelligence` (M2), `integration_layer` (M3), `analytics` (M4), `reporting` (M5). |
| `shared/` | Cross-cutting, reusable code with no business/app dependency (logging, helpers; constants/events/exceptions reserved). |
| `configs/` | Master configuration (`settings.yaml`, env-overridable). Single config file. |
| `models/` | Model weights + model configuration only (no business logic). |
| `datasets/` | Datasets (gitignored contents; placeholder kept). |
| `apps/web/` | **Primary production frontend** — Next.js 15 (App Router), React 19, TypeScript. |
| `frontend/` | **Legacy React/Vite SPA — reference only.** Preserved untouched. |
| `docker/` | Backend `Dockerfile` + dev `docker-compose`. |
| `tests/` | `unit/` and `integration/` tests. |
| `docs/` | Architecture, API, diagrams, developer guide, deployment. |
| `scripts/` | Utility scripts (reserved placeholders). |

## Dependency direction

```
shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend
```

- `shared` depends on nothing internal.
- `modules/*` (business logic) depend on `backend` (config/database/schemas) and `shared`.
- `engine` depends on `modules` (public classes) and `backend`/`shared`; it is the
  only place that wires modules into an end-to-end pipeline.
- `backend` (api/app) is the single layer that wires `engine` + `modules` +
  `database` + `shared`.
- Lower modules never import higher ones. Cross-module consumption of M3/M4
  happens **only** through each module's own `integration_client.py` boundary.

## The pipeline (M1 → M2 → M3 → M4 → M5)

```
Video / frame
  → detection → tracking → classification (type/brand/color)
  → plate_detection → ocr → fusion
  → snapshot → storage (parktwin.db)              [M1]
        │
        ▼
ParkingIntelligenceEngine.ingest_frame           [M2]
  (mapping → occupancy → sessions → duration → violations → events)
        │
        ▼
IntegrationService.handle_frame                  [M3]
  (publishes events, broadcasts over /integration/ws, exposes /integration/*)
        │
        ▼
Analytics (M4) → Reporting (M5)                  (consume M3 + M4 only)
        │
        ▼
React dashboard (apps/web)  polls /integration/*, /analytics/*, /reports/*
                     + subscribes to /integration/ws
```

## Single wiring point

`backend/app/app.py` (`create_app()`) mounts every router in dependency order:

```
health → cameras → vehicles → parking → integration → analytics → reporting
```

Only `backend/app/app.py` and `backend/api/dependencies.py` may import across all
layers. Everywhere else, respect the dependency direction above.

## Databases

| Store | Backend | Contents |
|-------|---------|----------|
| `parktwin.db` | SQLAlchemy (`Base` in `backend/database/models.py`) | cameras, vehicles, detection_logs, parking_slots, parking_sessions, parking_events |
| `analytics.db` | raw aiosqlite (`modules/analytics/storage/store.py`) | analytics snapshots |
| `reports.db` | raw aiosqlite (`modules/reporting/storage/report_store.py`) | report records |

New *operational* tables use the canonical `Base` and `parktwin.db`, unless a
Change Log entry justifies a separate store.

See [`PROJECT_MEMORY.md`](../../PROJECT_MEMORY.md#2-module-inventory) for the
authoritative module inventory and dependency rules.
