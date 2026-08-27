# Releases

How ParkTwin AI uses GitHub Releases. Operational release tooling lives under
[`../release/`](../release/); this file is the GitHub-specific reference.

## Creating a release
1. Ensure the pre-release checklist is done
   ([`../release/release-checklist.md`](../release/release-checklist.md)).
2. Push a signed tag: `vX.Y.Z` (see
   [`../release/release-process.md`](../release/release-process.md)).
3. **Releases → Draft a new release**, choose the tag, set the title `vX.Y.Z`.
4. Paste the contents of `../release/RELEASE_NOTES_vX.Y.Z.md`.
5. Attach branding (logo / social preview) if changed.
6. Mark **Latest** and publish.

## Tagging policy
- Tags are `vMAJOR.MINOR.PATCH`, matching `pyproject.toml`.
- Published tags are immutable; undo via a new `PATCH`, not a force-push.

## Automation
- A `.github/workflows/release.yml` can draft the release on tag push (see
  [`github-actions.md`](github-actions.md)). The workflow YAML stays in `.github/`.

## History
See [`../CHANGELOG.md`](../CHANGELOG.md) and
[`../release/RELEASE_NOTES_v1.0.0.md`](../release/RELEASE_NOTES_v1.0.0.md).
