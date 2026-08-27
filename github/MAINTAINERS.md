# Maintainers

This document lists the people responsible for reviewing, merging, and releasing
ParkTwin AI.

> ParkTwin AI is currently a **single-maintainer** repository. "Owner" in
> `PROJECT_MEMORY.md` §6 refers to the *canonical code location* of a responsibility,
> not a person. This file tracks the human maintainers.

## Current maintainers

| Name | Area | Contact |
|------|------|---------|
| _TBD_ | Overall / all modules | _maintainer@example.com_ |

## Becoming a maintainer
1. Have a consistent history of quality contributions (issues, PRs, reviews).
2. Understand the architecture invariants in `PROJECT_MEMORY.md` (single-owner rule,
   dependency direction, one database schema).
3. Are nominated by an existing maintainer and approved by a majority.
4. Added to this file via a PR that updates the table above.

## Maintainer responsibilities
- Triage issues and PRs using the `.github/` templates.
- Enforce the rules in `PROJECT_MEMORY.md` §12 (no duplicate owners, respect
  dependency direction, update `PROJECT_MEMORY.md` on change).
- Cut releases following [`release/release-process.md`](release/release-process.md).
- Keep this folder and the open-source checklist current.
