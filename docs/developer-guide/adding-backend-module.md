# Adding a Backend Module

This walkthrough adds a new capability package under `modules/` as a sibling of
M1–M5, following the same one-owner / one-directional-dependency rules.

> Before you start: confirm the responsibility does **not** already have an
> owner in [`PROJECT_MEMORY.md` §6](../../PROJECT_MEMORY.md#6-canonical-ownership).
> If it does, extend that owner instead of creating a new module.

## 1. Create the package

```
modules/<my_module>/
├─ __init__.py          # re-export the public entry points
├─ engine.py            # or service.py — the module's public API
├─ storage/             # (optional) persistence, if it owns tables
│  ├─ __init__.py
│  └─ crud.py
└─ ...                  # capability sub-packages (snake_case)
```

## 2. Depend only downward

A new module may import `backend.core.config`, `backend.database` (the canonical
`Base`), `shared`, and any **lower** module. It must **not** import a higher
module.

- If your module's data is operational, add tables to the canonical `Base`
  (`backend/database/models.py`) and persist via `parktwin.db`. Otherwise, justify
  a separate store in a Change Log entry.
- If your module consumes M3/M4, do so **only** through its own
  `integration_client.py` boundary file.

## 3. Define the public entry point

Expose a single service/engine class (e.g. `MyService`) plus a registry accessor
following the existing idiom:

```python
# modules/<my_module>/services/registry.py
from modules.<my_module>.services.my_service import MyService

_MY_SERVICE: MyService | None = None

def get_my_service() -> MyService:
    global _MY_SERVICE
    if _MY_SERVICE is None:
        _MY_SERVICE = MyService()
    return _MY_SERVICE

def reset_my_service() -> None:
    global _MY_SERVICE
    _MY_SERVICE = None
```

> If a generic `shared/registry.py` singleton helper is introduced (see D1), keep
> the `get_my_service()` name as the module entry point; only the body consolidates.

## 4. Add a router (optional, external surface)

New **external** endpoints go through the `/integration` gateway, **not** a new
top-level router. If your module genuinely needs a dedicated router:

- Prefix with a lowercase plural noun (`/my_module`).
- Keep the router a **thin transport** over your service — no business logic.
- Return Pydantic response models.
- Mount it in `backend/app/app.py` (the single wiring point) and add the
  dependency in `backend/api/dependencies.py` if it needs DB/singletons.

## 5. Wire it up

- Mount the router in `backend/app/app.py` in dependency order.
- If the module needs cross-layer singletons, add a dependency factory in
  `backend/api/dependencies.py`.

## 6. Document ownership

Add the module to:

- [`PROJECT_MEMORY.md` §2](../../PROJECT_MEMORY.md#2-module-inventory) (module inventory)
- [`PROJECT_MEMORY.md` §6](../../PROJECT_MEMORY.md#6-canonical-ownership) (ownership table)
- the [duplicate registry](../../DUPLICATE_REGISTRY.md) if it re-implements existing logic
- a [`PROJECT_MEMORY.md` §13](../../PROJECT_MEMORY.md#13-change-log) Change Log entry

## 7. Test it

- Add `tests/unit/` and/or `tests/integration/` coverage.
- Run `pytest -q` — the full suite (including the architecture-ownership
  regression) must stay green.
- If your module introduces a new cross-module boundary, extend
  `tests/unit/test_architecture_ownership.py` if it could violate G1–G5.
