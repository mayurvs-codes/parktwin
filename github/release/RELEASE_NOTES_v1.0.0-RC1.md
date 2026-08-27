# Release Notes — v1.0.0-RC1

**Release date:** 2026-07-20
**Tag (recommended):** `v1.0.0-RC1`
**Type:** Release Candidate — code-complete, verified, ready for pre-tag review.
**Status:** NOT yet tagged, NOT published. This document is the candidate write-up.

> This is a Release Candidate. No Git tag is created and no GitHub Release is
> published by the release-engineering pass. Tagging (`git tag -s v1.0.0-RC1`)
> and publishing are left to the release owner.

---

## Major Features

ParkTwin AI is a modular, **inference-only** computer-vision platform for parking
intelligence. It ingests CCTV / video frames, recognises vehicles and licence
plates (ANPR), maps vehicles to parking slots, tracks parking sessions and
violations, and exposes analytics and reports through a REST / WebSocket API
consumed by a React dashboard. Every aggregate is computed backend-side; the
frontend is presentation-only.

### Backend Modules (M1–M5)
- **M1 — Vehicle Recognition (ANPR):** detection (YOLO) → multi-object tracking
  (ByteTrack) → type / brand / colour classification → plate detection → OCR
  (PaddleOCR + EasyOCR fallback) → plate normalisation / fusion → snapshot → storage.
- **M2 — Parking Intelligence:** slot definitions, vehicle↔slot mapping, live
  occupancy, parking-session lifecycle, duration tracking, violation detection,
  and parking-lifecycle events. **Sole authoritative owner of parking-slot assignment.**
- **M3 — Integration Layer:** a unified `/integration` gateway, a cross-module
  event bus (in-memory or Redis), WebSocket live broadcast, and one-directional
  cross-module synchronisation.
- **M4 — Analytics:** occupancy / traffic / utilisation / trend metrics computed
  over Integration DTOs, persisted as time-series snapshots in `analytics.db`.
- **M5 — Reporting:** on-demand report generation (JSON / CSV / PDF) with
  templated sections, export, and a report store (`reports.db`).

### Engine
- **`engine/`:** end-to-end AI pipeline orchestration (`ParkTwinPipeline`) and
  camera capture / streaming (`FrameProcessor`, `CameraStream`).

### Frontend (Module 6 — `apps/web`)
- **Next.js 15 (App Router) · React 19 · TypeScript (strict)** production frontend.
- **Dashboard** — KPI grid, recent activity, alerts, system health, quick actions.
- **Live Parking** — responsive slot-grid visualisation with occupancy summary and slot details.
- **Vehicle Management** — sortable, filterable vehicle table with detail dialog and history.
- **Analytics** — overview metrics + occupancy / traffic / peak-usage / utilisation / time-based charts (Recharts).
- **Reports** — report categories, generation, history, read-only preview, download / regenerate.
- **Settings** — intentional placeholder.
- Legacy `frontend/` (React/Vite SPA) is preserved untouched as reference only.

---

## Architecture Summary

Strict one-directional dependency flow:

```
shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend
```

- Lower modules never import higher ones.
- Cross-module consumption of M3/M4 happens **only** through each module's own
  `integration_client.py` boundary file.
- `backend/app/app.py` is the **single** place that wires every module together.
- Exactly **one owner per responsibility** (see `PROJECT_MEMORY.md` §6).
- A single canonical SQLAlchemy schema (`parktwin.db`) via one `Base`; analytics and
  reporting use their own separate SQLite stores (`analytics.db`, `reports.db`).
- Architecture-ownership invariants **G1–G5** (Module 2 is the sole owner of
  parking-slot assignment) are regression-tested.

---

## Backend Modules

| Module | Responsibility | Location |
|--------|----------------|----------|
| `backend` | App factory, routers, config, DB/session, schemas, DI | `backend/` |
| `engine` | End-to-end AI pipeline + camera capture | `engine/` |
| `vehicle_recognition` (M1) | Detection, tracking, classification, plate, OCR, fusion, snapshot, CRUD | `modules/vehicle_recognition/` |
| `parking_intelligence` (M2) | Slots, mapping, occupancy, sessions, duration, violations, events | `modules/parking_intelligence/` |
| `integration_layer` (M3) | Gateway, event bus, WebSocket, sync, DTO adapters | `modules/integration_layer/` |
| `analytics` (M4) | Occupancy / traffic / utilisation / trend metrics | `modules/analytics/` |
| `reporting` (M5) | Generation, templating, export, report store | `modules/reporting/` |
| `shared` | Logging, validators (constants / events / exceptions reserved) | `shared/` |

---

## Frontend Modules

`apps/web/` (Next.js 15 App Router) — Phase A (Foundation) through Phase H (Production
Polish) complete:

- **Layout:** `AppShell`, `Sidebar` (collapsible rail + mobile drawer), `TopNav`
  (breadcrumbs + user menu), `Footer`, `NavLinks`, theme provider, TanStack Query provider.
- **Dashboard (`components/dashboard/`):** `KpiCardGrid`, `RecentActivityPanel`,
  `AlertsPanel`, `SystemHealthPanel`, `QuickActionsPanel`.
- **Live Parking (`components/parking/`):** `ParkingSlot`, `ParkingLayout`, `ParkingLegend`,
  `ParkingSummary`, `SlotDetailsDialog`, `LiveParkingView`.
- **Vehicles (`components/vehicles/`):** `VehicleTable`, `VehicleRow`, `VehicleSearch`,
  `VehicleFilters`, `VehicleStatusBadge`, `VehicleDetailDialog`, `VehicleHistory`, `VehiclesView`.
- **Analytics (`components/analytics/`):** `MetricCard`, `AnalyticsChart`, `OccupancyTrend`,
  `TrafficTrend`, `PeakUsage`, `UtilizationChart`, `TimeRangeSelector`, `OverviewMetrics`,
  `TimeBasedAnalysis`, `AnalyticsView`.
- **Reports (`components/reports/`):** `ReportCard`, `ReportGenerator`, `ReportFilters`,
  `ReportTable`, `ReportActionMenu`, `ReportStatusBadge`, `ReportHistory`, `ReportPreview`,
  `ReportsView`.
- **Shared UI kit (`components/ui/`):** button, card, badge, input, select, dialog,
  skeleton, loading-spinner, empty-state, error-state.
- **Data layer:** typed `services/*` (api-client, dashboard, parking, vehicles, analytics,
  reports) + TanStack Query `hooks/*` + presentation-only `types/*` + `lib/format.ts`.

---

## Documentation Completed

- **README.md** — full professional GitHub README (overview, features, architecture,
  tech stack, structure, install, Docker, env vars, running locally/Docker, testing,
  API/frontend/backend overviews, analytics, reporting, future + Digital Twin roadmap).
- **Developer guide (`docs/developer-guide/`):** architecture, module responsibilities,
  coding conventions, dependency rules, adding a backend module / frontend page,
  DTO conventions, testing workflow.
- **Deployment (`docs/deployment/`):** production, docker-compose, reverse proxy, HTTPS,
  environment-variables, health-checks, logging, troubleshooting.
- **API (`docs/api/`):** every router (meta/health, cameras, vehicles, parking,
  integration, analytics, reporting, websocket).
- **Diagrams (`docs/diagrams/overview.md`):** 7 Mermaid diagrams.
- **Community:** `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `SUPPORT.md`, issue/PR templates under `.github/`.
- **Repository assets (`github/`):** changelog, roadmap, status, maintainers, release,
  community, branding, GitHub docs, template previews.
- **`PROJECT_MEMORY.md`** — authoritative architecture source of truth.
- **`DUPLICATE_REGISTRY.md`** — tracked cross-module duplication (D1–D13).

---

## Final Audit Completed

- **Final System Audit (2026-07-20):** repository / frontend / security / documentation /
  performance / testing audit + genuine-defect fixes only.
  - Added missing `torchvision` runtime dep to `pyproject.toml`.
  - Fixed README default-DB name (`parktogether.db` → `parktwin.db`).
  - Expanded `DUPLICATE_REGISTRY.md` to record D1–D13.
  - Bumped `Pillow` 10.3.0 → 10.4.0 (CVE-2024-41117…41122).
  - Fixed 4 genuine frontend a11y/logic defects (Dialog & Sidebar focus-restore refs;
    `KpiCardGrid` error OR; `useLiveParking` loading/error coverage).
- Backend suite: **201 passed, 0 failed**. `compileall` clean.
- Frontend: `tsc --noEmit` ✓ · `next lint` ✓ · `next build` ✓.

---

## Known Limitations

- **No authentication / authorization** anywhere — every REST router and the
  `/integration/ws` WebSocket accept any client. Anyone can read live ANPR/PII data,
  subscribe to feeds, and push frames for full CV+OCR. *(Documented in `SECURITY.md`;
  out of RC1 scope.)*
- **Verbose internal errors** — several routers return `detail=f"...: {str(e)}"`,
  leaking DB/file/decoder internals to clients.
- **Weak default `secret_key`** (`"CHANGE_ME_IN_PRODUCTION"`) — low impact because
  `SECRET_KEY` is never used for signing/JWT/sessions; a `critical` log warns only in
  production.
- **Cross-module duplication (D1–D13)** is intentionally retained and tracked in
  `DUPLICATE_REGISTRY.md`; consolidation is planned (not in RC1).
- **`torch>=2.1.0` is unpinned** — recommend a tested upper bound.
- **Settings view** in `apps/web` is an intentional placeholder.
- **Model weights** (`*.pt`) are runtime/gitignored artifacts, auto-downloaded on first run.

---

## Security Note

The platform is **production-ready for an internal / trusted-network deployment**. The
single blocker for any **public/external** exposure is the absence of authentication.
Before exposing the API or WebSocket beyond a trusted network:

1. Add API-key / JWT auth to all REST routers and a token + origin check on
   `/integration/ws`.
2. Normalise 5xx responses — return a generic `detail` and log the raw exception
   server-side only.
3. Pin `torch` (and the ML stack) to tested versions.

No live `.env` or secrets are committed; only `.env.example` / `.env.docker` templates.
CORS drops `*` and never combines `allow_credentials=True` with a wildcard origin.

---

## Future Roadmap

- **Authentication & authorization** + normalised 5xx before public exposure.
- **PostgreSQL by default** in production; optional **Redis** event bus for multi-process.
- **Resolved duplicate consolidation** following the `DUPLICATE_REGISTRY.md` canonical choices.
- **Expanded dashboards** — Settings view + additional operational widgets.
- **Pinned, tested ML stack.**

---

## Digital Twin Roadmap

Architected to grow a **Digital Twin** capability as a sibling module (M7+):

- A virtual, stateful mirror of the physical car park driven by the same Integration DTOs
  the dashboard consumes.
- Simulation of "what-if" scenarios (inbound flow, slot reallocation, incident response)
  against the live occupancy model.
- Reuses the existing `/integration` gateway and event bus as the twin's data source — no
  new ingestion path required.
- A dedicated read-only dashboard surface projection (presentation-only, like the current
  `apps/web` views).

> The Digital Twin is **not yet implemented**. It is noted as the intended next
> architectural sibling so future work follows the same one-owner, one-directional
> dependency rules.

---

## Upgrade / Install

See the root [`README.md`](../../README.md) for installation, Docker, and running locally.
Version references are aligned across `pyproject.toml`, `configs/settings.yaml`,
`frontend/package.json`, and `apps/web/package.json` (all `1.0.0`).

## Checksums / Assets

- Release artifacts (tag + GitHub Release notes) are attached at publish time.
- No binary source artifacts are committed to the repository.
