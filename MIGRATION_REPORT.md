# ParkTwin AI — Repository Architecture Refactor Report

**Module:** Vehicle Recognition & ANPR (Module 1, inference-only, pre-trained models)
**Date:** 2026-07-16
**Source:** `C:\Users\ASUS\Desktop\parktwin` (single-module `anpr` package)
**Target:** ParkTwin AI production repository architecture (multi-module ready)

---

## 1. Objective

The Module-1 code was correct but organized as a single `anpr` package. This refactor
reorganizes the **repository only** — no functionality, algorithms, APIs, database behavior,
outputs, or performance were changed. The result supports future modules
(`parking_intelligence`, `analytics`, `reporting`, `integration_layer`, `dataset_manager`,
`validation`, `digital_twin`, …) as sibling packages without further restructuring.

## 2. New top-level layout

```
configs/          configuration (env-overridable YAML)
backend/          application infrastructure (api, app, core/config, database, schemas, + reserved services/pipelines/utils)
engine/           end-to-end AI pipeline orchestration
modules/          business logic, by capability (Module 1 = vehicle_recognition)
shared/           cross-cutting reusable code (logging, helpers, + reserved constants/events/exceptions)
models/           model weights + model configuration only
datasets/         datasets (gitignored contents)
tests/            unit + integration tests
docs/             architecture / api / diagrams
scripts/          utility scripts (run_demo, download_models, evaluate)
```

### Mapping of former `anpr.*` packages

| Former (`src/anpr/...`) | New location | Reason |
|---|---|---|
| `api/app.py` | `backend/app/app.py` | app assembly |
| `api/dependencies.py`, `api/routers/*` | `backend/api/` | HTTP/API layer |
| `config/loader.py` | `backend/core/config/loader.py` | config is app infrastructure |
| `storage/session.py`, `storage/models.py` | `backend/database/` | DB infrastructure |
| `storage/schemas.py` | `backend/schemas/__init__.py` | API schemas |
| `storage/crud.py` | `modules/vehicle_recognition/storage/crud.py` | persistence is business logic |
| `pipeline/pipeline.py`, `pipeline/frame_processor.py` | `engine/` | AI pipeline orchestration |
| `detection/`, `tracking/`, `classification/`, `plate_detection/`, `ocr/`, `fusion/`, `snapshot/` | `modules/vehicle_recognition/<capability>/` | business capabilities |
| `shared/logger.py` | `shared/logging/logger.py` | shared utility |
| `shared/validators.py` | `shared/helpers/validators.py` | shared utility |
| `config/settings.yaml` | `configs/settings.yaml` | config location |
| `weights/` | `models/` | weights location (config paths updated) |

`backend/main.py` is the new entry point (`python -m backend.main`).
`backend/__init__.py` carries `__version__` (replacing the old `anpr.__version__` used by the app).

## 3. Rules honored

- **No behavior change.** Only folder organization + import paths changed.
- **No fabricated code.** `engine/orchestrator.py`, `engine/inference.py`, and the
  `scripts/*.py` files are intentionally *not* created (they would be new features);
  their directories exist as documented placeholders so the architecture is complete.
- **Config preserved as a single file.** `settings.yaml` moved to `configs/` unchanged in
  structure; its loader path and `weights_*` paths (`weights/` → `models/`) were updated so
  resolution still works. No values were altered.
- **Empty legacy folders deleted.** `src/`, `config/`, and the empty `weights/` were removed
  after migration.

## 4. Verification

- All `anpr.*` imports rewritten to `backend.*` / `engine.*` / `modules.vehicle_recognition.*` /
  `shared.*` (25 files + tests).
- `python -m py_compile` passes on all sources.
- `pytest -q` passes (config, validators, plate formatter/OCR fusion, SQLite database, API structure).
- No `anpr.` import references remain in the codebase (one cosmetic config comment updated).

See `docs/architecture/architecture.md` for the full dependency rules and module breakdown.
