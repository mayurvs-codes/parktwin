# Coding Conventions

These are derived from the existing code and are **binding** for new code. They
are mirrored in [`PROJECT_MEMORY.md` §11](../../PROJECT_MEMORY.md#11-naming-standards)
and the Mandatory Rules (§12).

## Naming

| Kind | Convention | Examples |
|------|-----------|----------|
| Folder / package | lowercase `snake_case`, singular capability noun | `vehicle_recognition/`, `plate_detection/`, `integration_layer/` |
| Python module file | `snake_case.py` | `vehicle_detector.py`, `occupancy_manager.py` |
| Class | `PascalCase` | `VehicleDetector`, `ParkingIntelligenceEngine` |
| Service class | `<Domain>Service` | `AnalyticsService`, `ReportingService`, `IntegrationService` |
| Manager class | `<Domain>Manager` / `ConnectionManager` | `TrackManager`, `ModelManager` |
| Engine class | `<Domain>Engine` | `EventEngine`, `ViolationEngine`, `ParkTwinPipeline` |
| Registry accessor fns | `make_/get_/reset_<name>_service` | `get_analytics_service()` |
| CRUD functions | verb-first `snake_case` | `create_vehicle`, `upsert_slot`, `list_events` |
| ORM model → table | `PascalCase` → `snake_case` plural `__tablename__` | `ParkingSession` → `parking_sessions` |
| Enum | `PascalCase` class, `UPPER_SNAKE` members | `SlotState.OCCUPIED`, `CameraStatus.ONLINE` |
| API router prefix | lowercase plural/noun with leading slash | `/vehicles`, `/parking`, `/analytics`, `/integration`, `/reports` |
| REST path | lowercase, resource-oriented, `{id}` params | `/parking/slots/{slot_id}` |
| Request DTO | `<Action>Request` / `<Entity>Create`/`Update` | `RecognizeRequest`, `SlotCreate`, `GenerateRequest` |
| Response DTO | `<Entity>Response` (M1/M2) · `Gateway<Entity>` (M3) · `<Entity>Summary/Detail` (M5) | `VehicleResponse`, `GatewaySlot`, `ReportSummary` |
| Pydantic vs dataclass | API boundary = Pydantic; internal value objects = dataclass | `schemas/*`, `reporting/models.py` |
| Frontend files | Components `PascalCase.tsx`, hooks `useX.ts`, services `camelCase.ts` | `DashboardPage.tsx`, `useWebSocket.ts`, `apiClient.ts` |
| Config env overrides | `UPPER_SNAKE` | `DATABASE_URL`, `REDIS_URL`, `INTEGRATION_EVENT_BUS`, `ANALYTICS_DB_PATH` |

## Structure

- One package per capability under `modules/` (M1–M5).
- Business logic stays inside the owning module; routers are thin transport.
- Routers return Pydantic response models; internal value objects are dataclasses.
- The canonical config (`get_settings()`) is the only source of settings.
- The canonical logger (`shared/logging/logger.py::get_logger`) is the only logger.

## Logging

Use `from shared.logging import get_logger` and `get_logger(__name__)`. Do **not**
use bare `print()` in backend code.

## Validation

Put validation helpers in `shared/helpers/validators.py` — reuse, don't duplicate.

## No stale markers

No `TODO` / `FIXME` / `XXX` / `HACK` / `BUG:` / `TEMP:` markers in source. If a
task is incomplete, record it in
[`PROJECT_MEMORY.md` §13](../../PROJECT_MEMORY.md#13-change-log), not in a comment.

## Frontend conventions (`apps/web`)

- TypeScript `strict` + `noUncheckedIndexedAccess`.
- Components are `PascalCase.tsx`; hooks `useX.ts`; services `camelCase.ts`.
- All data access goes through `services/*` (typed Axios wrappers) + `hooks/*`
  (TanStack Query). Never call `fetch` directly from a component.
- Presentation-only formatters live in `lib/format.ts`; no domain math.
- Reuse DTOs from `types/*` (projections of backend responses) — don't re-declare
  business fields.
