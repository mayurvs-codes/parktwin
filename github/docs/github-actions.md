# GitHub Actions

This document describes the proposed CI layout for ParkTwin AI. **Operational
workflow files live in `.github/workflows/`** (kept at the repository root so GitHub
runs them). This file is reference documentation only.

## Recommended workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `python-tests.yml` | push / PR to `main` | Run `pytest -q` (incl. architecture-ownership regression). |
| `frontend.yml` | push / PR touching `apps/web` | `npm run typecheck && npm run lint && npm run build`. |
| `release.yml` | push of a `v*` tag | Draft a GitHub Release from the tag. |

## Notes
- Secrets (e.g. `PYPI_TOKEN`, cloud credentials) are stored in repo **Settings →
  Secrets and variables → Actions**, never committed.
- Required status checks should be enforced via branch protection
  (see [`repository-settings.md`](repository-settings.md)).
- The workflow YAML itself is **not** in this folder — it belongs in `.github/`.

## Why this folder is not `.github/`
`.github/` is reserved for files GitHub interprets at the root (workflows, issue/PR
templates). General how-to/reference docs for maintainers live here in `github/docs/`
to keep the root clean.
