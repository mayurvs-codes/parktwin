# Project Status

Last reviewed: **2026-07-20** (Documentation Phase — README rewrite + developer /
deployment / API / diagram docs + community files; no code changes).

ParkTwin AI is an inference-only computer-vision platform for parking intelligence.
It ingests CCTV/video frames, recognizes vehicles and license plates (ANPR), maps
vehicles to parking slots, tracks sessions and violations, and exposes analytics and
reports through a REST/WebSocket API consumed by a React dashboard.

## Module status

| # | Module | Status |
|---|--------|--------|
| 1 | `vehicle_recognition` (ANPR) | Implemented (detection → tracking → classification → plate → OCR → fusion → snapshot → storage) |
| 2 | `parking_intelligence` | Implemented (slots, mapping, sessions, duration, violations, events) |
| 3 | `integration_layer` | Implemented (event bus, adapters, gateway API, websocket, sync) |
| 4 | `analytics` | Implemented (occupancy / traffic / utilization / trends over Integration DTOs) |
| 5 | `reporting` | Implemented (generators, exporters, templates, report store) |
| 6 | `apps/web` (Next.js 15) | Implemented — Foundation + Shell + Dashboard + Live Parking + Vehicle Management + Analytics + Reports |
| — | `frontend` (React/Vite) | **Legacy / reference only** — preserved, not the primary frontend |

## Known health issues
- Substantial cross-module duplication has accumulated (registries, integration
  clients, storage stores, occupancy math, duration formatting, event buses, and
  frame-processing endpoints). Tracked in `PROJECT_MEMORY.md` §5 (D1–D13) and
  `DUPLICATE_REGISTRY.md`.

## Test health
- Python suite: **201 passed, 0 failed** (architecture-ownership regression included).
- Frontend (`apps/web`): `next build` ✓, `tsc --noEmit` ✓, `next lint` ✓.

## Open items
See [`ROADMAP.md`](ROADMAP.md) and `PROJECT_MEMORY.md` §17.6.
