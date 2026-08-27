# Roadmap

This roadmap tracks the public direction of ParkTwin AI. It is a planning document,
not a commitment, and is updated as priorities shift. Module ownership and the
architecture invariants in `PROJECT_MEMORY.md` always take precedence when
conflicting.

## Near term
- **Real screenshots.** Replace the placeholder images in `branding/screenshots/`
  with captures from the production `apps/web` frontend.
- **Contact details.** Fill the placeholder `*@example.com` addresses in
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `SUPPORT.md` with the project's real
  contacts.
- **Auth & access control.** Implement the security/auth recommendations tracked
  in `PROJECT_MEMORY.md` §16 (currently documented, not yet implemented).
- **Error normalization.** Return structured, non-leaky 5xx errors (tracked in §16).

## Mid term
- **Duplicate consolidation (§5 D1–D13).** Fold the documented duplicate patterns
  into their canonical owners (shared singleton registry, shared async SQLite store,
  shared duration/time helpers, unified ring-buffer event bus).
- **Dependency / model pinning.** Pin `torch` and related model dependencies
  explicitly (tracked in §16).
- **CI hardening.** Add GitHub Actions for the Python suite, frontend build/lint/
  typecheck gates, and architecture-ownership regression (see
  [`docs/github-actions.md`](docs/github-actions.md)).

## Long term — Digital Twin
- **Live digital-twin view.** Extend the parking model toward a real-time digital
  twin of the lot (current Live Parking view is the foundation).
- **Predictive analytics.** Utilization forecasting and anomaly detection on top
  of the Analytics (M4) store.
- **Multi-site scale-out.** Support multiple cameras/lots and federated occupancy.

## Out of scope
- Training / benchmarking pipelines (inference only).
- Re-implementing any responsibility that already has a canonical owner (§6).
