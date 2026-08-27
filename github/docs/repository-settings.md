# Repository Settings

Recommended GitHub repository settings for ParkTwin AI. These are configuration
choices made in the repo **Settings** UI; nothing here is committed to the repo.

## General
- **Description:** "Inference-only computer-vision platform for parking intelligence
  (ANPR, occupancy, analytics, reporting)."
- **Website:** link to the deployed dashboard or docs.
- **Topics:** `computer-vision`, `anpr`, `parking`, `fastapi`, `nextjs`, `opencv`,
  `object-detection`.
- **Social preview:** add an image from `../branding/social-preview/`.

## Features
- **Issues:** on (use the `.github/ISSUE_TEMPLATE/` templates).
- **Discussions:** on (use [`../templates/discussion-template.md`](../templates/discussion-template.md)).
- **Wiki:** off (docs live in `docs/` and `github/`).
- **Projects:** optional.

## Branches → Branch protection (`main`)
- Require a pull request before merging.
- Require status checks to pass (`python-tests`, `frontend`).
- Require conversation resolution before merge.
- Dismiss stale approvals on new commits.
- Do **not** allow force pushes / deletions on `main`.

## Security & analysis
- Dependency graph, Dependabot alerts, and secret scanning: enabled.
- `SECURITY.md` is present at root (vulnerability reporting policy).

## Templates
- Issue templates: `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.yml`.
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`.
- Previews of these live in [`../templates/`](../templates/).
