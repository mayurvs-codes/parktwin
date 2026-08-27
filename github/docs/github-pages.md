# GitHub Pages

Notes on publishing ParkTwin AI documentation via GitHub Pages (optional). This is
reference documentation; no Pages config is committed to the repo.

## Should we use Pages?
The human-readable docs already live in the repository (`docs/` and `github/`) and
render on GitHub. GitHub Pages is only needed if you want a standalone hosted site.

## Options
1. **No Pages (default).** Rely on GitHub's rendered Markdown. Simplest; no build.
2. **Pages from `docs/`.** Publish the `docs/` folder (or a built site) as a static
   site. Set **Settings → Pages → Build and deployment → Source = Deploy from a
   branch**, then choose the branch + `/docs` (or `/gh-pages`).

## Cautions
- Keep the canonical docs in the repo; Pages should be a *render*, not the source.
- If generating a site, add the build output / `_site` to `.gitignore`.
- Do not publish `parktwin.db`, `.env`, or any artifact from `reports_output/`.

## Links
- Architecture: [`docs/architecture/architecture.md`](../../docs/architecture/architecture.md)
- Developer guide: [`docs/developer-guide/README.md`](../../docs/developer-guide/README.md)
- Deployment: [`docs/deployment/README.md`](../../docs/deployment/README.md)
