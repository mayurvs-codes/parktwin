# DUPLICATE_REGISTRY.md — Duplicate Consolidation Decisions

Companion to `PROJECT_MEMORY.md` §5 (Duplicate Detection).

For every duplicate identified in §5, this file records the consolidation
decision:

- **A) Safe to consolidate now**
- **B) Should remain duplicated** (Accepted Duplication)
- **C) Needs a larger architectural refactor later**

## Decision rule

A duplicate is consolidated ONLY when it satisfies **ALL** of:

1. identical behavior
2. identical lifecycle
3. identical dependencies
4. no module-specific logic
5. no architectural boundary changes

If **any** condition fails, the duplicate is recorded as **Accepted (B)** and
is **NOT** refactored. The reason is always: *module-local ownership is
intentional*.

> No new shared infrastructure is introduced. No `shared/registry.py` is
> created. No new dependencies between modules are added. Existing module
> boundaries (PROJECT_MEMORY.md §6) and the dependency direction (§10) are
> preserved exactly.

---

## D1 — Service "registry" singleton pattern

- **Status:** Accepted
- **Decision:** B) Should remain duplicated
- **Reason:** Module-local ownership is intentional.

### What looks duplicated

The singleton-lifecycle *skeleton* (`_X = None` global + lazy
`if _X is None: _X = make_*()` + `reset_*` replacer) appears in four places:

1. `modules/integration_layer/services/registry.py`
2. `modules/analytics/services/registry.py`
3. `modules/reporting/services/registry.py`
4. `modules/integration_layer/events/factory.py`

### Why it is NOT true shared infrastructure

| Copy | Module-specific logic | Module-specific dependencies |
|------|----------------------|------------------------------|
| `integration_layer/services/registry.py` | `make_integration_service` wires `event_bus` + `ws_manager` + `synchronizer`; **additionally** defines `get_integration_service_dep` (FastAPI dependency, unique to this module) | `events.factory.get_event_bus`, `websocket.manager`, `sync.Synchronizer` |
| `analytics/services/registry.py` | `make_analytics_service(integration_svc=None, store=None)` lazy-imports `get_integration_service` and builds `AnalyticsService` | `storage.AnalyticsStore`, `AnalyticsService`, `integration_client` |
| `reporting/services/registry.py` | `make_reporting_service(analytics=None, integration=None, store=None, output_dir=None)` lazy-imports analytics+integration and builds `ReportingService` | `storage.ReportStore`, `ReportingService`, `integration_client` |
| `events/factory.py` | `get_event_bus()` performs env-driven backend selection (`INTEGRATION_EVENT_BUS`, `REDIS_URL`); no `make_*` factory at all | `bus.EventBus`, `memory_bus.InMemoryEventBus`, `redis_bus.RedisEventBus` |

### Condition check (must be ALL true to consolidate)

| Condition | Result | Note |
|-----------|--------|------|
| identical behavior | **FAIL** | each builds a different object; factory adds env selection |
| identical lifecycle | **FAIL** | factory has no `make_*`; service `make_*` take optional args |
| identical dependencies | **FAIL** | each registry imports a different module/service |
| no module-specific logic | **FAIL** | wiring + lazy imports + a FastAPI dependency |
| no architectural boundary changes | **FAIL** | a shared helper would either live in `shared` (breaking "shared depends on nothing", §10) or pull module factories into `shared` |

### Conclusion

The duplication is the *pattern*, not a shared capability. Each module
legitimately owns its own service/bus lifecycle — these accessors are the
documented module entry points (PROJECT_MEMORY.md §6), and the dependency
direction (§10) requires each module to own its registry. Introducing
`shared/registry.py` would create new shared infrastructure and a cross-module
dependency, which is explicitly disallowed.

### Action

**No code changes.** Leave the four registries exactly as they are. Public
APIs, import paths, and function signatures are unchanged.

---

## D10 — Two `ParkingIntelligenceEngine` singletons

- **Status:** Resolved — consolidated
- **Decision:** A) Safe to consolidate now
- **Canonical owner:** the engine held by `IntegrationService` (`modules/integration_layer/services/integration_service.py::IntegrationService.engine`).
- **Removed:** the module-level `_parking_engine` singleton in `backend/api/routers/parking.py`.

### What was duplicated

1. `_parking_engine = ParkingIntelligenceEngine()` — module-level singleton in `backend/api/routers/parking.py`, created/bootstrapped by the router's own `get_parking_engine` dependency.
2. `IntegrationService.engine` — created in `IntegrationService.__init__` (`parking_engine or ParkingIntelligenceEngine()`), bootstrapped by `IntegrationService.ensure_initialized(db)`.

Both call `init(db)` / `ingest_frame` against the same `parktwin.db` tables. With two instances, their in-memory `EventEngine` buffers, slot-mapper state, and occupancy state diverge (the exact defect D10 recorded).

### Condition check (ALL must be true to consolidate)

| Condition | Result | Note |
|-----------|--------|------|
| identical behavior | **PASS** | both are `ParkingIntelligenceEngine`; same `init`/`ingest_frame`/`occupancy_summary`/`statistics`/`_events` API |
| identical lifecycle | **PASS** | bootstrap is `init(db)` in both; `IntegrationService.ensure_initialized` wraps the same `init(db)` idempotently |
| identical dependencies | **PASS** | both depend only on `backend.core.config`, `backend.database` (`Base`), `shared`, and M1 output shape — no router-local or module-specific logic in the engine itself |
| no module-specific logic | **PASS** | the router never specialized the engine; it only held a second instance of the identical class |
| no architectural boundary changes | **PASS** | `parking.py` still depends on M2 **only** through a dependency (DI) — it now resolves that dependency from `IntegrationService` rather than instantiating its own; no new shared infrastructure, no new import edges that break §10 direction |

### Migration

1. **Compatibility layer:** `get_parking_engine` (same signature `async def get_parking_engine(db) -> ParkingIntelligenceEngine`) now returns `get_integration_service().engine`, calling `await integration.ensure_initialized(db)` once. Every parking route already depends on `get_parking_engine`, so no route signature, body, request, or response schema changed.
2. **Switch callers:** all 11 parking routes were already wired to `get_parking_engine`; once it delegates to the canonical owner they transparently use `IntegrationService.engine`.
3. **Remove duplicate:** the `_parking_engine = ParkingIntelligenceEngine()` global was deleted.
4. **Tests:** `tests/integration/test_parking_api.py` no longer monkeypatches the removed global; it injects the test engine into the canonical owner (`get_integration_service().engine = eng`) — preserving isolation per test.
5. **Validation:** full suite green — 65 integration + 118 unit tests pass.

### Action

No new shared infrastructure introduced; module boundaries (§6) and dependency direction (§10) preserved. `IntegrationService.engine` is now the single owner of Module 2 runtime state.

---

<!-- Add new entries above this line. Template:
## D<n> — <title>
- **Status:** Accepted
- **Decision:** B) Should remain duplicated
- **Reason:** Module-local ownership is intentional.
-->

---

## D2 — `integration_client.py` re-export pattern

- **Status:** Accepted
- **Decision:** B) Should remain duplicated
- **Reason:** These are intentional, sanctioned dependency boundaries, not accidental copies.
- **Canonical:** both `analytics/integration_client.py` and `reporting/integration_client.py` are kept. The boilerplate (a one-file re-export of the downstream registry) is duplicated, but the pattern is good and must not be "fixed" by importing another module's `services/registry.py` directly.
- **Action:** No code changes. Any new module consuming M3/M4 must copy this exact one-file boundary.

---

## D3 — Hand-rolled aiosqlite store

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** a shared `AsyncSqliteStore` base for connection lifecycle.
- **Note:** `analytics/storage/store.py` (`AnalyticsStore`→`analytics.db`) and `reporting/storage/report_store.py` (`ReportStore`→`reports.db`) duplicate `__init__/init/close/count/clear/_default_db_path`. These are **separate SQLite databases** from the canonical `parktwin.db`. Remove the duplicated connection-management bodies eventually; longer term consider folding these tables into the canonical SQLAlchemy DB.
- **Action:** No code changes yet.

---

## D4 — Occupancy computation

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** `parking_intelligence/occupancy/occupancy_manager.py` (`compute_state/compute_states`) is the single source of occupancy state.
- **Note:** `analytics/occupancy/occupancy_analytics.py::compute_occupancy` re-derives rate/free/reserved from Integration DTOs, and `reporting/generators/occupancy.py` computes `occupied/total*100` a third time. M4 should surface M2's value, not recompute; M5 must consume M4's value.
- **Action:** No code changes yet.

---

## D5 — Slot assignment / slot-id generation

- **Status:** **RESOLVED & HARDENED** (2026-07-18, D5 Phases 4–8 complete)
- **Decision:** A) Safe to consolidate (resolution)
- **Canonical:** `parking_intelligence` (M2) — `slot_detection/slot_detector.nearest_free_slot`, `mapping/slot_mapper.SlotMapper`, `storage/config_loader.load_slot_definitions`.
- **Note:** All `TrackManager` (M1) slot ownership (`_init_slots`/`_assign_slot`/`_occupied_slots`/…) was removed. `IntegrationService.handle_frame` and `record_to_live` now source `slot`/`occupied` **exclusively** from the Module 2 `SlotAssignment`. A runtime invariant assertion and a regression suite (`tests/unit/test_architecture_ownership.py`, 11 tests) enforce the ownership invariant (G1–G5).
- **Action:** No new shared infra; public API/DB/WS/Analytics/Reporting unchanged.

---

## D6 — Duration formatting (`HH:MM:SS`)

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** `parking_intelligence/duration/duration_tracker.format_duration`.
- **Note:** Copies in `analytics/utilization/utilization_analytics.format_duration`, `reporting/utils.fmt_duration`, and the removed `track_manager.get_duration_str`. Route the other copies through the shared helper eventually.
- **Action:** No code changes yet.

---

## D7 — `iso_now` / time helpers

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** `analytics/metrics/base.iso_now` (or promote to `shared/`).
- **Note:** `reporting/utils.iso_now` is a second copy. Remove the reporting copy eventually.
- **Action:** No code changes yet.

---

## D8 — Event bus / event engine

- **Status:** Accepted
- **Decision:** B) Should remain duplicated
- **Reason:** Two distinct vocabularies with a sanctioned adapter between them.
- **Canonical:** `integration_layer/events/*` is the cross-module bus (`get_event_bus()`); M2's `EventEngine` remains the M2-internal lifecycle recorder. `event_adapter.py` bridges them.
- **Note:** The two ring-buffer/`recent/count/clear` bodies could eventually share one buffer impl, but the vocabularies (PascalCase `IE-` vs snake_case `PE-`) must not be unified without care.
- **Action:** No code changes.

---

## D9 — Frame-processing endpoints + helpers

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** the integration gateway `/integration/process-frame|process-video` is the intended unified entry.
- **Note:** `process-frame`/`process-video` appear in `backend/api/routers/vehicles.py` (M1), `backend/api/routers/parking.py` (M1→M2), and `integration_layer/gateway/router.py` (unified), with near-identical `_decode_b64_image` + video temp-file/`frame_skip` loops. `ProcessFrameRequest` is defined 3×. Reduce the M1/M2 copies to thin delegators eventually; consolidate `ProcessFrameRequest` and `_decode_b64_image`.
- **Action:** No code changes yet.

---

## D11 — Overlapping read APIs (M1/M2 direct vs gateway)

- **Status:** Accepted
- **Decision:** B) Should remain duplicated
- **Reason:** The direct routers are the low-level module surface; the gateway is the preferred external surface. Both are intentional.
- **Canonical:** `/integration/*` gateway for external/frontend consumers.
- **Note:** `/parking/*` and `/vehicles` (direct) duplicate `/integration/{slots,sessions,occupancy,statistics,events,vehicles}`. Document intent; avoid adding new external consumers of the direct routers.
- **Action:** No code changes.

---

## D12 — Vehicle field model duplicated

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** `backend/schemas` (`VehicleResponse`).
- **Note:** `reporting` re-describes vehicle rows (`license_plate, vehicle_type, color, tracking_id, plate_confidence, is_registered, last_seen`) that mirror `backend.schemas.VehicleResponse`; reporting uses dataclasses while backend uses Pydantic. Map reporting generators from the DTO eventually.
- **Action:** No code changes yet.

---

## D13 — Cell/value stringify helper

- **Status:** Tracked — consolidate later
- **Decision:** C) Needs a larger refactor later
- **Canonical:** one helper in `reporting/exporters/base.py`.
- **Note:** `reporting/exporters/csv_exporter._cell` and `reporting/exporters/pdf_exporter._txt` share the same None/bool/list-dict coercion. Remove the per-exporter copies eventually.
- **Action:** No code changes yet.
