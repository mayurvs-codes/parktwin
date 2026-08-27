# ParkTwin AI — D10 Duplicate Engine Consolidation Report

**Duplicate:** D10 — Two `ParkingIntelligenceEngine` singletons
**Date:** 2026-07-18
**Author:** Claude (implementation)
**Decision basis:** `PROJECT_MEMORY.md` §5-D10 + §6 (canonical owner); `DUPLICATE_REGISTRY.md` (D10, decision A)
**Scope:** Implementation only — analysis/ownership verification already complete.

---

## 1. Objective

Eliminate the second, router-local `ParkingIntelligenceEngine` instance in
`backend/api/routers/parking.py` (`_parking_engine`). Make `IntegrationService.engine`
the single canonical owner of Module 2 runtime state, as recorded in
`PROJECT_MEMORY.md` §5-D10 ("Canonical: one engine instance owned by
`IntegrationService`; `parking.py` should reuse it via DI").

## 2. Constraints honored (from the task brief)

- **Public APIs preserved** — `get_parking_engine` signature/return type unchanged.
- **Endpoint signatures preserved** — all 11 `/parking/*` routes untouched in signature.
- **Request/response schemas preserved** — `SlotResponse`, `OccupancyResponse`,
  `StatisticsResponse`, `ProcessFrameRequest`, etc. unchanged.
- **Tests preserved** — the parking integration test still runs; its engine-isolation
  intent is preserved by injecting into the canonical owner.
- **Module boundaries preserved** — `parking.py` still depends on M2 only through DI.
- **No new shared infrastructure** — no new file, no `shared/*` addition, no new cross-module dependency.
- **Canonical owner used** — `IntegrationService.engine`.
- **Duplicate removed only after compatibility verified** — see §5 validation.

## 3. Approach

The `get_parking_engine` FastAPI dependency was already the seam every parking route
depended on. It was converted into a **compatibility layer**: it now resolves the
engine from the canonical owner instead of instantiating its own.

```
BEFORE
  get_parking_engine(db) -> _parking_engine        # router-local singleton
                                       (divergent state)

AFTER
  get_parking_engine(db) -> get_integration_service().engine
                              (bootstrapped via IntegrationService.ensure_initialized(db))
                                       (single canonical state)
```

Because all routes already call `get_parking_engine`, no per-route edit was needed,
so every signature/schema stayed byte-identical.

## 4. Changed files

| # | File | Change |
|---|------|--------|
| 1 | `backend/api/routers/parking.py` | **Compatibility layer + duplicate removal.** Added `from modules.integration_layer.services.registry import get_integration_service`. Replaced the `_parking_engine = ParkingIntelligenceEngine()` global + its init logic with `get_parking_engine` delegating to `get_integration_service().engine` (bootstrapped via `ensure_initialized(db)`). Route signatures, bodies, and schemas unchanged. |
| 2 | `tests/integration/test_parking_api.py` | **Test repoint (preserve intent).** Removed `monkeypatch.setattr(parking_mod, "_parking_engine", eng)`. Added `from modules.integration_layer.services.registry import get_integration_service` and inject the per-test engine into the canonical owner: `get_integration_service().engine = eng`. Test coverage/isolation preserved. |
| 3 | `PROJECT_MEMORY.md` | Marked §5-D10 **RESOLVED (2026-07-18)**; added §13 Change Log entry. |
| 4 | `DUPLICATE_REGISTRY.md` | Added **D10** decision entry (decision A — safe to consolidate now) with condition check and migration steps. |
| 5 | `MIGRATION_REPORT_D10.md` | This report. |

**Net source change:** 1 removal (`_parking_engine` global) + 1 shim rewrite; 11 route
handlers and all schemas untouched.

## 5. Validation

- `python -m py_compile` — both edited files compile.
- `python -c "import backend.api.routers.parking"` — imports cleanly (no circular import;
  registry → `backend.api.dependencies` is a linear edge with no back-edge into routers).
- Confirmed `hasattr(parking_mod, "_parking_engine")` is now `False` and
  `get_parking_engine` still present.
- **`pytest tests/integration/test_parking_api.py`** — 9 passed.
- **`pytest tests/integration/`** — 65 passed.
- **`pytest tests/unit/`** — 118 passed.
- **Total: 183 passed, 0 failed.**

## 6. Residual notes

- `parking.py` consumes the engine only as a dependency; it does not import any
  M2 business module beyond the type referenced in the dependency's annotation
  (`ParkingIntelligenceEngine`), consistent with §10.
- `IntegrationService.engine` remains the sole owner of Module 2 in-memory state
  (event buffers, slot-mapper, occupancy), eliminating the divergence that D10 recorded.
- No other reference to `_parking_engine` exists anywhere in the codebase (grep-verified).
