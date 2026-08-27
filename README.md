# ParkTwin AI

<p align="center">
  <strong>A modular, inference-only computer-vision platform for parking intelligence.</strong>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="Python" src="https://img.shields.io/badge/python-3.10%2B-3776AB.svg" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.111-009688.svg" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-black.svg" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB.svg" />
</p>

ParkTwin AI ingests CCTV / video frames, recognises vehicles and licence plates
(ANPR), maps vehicles to parking slots, tracks parking sessions and violations,
and exposes analytics and reports through a REST / WebSocket API consumed by a
React dashboard.

> **Modules use pre-trained weights — there is no training, augmentation, or
> benchmarking pipeline in scope.** The platform is *inference-only*: it loads
> existing models and runs them.

---

## Table of contents

- [Project overview](#project-overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture overview](#architecture-overview)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Installation](#installation)
- [Docker setup](#docker-setup)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [Testing](#testing)
- [API overview](#api-overview)
- [Frontend overview](#frontend-overview)
- [Backend overview](#backend-overview)
- [Analytics](#analytics)
- [Reporting](#reporting)
- [Future roadmap](#future-roadmap)
- [Digital Twin roadmap](#digital-twin-roadmap)
- [License](#license)
- [Contributing](#contributing)

---

## Project overview

ParkTwin AI is a clean, capability-based platform for **parking intelligence**.
It is built from five backend modules plus an integration layer, wired into a
single FastAPI application, and consumed by a Next.js dashboard. Each
responsibility has **exactly one owner** — there are no parallel implementations
of occupancy, slot mapping, duration, event bus, or reporting logic.

The platform is designed so that new capabilities "drop in" as sibling packages
under `modules/`, consuming lower layers through explicit dependency boundaries.
A single canonical SQLAlchemy schema (`parktwin.db`) holds the operational data;
analytics and reporting snapshots live in their own stores.

**Status:** Production-ready for an internal / trusted-network deployment. The
single blocker for public exposure is authentication — see
[Security](SECURITY.md) and the
[final system audit](PROJECT_MEMORY.md#16-final-system-audit-2026-07-20).

---

## Features

| Area | What it does |
|------|--------------|
| **Vehicle recognition (M1)** | Real-time vehicle detection (YOLO), multi-object tracking (ByteTrack), type / brand / colour classification, licence-plate detection, OCR (PaddleOCR + EasyOCR fallback), and plate normalisation / fusion. |
| **Parking intelligence (M2)** | Slot definition, vehicle↔slot mapping, live occupancy, parking-session lifecycle, duration tracking, violation detection, and parking-lifecycle events. |
| **Integration layer (M3)** | A unified `/integration` gateway, a cross-module event bus (in-memory or Redis), WebSocket live broadcast, and one-directional cross-module synchronisation. |
| **Analytics (M4)** | Occupancy, traffic, utilisation, and trend metrics computed over Integration DTOs, persisted as time-series snapshots. |
| **Reporting (M5)** | On-demand report generation (JSON / CSV / PDF) with templated sections, export, and a report store. |
| **Dashboard (apps/web)** | Next.js 15 production frontend with Dashboard, Live Parking, Vehicles, Analytics, and Reports views. Presentation-only — every aggregate is computed backend-side. |

---

## Screenshots

> Screenshots are **placeholders**. Drop real captures into `docs/assets/screens/`
> and update the paths below. The `frontend/` (legacy) reference screenshots
> live in `github/branding/screenshots/` and are intentionally not part of the
> current production frontend.

| View | Image |
|------|-------|
| Dashboard | `docs/assets/screens/dashboard.png` |
| Live Parking | `docs/assets/screens/live-parking.png` |
| Vehicles | `docs/assets/screens/vehicles.png` |
| Analytics | `docs/assets/screens/analytics.png` |
| Reports | `docs/assets/screens/reports.png` |

---

## Architecture overview

ParkTwin AI follows a strict one-directional dependency flow:

```
shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend
```

Lower modules never import higher ones. Cross-module consumption of M3/M4 happens
**only** through each module's own `integration_client.py` boundary file.
`backend/app/app.py` is the single place that wires every module together.

A request flows: camera / uploaded frame → M1 (recognition) → M2 (parking
intelligence) → M3 (gateway + events + WebSocket) → M4 (analytics) → M5
(reporting) → React dashboard.

See [`docs/diagrams/`](docs/diagrams/) for the full set of Mermaid diagrams and
[`docs/architecture/architecture.md`](docs/architecture/architecture.md) for the
authoritative layout.

---

## Tech stack

**Backend**

- Python 3.10+ (3.12 recommended for the ML stack)
- FastAPI 0.111, Uvicorn 0.30
- SQLAlchemy 2.0 (async), aiosqlite / asyncpg
- OpenCV, NumPy, Ultralytics (YOLOv8), PyTorch / TorchVision
- PaddleOCR, EasyOCR
- Pydantic / Pydantic-Settings
- Loguru

**Frontend (primary: `apps/web`)**

- Next.js 15 (App Router), React 19, TypeScript (strict)
- Tailwind CSS 3 + shadcn/ui-style primitives (CVA-based, no Radix dependency)
- TanStack Query v5 (data layer)
- Axios (HTTP), Recharts (charts), Lucide (icons)
- ESLint + Prettier

**Infra**

- Docker (backend image provided), Docker Compose (dev)
- SQLite (default) or PostgreSQL (production)

---

## Repository structure

```
parktwin/
├─ backend/          App infra: FastAPI factory, routers, config, DB, schemas, DI
├─ engine/           End-to-end AI pipeline + camera capture
├─ modules/          Business logic, one package per capability (M1–M5)
│  ├─ vehicle_recognition/   detection, tracking, classification, plate, ocr, fusion, snapshot, storage
│  ├─ parking_intelligence/  slots, mapping, occupancy, sessions, duration, violations, events, storage
│  ├─ integration_layer/     events, adapters, gateway, websocket, services, sync
│  ├─ analytics/             api, metrics, storage
│  └─ reporting/             api, generators, exporters, templates, storage
├─ shared/           Logging, helpers (constants/events/exceptions reserved)
├─ configs/          settings.yaml — single master config (env-overridable)
├─ models/           Model weights + model config only
├─ datasets/         Datasets (gitignored)
├─ frontend/         Legacy React/Vite SPA — reference only
├─ apps/web/         Next.js 15 production frontend (primary)
├─ tests/            unit/ + integration/
├─ docs/             architecture/ · api/ · diagrams/ · developer-guide/ · deployment/
├─ docker/           backend/Dockerfile, compose/docker-compose.dev.yml, compose/docker-compose.prod.yml (+ .caddy.yml), reverse-proxy/{nginx,caddy}
├─ scripts/          Utility scripts (reserved placeholders)
├─ parktwin.db       Canonical SQLite DB (runtime artifact)
├─ analytics.db      M4 time-series store (runtime artifact)
├─ reports.db        M5 report store (runtime artifact)
└─ reports_output/   Generated report files (runtime artifact)
```

> `.db` files and model `*.pt` weights are runtime / gitignored artifacts, not source.

---

## Installation

### Backend

```bash
# 1. (Optional) create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install (editable)
pip install -e .

# 3. Configure (optional)
cp .env.example .env

# 4. Weights auto-download on first run if missing.
#    yolov8m.pt        -> models/vehicle_detection/
#    plate_detector.pt -> models/plate_detection/
#    (other weights configured in configs/settings.yaml)
```

### Frontend (`apps/web`)

```bash
cd apps/web
npm install
```

---

## Docker setup

A backend container image is provided under `docker/`. For **development** (backend
only):

```bash
docker compose -f docker/compose/docker-compose.dev.yml up --build
```

For a **production** deployment (backend + frontend + reverse proxy, with volumes,
health checks, and network isolation):

```bash
cp .env.production.example .env.production          # set a REAL SECRET_KEY
export DOMAIN=parktwin.example.com
docker compose -f docker/compose/docker-compose.prod.yml up -d --build
```

The images run the full FastAPI app (`backend.app.app:app`) on `:8000` and the
Next.js frontend on `:3000`, behind a reverse proxy on `:443`. Both ship with
container health checks (`/health`, `GET /`). See
[`docs/deployment/`](docs/deployment/) for full production, reverse-proxy, HTTPS,
environment, health-check, and logging guidance.

---

## Environment variables

All variables are **optional**; `configs/settings.yaml` provides defaults. Only
the five below are read from the environment by the settings loader. The rest are
overridden via the YAML file.

| Variable | Scope | Default | Notes |
|----------|-------|---------|-------|
| `DATABASE_URL` | Backend | `sqlite+aiosqlite:///./parktwin.db` | `postgresql+asyncpg://...` for PostgreSQL |
| `REDIS_URL` | Backend | `redis://localhost:6379/0` | Used by the Redis event bus (optional) |
| `SECRET_KEY` | Backend | `CHANGE_ME_IN_PRODUCTION` | **Change before any production deployment** |
| `LOG_LEVEL` | Backend | `DEBUG` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `ENVIRONMENT` | Backend | `development` | `development` or `production` |
| `INTEGRATION_EVENT_BUS` | Backend | `memory` | `memory` or `redis` |
| `NEXT_PUBLIC_API_BASE` | Frontend | `http://localhost:8000` | Backend base URL (inlined at build time) |
| `NEXT_PUBLIC_APP_NAME` | Frontend | `ParkTwin AI` | App name shown in the shell |
| `NEXT_PUBLIC_API_TIMEOUT` | Frontend | `15000` | Axios timeout (ms) |
| `NEXT_PUBLIC_DEFAULT_PAGE_SIZE` | Frontend | `20` | Default page size |

Full reference: [`docs/deployment/environment-variables.md`](docs/deployment/environment-variables.md).

---

## Running locally

### Backend

```bash
uvicorn backend.app.app:app --reload --port 8000
# or:
python -m backend.main

# Interactive API docs: http://localhost:8000/docs  (Redoc: /redoc)
```

The default database is a local SQLite file (`parktwin.db`). Set
`DATABASE_URL=postgresql+asyncpg://...` for PostgreSQL.

### Frontend

```bash
cd apps/web
npm run dev          # http://localhost:3000  (Next.js dev server)
```

The frontend talks to the backend through the **`/integration`** gateway
(`NEXT_PUBLIC_API_BASE`, default `http://localhost:8000`). It performs **no
business logic** — every aggregate is computed backend-side and consumed
verbatim.

---

## Running with Docker

**Development (backend only):**

```bash
docker compose -f docker/compose/docker-compose.dev.yml up --build          # foreground
docker compose -f docker/compose/docker-compose.dev.yml up -d --build       # detached
docker compose -f docker/compose/docker-compose.dev.yml down                # tear down
```

The dev Compose file runs **only the backend** container.

**Production (full stack):**

```bash
export DOMAIN=parktwin.example.com
docker compose -f docker/compose/docker-compose.prod.yml up -d --build
# Optional infra via profiles:
docker compose -f docker/compose/docker-compose.prod.yml --profile postgres --profile redis up -d --build
# Swap the proxy to Caddy (auto-TLS):
docker compose -f docker/compose/docker-compose.prod.yml -f docker/compose/docker-compose.prod.caddy.yml up -d --build
```

---

## Testing

### Backend

```bash
pytest -q
```

Covers configuration, validators, plate formatting (OCR fusion), database
(SQLite), the full API surface, the analytics / reporting engines, and the
architecture-ownership regression (Module 2 is the sole owner of parking-slot
assignment). `test_parktwin.db` is regenerated by the suite on each run.

### Frontend (`apps/web`)

```bash
cd apps/web
npm run typecheck    # tsc --noEmit  (strict)
npm run lint         # next lint
npm run build        # next build
```

---

## API overview

All routers are mounted at the root by `backend/app/app.py`. The **`/integration`
gateway is the preferred external surface** for frontend and external consumers;
the direct `/vehicles` and `/parking` routers remain the low-level module surface.

| Area | Prefix | Notes |
|------|--------|-------|
| Meta | `/` | service meta dict |
| Health | `/health`, `/health/db`, `/health/stats` | service / DB / pipeline health |
| Cameras | `/cameras` | register / list / retrieve / remove camera sources |
| Vehicles (M1) | `/vehicles` | list, retrieve, `recognize`, `process-frame`, `process-video` |
| Parking (M2) | `/parking` | slots, sessions, events, occupancy, statistics |
| **Integration gateway (M3)** | `/integration` | **preferred**: `health`, `vehicles`, `slots`, `sessions`, `occupancy`, `statistics`, `events`, `sync`, `process-frame`, `process-video`, `ws` |
| Analytics (M4) | `/analytics` | `occupancy`, `traffic`, `utilization`, `trends`, `dashboard` |
| Reports (M5) | `/reports` | `list`, `history`, `generate`, `download`, `detail` |

Full endpoint-by-endpoint documentation: [`docs/api/`](docs/api/).

---

## Frontend overview

The primary frontend is **`apps/web/`** — a Next.js 15 (App Router) application
written in React 19 + TypeScript. It is **presentation-only**: no occupancy,
duration, or analytics math lives on the client. Every value comes verbatim from
the backend `/integration`, `/analytics`, and `/reports` routers.

Implemented views:

- **Dashboard** — KPI grid, recent activity, alerts, system health, quick actions.
- **Live Parking** — responsive slot-grid visualisation with occupancy summary and slot details.
- **Vehicles** — sortable, filterable vehicle table with detail dialog and history.
- **Analytics** — overview metrics, occupancy / traffic / peak-usage / utilisation / time-based charts (Recharts).
- **Reports** — report categories, generation, history, read-only preview, download / regenerate.
- **Settings** — intentional placeholder.

`frontend/` is the **legacy React/Vite SPA**, preserved untouched as a reference
implementation. It is not the primary frontend going forward.

---

## Backend overview

| Layer | Responsibility | Location |
|-------|----------------|----------|
| `backend` | App factory, routers, config, DB/session, schemas, DI | `backend/` |
| `engine` | End-to-end AI pipeline + camera capture | `engine/` |
| `vehicle_recognition` (M1) | Detection, tracking, classification, plate, OCR, fusion, snapshot, CRUD | `modules/vehicle_recognition/` |
| `parking_intelligence` (M2) | Slots, mapping, occupancy, sessions, duration, violations, events | `modules/parking_intelligence/` |
| `integration_layer` (M3) | Gateway, event bus, WebSocket, sync, DTO adapters | `modules/integration_layer/` |
| `analytics` (M4) | Occupancy / traffic / utilisation / trend metrics | `modules/analytics/` |
| `reporting` (M5) | Generation, templating, export, report store | `modules/reporting/` |
| `shared` | Logging, validators (constants / events / exceptions reserved) | `shared/` |

The canonical ORM `Base` lives in `backend/database/models.py`; Module 2 imports
the same `Base`, so there is a single metadata and a single operational database
(`parktwin.db`). Analytics and reporting use separate SQLite stores
(`analytics.db`, `reports.db`).

---

## Analytics

The Analytics Engine (M4) consumes Integration DTOs only and never re-implements
occupancy/duration math — it surfaces Module 2's authoritative values.

| Endpoint | Returns |
|----------|---------|
| `GET /analytics/occupancy` | Current occupancy, percentage, free/reserved slots, average occupancy |
| `GET /analytics/traffic` | Vehicle entries/exits, peak hour, hourly/daily traffic, counts |
| `GET /analytics/utilization` | Slot utilisation, average duration, most/least used slots, turnover |
| `GET /analytics/trends` | Occupancy/traffic timelines + session & duration statistics |
| `GET /analytics/dashboard` | Combined dashboard (all metrics) |

Each call can persist a snapshot into `analytics.db` for trend history. See
[`docs/api/analytics.md`](docs/api/analytics.md).

---

## Reporting

The Reporting Engine (M5) is a pure consumer of the Analytics Engine and
Integration Layer — it never reads Module 1 / Module 2 internals directly.

**Report types:** `parking_summary`, `occupancy`, `vehicle`, `parking_session`,
`violation`, `analytics_summary`.

**Export formats:** `json`, `csv`, `pdf`.

| Endpoint | Purpose |
|----------|---------|
| `GET /reports` | List stored reports (metadata) |
| `GET /reports/history` | Full generation history, newest first |
| `POST /reports/generate` | Generate (or regenerate) a report |
| `GET /reports/download` | Download a report file |
| `GET /reports/{report_id}` | Fetch one report, including stored content |

See [`docs/api/reporting.md`](docs/api/reporting.md).

---

## Future roadmap

- **Authentication & authorization** — API-key / JWT auth on all REST routers and
  the `/integration/ws` WebSocket, plus normalised 5xx error responses before any
  public exposure.
- **PostgreSQL by default** in production, with the optional Redis event bus
  enabled for multi-process deployments.
- **Resolved duplicate consolidation** — the duplication documented in
  [`DUPLICATE_REGISTRY.md`](DUPLICATE_REGISTRY.md) (D1–D13) is tracked and
  intentionally retained; consolidation follows the documented canonical choices.
- **Expanded dashboards** — the Settings view and additional operational widgets.
- **Pinned, tested ML stack** — a tested upper bound on `torch` and friends.

## Digital Twin roadmap

The platform is architected to grow a **Digital Twin** capability as a sibling
module (M7+):

- A virtual, stateful mirror of the physical car park driven by the same
  Integration DTOs the dashboard consumes.
- Simulation of "what-if" scenarios (inbound flow, slot reallocation, incident
  response) against the live occupancy model.
- Reuse of the existing `/integration` gateway and event bus as the twin's data
  source — no new ingestion path required.
- A dedicated read-only dashboard surface projection (presentation-only, like the
  current `apps/web` views).

> The Digital Twin is **not yet implemented**. It is noted here as the intended
> next architectural sibling so future work follows the same one-owner,
> one-directional-dependency rules.

---

## License

Released under the [MIT License](LICENSE).

---

## Contributing

Contributions are welcome. Please read
[`CONTRIBUTING.md`](CONTRIBUTING.md) for development setup, branch strategy, the
pull-request workflow, coding standards, and testing requirements before opening
a PR.

For architecture-sensitive changes, **read
[`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) first** — it is the single source of
truth for module ownership and the duplicate registry, and must be updated when
you add or move any module, service, model, endpoint, or resolve a duplicate.

### Documentation

- [`docs/architecture/architecture.md`](docs/architecture/architecture.md) — architecture & dependency rules
- [`docs/developer-guide/`](docs/developer-guide/) — module responsibilities, conventions, how to add modules/pages
- [`docs/deployment/`](docs/deployment/) — production deployment, Docker, reverse proxy, HTTPS, troubleshooting
- [`docs/api/`](docs/api/) — endpoint reference
- [`docs/diagrams/`](docs/diagrams/) — Mermaid architecture & flow diagrams
- [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) — ownership, API inventory, duplicate registry
- [`DUPLICATE_REGISTRY.md`](DUPLICATE_REGISTRY.md) — tracked duplicate implementations
- [`MIGRATION_REPORT.md`](MIGRATION_REPORT.md) — history of the multi-module refactor
