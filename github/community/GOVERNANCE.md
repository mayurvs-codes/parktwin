# Governance

ParkTwin AI is an open-source project governed by a small, transparent set of rules.
This document complements the technical invariants in `PROJECT_MEMORY.md`.

## Principles
1. **Single owner per responsibility.** No parallel implementations. See
   `PROJECT_MEMORY.md` §6.
2. **Architecture is documented, not implied.** `PROJECT_MEMORY.md` is the source of
   truth; changes are recorded in its Change Log (§13).
3. **Decisions are public.** Proposals, reviews, and releases happen in the open via
   issues, PRs, and GitHub Releases.

## Roles
- **Contributor** — anyone who opens an issue or PR.
- **Maintainer** — reviews/merges and cuts releases. Listed in
  [`../MAINTAINERS.md`](../MAINTAINERS.md).

## Decision making
- **Default:** lazy consensus. A PR with at least one maintainer approval and passing
  gates is merged.
- **Architecture-affecting changes:** require updating `PROJECT_MEMORY.md` (inventory,
  ownership, and/or Change Log) and explicit maintainer review.
- **Disagreements:** escalate to a GitHub Discussion (see
  [`../templates/discussion-template.md`](../templates/discussion-template.md)).

## Adding maintainers
See [`../MAINTAINERS.md`](../MAINTAINERS.md).

## Changes to governance
Governance changes are made via PR to this file, with a summary in the PR
description and a note in the repo `CHANGELOG.md`.
