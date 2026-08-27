# PR Template Preview

> **Read-only preview** of the live `.github/PULL_REQUEST_TEMPLATE.md`. To change the
> template, edit `.github/PULL_REQUEST_TEMPLATE.md` and mirror the change here.

<!-- Thanks for contributing to ParkTwin AI! -->

## Summary
<!-- What does this PR do, and why? -->

## Related issue
<!-- e.g. Closes #123 -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Docs only
- [ ] Architecture / module change

## Architecture impact
<!-- If this touches modules, services, models, endpoints, or ownership: -->
- [ ] I read `PROJECT_MEMORY.md` and respected the single-owner rule (§6).
- [ ] I respected the dependency direction
      `shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend`.
- [ ] I consume M3/M4 only through each module's `integration_client.py`.
- [ ] New external endpoints go through the `/integration` gateway.
- [ ] I updated `PROJECT_MEMORY.md` (inventory / ownership / Change Log) as needed.

## Testing
- [ ] `pytest -q` passes (full suite + architecture-ownership regression).
- [ ] `apps/web`: `npm run typecheck && npm run lint && npm run build` pass.
- [ ] I added/updated tests for my change.

## Notes for reviewers
<!-- Anything specific to verify, risks, follow-ups. -->
