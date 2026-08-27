# Changelog

All notable changes to ParkTwin AI are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) conventions.

Release notes per version live in [`release/`](release/).

## [1.0.0-RC1]

Release candidate for the first consolidated release. Code-complete and verified;
published as `v1.0.0-RC1` for final review ahead of the `v1.0.0` tag.

### Added
- Release-engineering artifacts: this changelog, `release/RELEASE_NOTES_v1.0.0-RC1.md`,
  and `release/release-checklist-v1.0.0-RC1.md`.
- Version alignment: `apps/web/package.json` bumped `0.1.0` → `1.0.0` so the production
  frontend matches `pyproject.toml`, `configs/settings.yaml`, and the legacy `frontend/`.

### Verified (no code changes)
- Backend test suite: **201 passed, 0 failed** (`pytest -q`).
- Frontend gates (`apps/web`): `tsc --noEmit` ✓ · `next lint` ✓ · `next build` ✓ (11 routes).
- Repository release validation: no temporary / debug / generated artifacts outside `.gitignore`.
- Docker assets present and statically verified (`docker/backend/Dockerfile`,
  `docker/compose/docker-compose.dev.yml`, `.dockerignore`, `.env.docker`).

### Notes
- No architecture, API, or DB schema changes in this RC.
- Authentication and normalised 5xx responses remain documented recommendations
  (see `SECURITY.md`, `PROJECT_MEMORY.md` §16) and are out of scope for RC1.

## [1.0.0]

Initial public, inference-only computer-vision platform for parking intelligence.

### Added
- **Module 1 — Vehicle recognition (ANPR):** detection → tracking → classification
  → plate detection → OCR → fusion → snapshot → storage.
- **Module 2 — Parking intelligence:** slot definitions, vehicle↔slot mapping,
  occupancy state, parking sessions, duration, violations, and parking events.
- **Module 3 — Integration layer:** unified `/integration` gateway, event bus,
  WebSocket broadcast, and cross-module sync.
- **Module 4 — Analytics:** occupancy / traffic / utilization / trend metrics.
- **Module 5 — Reporting:** on-demand report generation (JSON / CSV / PDF) with
  templated sections, export, and a report store.
- **Engine:** end-to-end AI pipeline orchestration and camera capture/streaming.
- **Module 6 — `apps/web` frontend (Next.js 15):** Dashboard, Live Parking,
  Vehicle Management, Analytics, and Reports views (presentation-only).
- REST + WebSocket API, health/statistics endpoints, and a React/Vite `frontend/`
  preserved as legacy reference.
- Repository management & open-source assets consolidated under [`../github/`](../github/).

### Notes
- Single canonical database schema (`parktwin.db`) via one SQLAlchemy `Base`.
- Exactly one owner per responsibility (see `PROJECT_MEMORY.md` §6).
- All state is computed backend-side; the `apps/web` frontend is presentation-only.

## Release history

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0-RC1 | 2026-07-20 | Release candidate — code-complete, verified, pre-tag review. |
| 1.0.0 | 2026-07-20 | First consolidated release + open-source repo organization. |

---

*Add new entries to the top. For a full per-release write-up, see
[`release/RELEASE_NOTES_v1.0.0.md`](release/RELEASE_NOTES_v1.0.0.md).*
