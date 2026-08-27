# Release Checklist

Run this checklist for every ParkTwin AI release. Pair it with
[`release-process.md`](release-process.md).

## Pre-release
- [ ] `PROJECT_STATUS.md` reflects the current module status.
- [ ] `CHANGELOG.md` has a new entry at the top for the version.
- [ ] `RELEASE_NOTES_vX.Y.Z.md` exists in this folder and is accurate.
- [ ] Version bumped in `pyproject.toml` (and `apps/web/package.json` if the
      frontend changes).
- [ ] Python test suite is green: `pytest -q` (expect 201 passed).
- [ ] Frontend gates pass: `npm run typecheck && npm run lint && npm run build`.
- [ ] No secrets / live `.env` staged; `.gitignore` covers artifacts.
- [ ] `PROJECT_MEMORY.md` Change Log (§13) updated for any architecture changes.

## Release
- [ ] Tag created: `git tag -s vX.Y.Z -m "Release vX.Y.Z"`.
- [ ] Tag pushed: `git push origin vX.Y.Z`.
- [ ] GitHub Release created from the tag with notes from
      `RELEASE_NOTES_vX.Y.Z.md`.
- [ ] Branding (logo / social preview) attached if changed.

## Post-release
- [ ] `ROADMAP.md` updated if milestones shifted.
- [ ] Announce via `community/COMMUNITY_GUIDE.md` channel.
- [ ] Bump the dev version to the next `-dev` marker.
