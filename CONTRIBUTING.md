# Contributing to ParkTwin AI

Thank you for your interest in contributing! This document explains how to set up
a development environment, the branch/PR workflow, and the standards your
contribution must meet.

> **Architecture-sensitive changes:** before adding or moving any module,
> service, model, endpoint, or resolving a duplicate, read
> [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md). It is the single source of truth for
> module ownership and must be updated as part of "done".

## Development setup

### Backend

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install (editable)
pip install -e .

# 3. Configure (optional)
cp .env.example .env

# 4. Run
uvicorn backend.app.app:app --reload --port 8000
#    or: python -m backend.main
# Docs: http://localhost:8000/docs
```

### Frontend (`apps/web`)

```bash
cd apps/web
npm install
cp .env.example .env.local     # set NEXT_PUBLIC_API_BASE to your backend
npm run dev                    # http://localhost:3000
```

### Model weights

Weights auto-download on first run into `models/`. Ensure `models/` is writable
(in Docker, mount it as a volume).

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | protected; always buildable and tested |
| `feature/<short-name>` | a single feature or fix |
| `fix/<short-name>` | a bug fix |
| `docs/<short-name>` | documentation-only changes |

- Branch from `main`.
- Keep PRs focused — one logical change per PR.
- Rebase/squash onto `main` before merging when asked.

## Pull request workflow

1. Fork and create a feature branch.
2. Make your change; add/update tests.
3. Run the gates (below) and ensure they pass.
4. Update [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) if you touched architecture
   (new/moved module, service, model, endpoint, or resolved duplicate) — add a
   [Change Log](PROJECT_MEMORY.md#13-change-log) entry.
5. Open a PR with a clear description: what, why, and how to verify.
6. Link any related issue.

## Coding standards

- Follow the [naming conventions](docs/developer-guide/coding-conventions.md)
  and [dependency rules](docs/developer-guide/dependency-rules.md).
- **One owner per responsibility** — extend the canonical owner, don't duplicate.
- Respect the dependency direction
  `shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend`.
- Consume M3/M4 only through each module's `integration_client.py` boundary.
- New external endpoints go through the `/integration` gateway.
- Use the canonical logger (`shared/logging`) and validators (`shared/helpers`).
- No `TODO`/`FIXME`/stale markers in source; record incomplete work in the Change Log.
- Frontend code is **presentation-only** — no business logic on the client.

## Testing requirements

### Backend

```bash
pytest -q
```

The full suite (including the architecture-ownership regression) **must** pass.
Add unit and/or integration tests for your change. `test_parktwin.db` is
regenerated each run (expected).

### Frontend

```bash
cd apps/web
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # next lint
npm run build       # next build
```

All three gates must pass.

### Pre-PR checklist

- [ ] `pytest -q` green (full suite + ownership regression).
- [ ] `npm run typecheck && npm run lint && npm run build` green (in `apps/web`).
- [ ] New code has tests; existing tests still pass.
- [ ] No new duplicate implementation without a Change Log entry.
- [ ] `PROJECT_MEMORY.md` updated for any new/moved module, service, model, or endpoint.
- [ ] No `TODO`/`FIXME`/stale markers left in source.

## Code of conduct

By participating, you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? Please follow the
[Security policy](SECURITY.md) — do **not** open a public issue for security
disclosures.
