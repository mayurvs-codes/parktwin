# Issue Template Preview

> **Read-only preview** of the live templates in `.github/ISSUE_TEMPLATE/`. To change
> a template, edit the YAML in `.github/` and mirror the change here. The live
> versions GitHub renders are the `.yml` files; this is for human reference.

## Bug report (`.github/ISSUE_TEMPLATE/bug_report.yml`)

**Title prefix:** `[Bug]: ` · **Label:** `bug`

- **What happened?** *(required)* — clear description of the bug.
- **Steps to reproduce** *(required)* — e.g.
  1. Start the backend with `uvicorn backend.app.app:app`
  2. `POST /integration/process-frame` with ...
  3. See error
- **Expected behavior** *(required)*
- **Version** *(required)* — from `GET /health` or `pyproject.toml` (e.g. `1.0.0`)
- **Area** *(required)* — Backend / Frontend (apps/web) / Engine (M1) / Parking (M2) /
  Integration (M3) / Analytics (M4) / Reporting (M5) / Docs.
- **Relevant logs / output** — from `logs/parktwin.log`; redact PII.
- **Pre-submission checks**
  - [ ] I searched existing issues and docs first.
  - [ ] I ran the test/build gates and they pass (or the bug is that they fail).

> For security vulnerabilities, follow `SECURITY.md` instead of this template.

## Feature request (`.github/ISSUE_TEMPLATE/feature_request.yml`)

**Title prefix:** `[Feature]: ` · **Label:** `enhancement`

- **Problem statement** *(required)* — what problem would this solve?
- **Proposed solution** *(required)*
- **Ownership / module** — which module should own this? ParkTwin AI has exactly one
  owner per responsibility (`PROJECT_MEMORY.md` §6). Propose extending the existing
  owner rather than duplicating.
- **Alternatives considered**
- **Pre-submission checks**
  - [ ] I read `PROJECT_MEMORY.md` and confirmed there is no existing owner / duplicate.
