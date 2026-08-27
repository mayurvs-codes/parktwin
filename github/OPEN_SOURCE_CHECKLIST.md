# Open-Source Readiness Checklist

Use this checklist before (and after) publishing ParkTwin AI as a public open-source
repository. Items already satisfied by the current repo are marked ✅.

## Required root files (GitHub expects these at the repository root)
- [x] `README.md` — project overview, install, usage, contribution pointers.
- [x] `LICENSE` — MIT (present at root).
- [x] `CONTRIBUTING.md` — development setup, branch strategy, PR guidance (root).
- [x] `CODE_OF_CONDUCT.md` — community standards (root).
- [x] `SECURITY.md` — vulnerability reporting policy (root).
- [x] `SUPPORT.md` — where to get help (root).
- [x] `.github/` — issue templates + PR template at the repository root (untouched).

## Repository management (this `github/` folder)
- [x] `CHANGELOG.md` — change history.
- [x] `ROADMAP.md` — planned direction.
- [x] `PROJECT_STATUS.md` — current module status.
- [x] `MAINTAINERS.md` — maintainer list.
- [x] `community/` — community guide, contributors, governance.
- [x] `release/` — release notes, process, checklist.
- [x] `docs/` — GitHub-specific docs (Actions, settings, Pages, releases).
- [x] `templates/` — previews of live `.github/` templates.
- [x] `branding/` — screenshots, logo, banners, social preview.

## Pre-publish actions
- [ ] Replace placeholder `*@example.com` contacts in `CODE_OF_CONDUCT.md`,
      `SECURITY.md`, `SUPPORT.md` with real addresses.
- [ ] Add real captures to `branding/screenshots/` and update the README table.
- [ ] Configure repository settings per [`docs/repository-settings.md`](docs/repository-settings.md).
- [ ] Enable branch protection + required status checks.
- [ ] Add CI workflows (see [`docs/github-actions.md`](docs/github-actions.md)).
- [ ] Decide on a social preview image in `branding/social-preview/`.
- [ ] Confirm no secrets / live `.env` are committed (see `.gitignore`).

## Post-publish
- [ ] Publish the first GitHub Release (see [`release/release-process.md`](release/release-process.md)).
- [ ] Announce in `community/COMMUNITY_GUIDE.md`.
