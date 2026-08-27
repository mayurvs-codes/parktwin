# Community Guide

Welcome to the ParkTwin AI community! This guide explains how to get involved and
where things live.

## Where to start
- **Users / adopters:** the root [`README.md`](../../README.md) for install, Docker,
  and running locally.
- **Contributors:** [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for setup, branching,
  and PR guidance, plus `PROJECT_MEMORY.md` for the architecture invariants.
- **Architecture:** `PROJECT_MEMORY.md` is the single source of truth for module
  ownership and dependency rules.

## Communication
- **Bugs:** open an issue using the Bug report template (`.github/ISSUE_TEMPLATE/`).
- **Ideas:** open an issue using the Feature request template.
- **Security:** **do not** open a public issue — follow [`SECURITY.md`](../../SECURITY.md).
- **Help:** see [`SUPPORT.md`](../../SUPPORT.md).
- **Discussion:** use GitHub Discussions (see
  [`templates/discussion-template.md`](../templates/discussion-template.md)).

## How we work
- **One owner per responsibility.** Before building, check `PROJECT_MEMORY.md` §6 to
  find (or assign) the canonical owner. Never duplicate an existing capability.
- **Respect dependency direction:** `shared → backend → engine → M1 → M2 → M3 →
  M4 → M5 → frontend`.
- **Update `PROJECT_MEMORY.md`** whenever you add, move, or change a module, service,
  model, endpoint, or resolve a duplicate.

## Recognition
Contributors are listed in [`CONTRIBUTORS.md`](CONTRIBUTORS.md). Maintainers are
listed in [`../MAINTAINERS.md`](../MAINTAINERS.md). Governance is described in
[`GOVERNANCE.md`](GOVERNANCE.md).

## Code of conduct
All participation is governed by [`CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md).
