# Release Process

This document describes how ParkTwin AI is released. It is intentionally lightweight
and GitHub-centric.

## Versioning
- Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.
- Inference-only platform; breaking API or schema changes bump `MAJOR`.
- New modules/features bump `MINOR`. Fixes bump `PATCH`.

## Steps
1. **Freeze.** No feature merges to the release branch during the final QA pass.
2. **Verify gates.** Run the pre-release checklist
   ([`release-checklist.md`](release-checklist.md)).
3. **Write notes.** Add `release/RELEASE_NOTES_vX.Y.Z.md` and a `CHANGELOG.md` entry.
4. **Tag.** Create an annotated, signed tag: `vX.Y.Z`.
5. **Publish.** Create the GitHub Release from the tag; paste the notes; attach
   branding if relevant.
6. **Announce.** Post to the community channel (see
   [`community/COMMUNITY_GUIDE.md`](../community/COMMUNITY_GUIDE.md)).

## CI (recommended)
Configure GitHub Actions to build, test, and (on tag) draft the release. See
[`docs/github-actions.md`](../docs/github-actions.md) for the proposed workflow
layout. Operational workflows live in `.github/workflows/` — **not** here.

## Rollback
- Releases are immutable tags. To undo, cut a new `PATCH` that reverts, or restore
  the previous tag as `latest`. Do not force-push over a published tag.
