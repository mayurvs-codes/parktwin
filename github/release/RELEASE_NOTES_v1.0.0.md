# Release Notes — v1.0.0

**Release date:** 2026-07-20
**Tag:** `v1.0.0`
**Type:** Initial consolidated release + open-source repository organization.

## Highlights
ParkTwin AI v1.0.0 is the first release that bundles the full inference-only parking
intelligence platform together with a consolidated, open-source-ready repository
layout.

## What's included
- **Backend modules (M1–M5)** wired into a single FastAPI application:
  - M1 Vehicle recognition (ANPR)
  - M2 Parking intelligence
  - M3 Integration layer (gateway + event bus + WebSocket)
  - M4 Analytics
  - M5 Reporting
- **Engine** — end-to-end AI pipeline and camera capture.
- **Frontend (M6, `apps/web`, Next.js 15)** — Dashboard, Live Parking, Vehicle
  Management, Analytics, and Reports views (presentation-only).
- **APIs** — REST + WebSocket under the `/integration` gateway, plus module-level
  routers; health/statistics endpoints.
- **Legacy `frontend/`** (React/Vite) preserved as reference.

## Repository changes in this release
- Consolidated GitHub-facing, non-operational assets into `github/` (changelog,
  roadmap, status, maintainers, community, release, branding, GitHub docs,
  template previews).
- Left `.github/` (workflows, issue/PR templates) **untouched** at the root so
  GitHub functionality is preserved.
- Kept required root files at root (`README.md`, `LICENSE`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`).

## Upgrade / install
See the root [`README.md`](../README.md) for install, Docker, and running locally.

## Known issues
- Documented cross-module duplication (D1–D13 in `PROJECT_MEMORY.md` §5) is
  intentionally retained; consolidation is planned (see [`ROADMAP.md`](../ROADMAP.md)).
- Security/auth recommendations (§16) are documented but not yet implemented.

## Checksums / assets
- Release artifacts are attached to the GitHub Release. No binary source artifacts
  are committed to the repository.
