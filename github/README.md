# `github/` — Repository Management & Open-Source Assets

This folder consolidates **GitHub-facing, non-operational repository assets** for
ParkTwin AI. It is the home for project-management documents, release artifacts,
branding assets, GitHub-specific documentation, and open-source governance material.

> **Operational GitHub configuration stays under [`.github/`](../.github/) at the
> repository root.** This folder intentionally does **not** contain workflows,
> issue/PR templates, or any file that GitHub requires at the root. Those live in
> `.github/` and are managed there so GitHub functionality is preserved.

## What lives here

| Path | Purpose |
|------|---------|
| `README.md` | This file — explains the `github/` folder. |
| `CHANGELOG.md` | Human-readable history of notable changes per release. |
| `ROADMAP.md` | Planned direction and upcoming milestones. |
| `PROJECT_STATUS.md` | Current implementation status of each module. |
| `OPEN_SOURCE_CHECKLIST.md` | Readiness checklist for publishing the repo openly. |
| `MAINTAINERS.md` | Current maintainers and how to join. |
| `release/` | Release notes + the release process & checklist. |
| `community/` | Community guide, contributor list, and governance. |
| `branding/` | Screenshots, logo, banners, and social-preview assets. |
| `docs/` | GitHub-specific docs (Actions, repository settings, Pages, releases). |
| `templates/` | Read-only previews of the live `.github/` issue/PR templates. |

## Why a separate `github/` folder?

GitHub only requires a small, fixed set of files at the repository root
(`README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
`SUPPORT.md`, and the `.github/` directory). Everything else related to running an
open-source project — release notes, roadmaps, branding, governance — is
**project-management material**, not part of the shipped software. Keeping it here:

- gives contributors a single, discoverable place for repo-management topics,
- keeps the repository root focused on what GitHub and end users expect at root,
- and leaves `.github/` untouched so CI, issue templates, and PR templates keep
  working exactly as GitHub expects.

## Relationship to `.github/`

| Concern | Location |
|---------|----------|
| CI workflows | `.github/workflows/` |
| Issue templates | `.github/ISSUE_TEMPLATE/` |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` |
| **Everything else (this folder)** | `github/` |

When you change a live template in `.github/`, mirror the change in the matching
preview under `github/templates/` so this folder stays a faithful reference.
