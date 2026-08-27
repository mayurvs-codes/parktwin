# Dependency Rules

The platform's long-term health depends on a strict, one-directional dependency
graph. Violations are caught by the architecture-ownership regression suite.

## Allowed direction

```
shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend
```

- `shared` depends on nothing internal.
- A module may import only from **lower** layers (above) + `shared`.
- The frontend depends on nothing internal — HTTP/WebSocket only.

## Cross-module consumption boundaries

Cross-module consumption of M3/M4 happens **only** through a module's own
`integration_client.py` boundary file. Do not import another module's
`services/registry.py` (or any internal module symbol) directly elsewhere.

- `modules/analytics/integration_client.py` — M4's sanctioned boundary to M3.
- `modules/reporting/integration_client.py` — M5's sanctioned boundary to M3+M4.

These files intentionally duplicate a small re-export idiom; that duplication is
**by design** and documents the dependency boundary. Do not add a third variant.

## What each layer may not do

- M2 must **not** import M1 code. It consumes M1's output shape (e.g.
  `VehicleRecord`) duck-typed, not via a direct import.
- M4/M5 must **not** import M1.
- `shared/` must **never** import from `backend`, `engine`, or `modules`.
- Only `backend/app/app.py` and `backend/api/dependencies.py` may wire across all
  layers.

## Circular-dependency prevention

1. Search the repo before creating any file (grep for the class/function/endpoint
   name) and check `PROJECT_MEMORY.md` §4 / §6 first.
2. Reuse existing services — call the canonical owner, don't re-implement.
3. Extend existing code instead of duplicating it (add a parameter/method).
4. Never create a second implementation of an existing responsibility without a
   Change Log entry justifying it and a deprecation plan.

## Ownership invariants (enforced by tests)

The D5 ownership hardening established these guarantees (regression suite:
`tests/unit/test_architecture_ownership.py`):

- **G1** — Module 2 is the **sole** owner of parking-slot assignment.
- **G2** — No production path derives slot ownership from Module 1.
- **G3** — `IntegrationService.handle_frame` returns vehicles composed from the
  Module 2 assignment; the M1 record `slot` is never surfaced as ownership.
- **G4** — Snapshot annotations consult Module 2 before any Module 1 fallback.
- **G5** — Dependency directions hold: M1↔M2 decoupled; M4/M5 consume only via
  the Integration Layer.

See [`PROJECT_MEMORY.md` §5](../../PROJECT_MEMORY.md#5-duplicate-detection) for the
full duplicate registry (D1–D13) and consolidation plan.
