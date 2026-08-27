# ParkTwin AI — Repository Architecture

ParkTwin AI is a **multi-module** platform for **parking intelligence**.
Five backend modules and an integration layer implement the full pipeline
(video → detection → tracking → OCR → parking intelligence → analytics →
reports), consumed by a React dashboard. Later modules were added as siblings
of Module 1 without restructuring.

## Top-level layout

| Directory | Responsibility |
|---|---|
| `backend/` | Application infrastructure: FastAPI app factory, API routers, config loading, database/session, schemas, DI. The **single** place that wires every module. |
| `engine/` | End-to-end AI pipeline orchestration that wires the business modules together. |
| `modules/` | Business logic, organized by **capability** (not technical layer). One package per module: `vehicle_recognition` (M1), `parking_intelligence` (M2), `integration_layer` (M3), `analytics` (M4), `reporting` (M5). |
| `shared/` | Cross-cutting, reusable code with no business/app dependency (logging, helpers, reserved constants/events/exceptions). |
| `configs/` | Master configuration (`settings.yaml`, env-overridable). Single config file. |
| `models/` | Model weights + model configuration only (no business logic). |
| `datasets/` | Datasets (gitignored contents; placeholder kept). |
| `apps/web/` | **Primary production frontend** — Next.js 15 (App Router), React 19, TypeScript. Dashboard, Live Parking, Vehicles, Analytics, Reports implemented; Settings is a placeholder. |
| `frontend/` | **Legacy React/Vite SPA — reference only.** Preserved untouched as the historical implementation. |
| `docker/` | Backend `Dockerfile` + dev `docker-compose`. |
| `tests/` | `unit/` and `integration/` tests. |
| `docs/` | Architecture, API, and diagram documentation. |
| `scripts/` | Utility scripts (reserved placeholders). |

## Modules

| # | Package | Responsibility |
|---|---------|----------------|
| 1 | `modules/vehicle_recognition/` | Vehicle + plate detection, tracking, classification, OCR, snapshots, vehicle CRUD |
| 2 | `modules/parking_intelligence/` | Slots, vehicle↔slot mapping, occupancy, sessions, duration, violations, events |
| 3 | `modules/integration_layer/` | Unified gateway API, event bus, WebSocket broadcast, cross-module sync, DTO adapters |
| 4 | `modules/analytics/` | Occupancy / traffic / utilisation / trend metrics over Integration DTOs |
| 5 | `modules/reporting/` | Report generation, templating, export (json / csv / pdf), report store |

## Dependency rule

```
shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend
```

- `shared` depends on nothing internal.
- `modules/*` (business logic) depend on `backend` (config/database/schemas) and `shared`.
- `engine` depends on `modules` (public classes) and `backend`/`shared`; it is the only
  place that wires modules into an end-to-end pipeline.
- `backend` (api/app) is the single layer that wires `engine` + `modules` + `database` + `shared`.
- Lower modules never import higher ones. Cross-module consumption of M3/M4 happens
  only through each module's own `integration_client.py` boundary.

## Module 1: `modules/vehicle_recognition/`

```
detection/        vehicle detection (YOLO)
tracking/         multi-object tracking
classification/   vehicle type / brand / color
plate_detection/  license-plate detection
ocr/              PaddleOCR engine + enhancer
fusion/           OCR fusion / plate formatting
snapshot/         snapshot generation
storage/          persistence of recognition results (CRUD)
```

## Pipeline (M1 → M2 → M3)

```
Video / frame
  → detection → tracking → classification (type/brand/color)
  → plate_detection → ocr → fusion
  → snapshot → storage (parktwin.db)
        │
        ▼
ParkingIntelligenceEngine.ingest_frame  (M2: mapping → occupancy → sessions →
                                         duration → violations → events)
        │
        ▼
IntegrationService.handle_frame  (M3: publishes events, broadcasts over
  /integration/ws, exposes the /integration/* gateway)
        │
        ▼
Analytics (M4) → Reporting (M5)  (consume M3 + M4 only)
        │
        ▼
React dashboard (apps/web)  polls /integration/*, /analytics/*, /reports/*
                     + subscribes to /integration/ws
```

See `PROJECT_MEMORY.md` for the authoritative module inventory, API surface,
ownership table, and duplicate registry.
