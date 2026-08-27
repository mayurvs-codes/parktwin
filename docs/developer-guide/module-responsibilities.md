# Module Responsibilities

One responsibility → exactly one owning location. Every other place must
**reference** the owner, never re-implement it. This is the contract that keeps
the platform from accumulating parallel implementations.

The authoritative table lives in
[`PROJECT_MEMORY.md` §6](../../PROJECT_MEMORY.md#6-canonical-ownership). The
summary below is for quick orientation.

## Backend infrastructure

| Responsibility | Canonical owner |
|----------------|-----------------|
| Configuration / settings | `backend/core/config/loader.py` (`get_settings()`) |
| Canonical ORM `Base` + M1 tables | `backend/database/models.py` |
| DB session / engine | `backend/database/session.py` |
| M1 API schemas | `backend/schemas/__init__.py` |
| App wiring / router mounting | `backend/app/app.py` |

## Modules

### M1 — `vehicle_recognition`

Vehicle + plate detection, tracking (tracking only — no slot/occupancy logic),
classification (type/brand/colour), plate detection, OCR + enhancement, plate
normalisation / fusion, snapshots, and vehicle/camera/detection persistence.

- `modules/vehicle_recognition/detection/` — vehicle detection (YOLO)
- `modules/vehicle_recognition/tracking/` — multi-object tracking
- `modules/vehicle_recognition/classification/` — vehicle type / brand / colour
- `modules/vehicle_recognition/plate_detection/` — licence-plate detection
- `modules/vehicle_recognition/ocr/` — PaddleOCR engine + enhancer
- `modules/vehicle_recognition/fusion/` — OCR fusion / plate formatting
- `modules/vehicle_recognition/snapshot/` — snapshot generation
- `modules/vehicle_recognition/storage/` — persistence (CRUD)

Owns: vehicle detection, vehicle tracking, classification, plate detection, OCR,
plate formatting, snapshot/image utils, vehicle/camera/detection persistence.

### M2 — `parking_intelligence`

Slots, vehicle↔slot mapping, occupancy, sessions, duration, violations, and
parking lifecycle events. **Sole authoritative owner of parking-slot assignment.**

- `modules/parking_intelligence/slot_detection/` + `storage/config_loader.py` — slot definition / slot-id generation
- `modules/parking_intelligence/mapping/slot_mapper.py` — vehicle↔slot mapping
- `modules/parking_intelligence/occupancy/occupancy_manager.py` — occupancy state (single source)
- `modules/parking_intelligence/sessions/` — parking sessions
- `modules/parking_intelligence/duration/duration_tracker.py` — duration math + formatting
- `modules/parking_intelligence/violations/violation_engine.py` — violations
- `modules/parking_intelligence/events/event_engine.py` — M2 lifecycle events
- `modules/parking_intelligence/storage/` — parking persistence

### M3 — `integration_layer`

Unified gateway API, cross-module event bus, WebSocket broadcast, sync, and DTO
adapters.

- `modules/integration_layer/events/` — event bus (`get_event_bus()`)
- `modules/integration_layer/adapters/` — DTO adapters (M1/M2 → integration)
- `modules/integration_layer/websocket/manager.py` — WebSocket broadcast
- `modules/integration_layer/sync/synchronizer.py` — cross-module reconcile
- `modules/integration_layer/gateway/router.py` — unified external API gateway
- `modules/integration_layer/services/integration_service.py` — frame-ingest orchestration (M1→M2, unified)

### M4 — `analytics`

Occupancy / traffic / utilisation / trend metrics over Integration DTOs. Consumes
the Integration Layer **only** (via `modules/analytics/integration_client.py`).
Returns untyped `Dict[str, Any]` today (consolidate to typed responses when
extending).

### M5 — `reporting`

Report generation, templating, export (json/csv/pdf), and a report store. Consumes
Analytics + Integration Layer **only** (via `modules/reporting/integration_client.py`).

### `shared`

Cross-cutting utilities — `logging/logger.py` (`get_logger()`), `helpers/validators.py`.
`constants/`, `events/`, `exceptions/` are **reserved** placeholders. `shared/`
must never import from `backend`, `engine`, or `modules`.

## Frontend (`apps/web`)

Presentation-only. Consumes the backend through the `/integration` gateway.
Owns: dashboard, live parking, vehicles, analytics, and reports UI. No business
logic, no occupancy/duration/analytics math, no report generation on the client.
