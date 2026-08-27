# Developer Guide

This guide explains how ParkTwin AI is organised and how to extend it safely.
It is the companion to the authoritative [`PROJECT_MEMORY.md`](../../PROJECT_MEMORY.md)
and the [architecture overview](../../docs/architecture/architecture.md).

> **Read [`PROJECT_MEMORY.md`](../../PROJECT_MEMORY.md) before creating any new
> file, module, service, model, or API.** It governs ownership and prevents
> duplicate implementations.

## Sections

- [Architecture](architecture.md) — layers, dependency direction, single wiring point.
- [Module responsibilities](module-responsibilities.md) — what each module owns.
- [Coding conventions](coding-conventions.md) — naming, structure, logging, validation.
- [Dependency rules](dependency-rules.md) — the allowed import graph and how to consume cross-module data.
- [Adding a backend module](adding-backend-module.md) — step-by-step for a new `modules/*` package.
- [Adding a frontend page](adding-frontend-page.md) — step-by-step for `apps/web`.
- [DTO conventions](dto-conventions.md) — Pydantic vs dataclass, response vs gateway DTOs.
- [Testing workflow](testing-workflow.md) — pytest, frontend gates, ownership regression.

## Quick orientation

- **Single wiring point:** `backend/app/app.py` mounts every router. Only there
  (and `backend/api/dependencies.py`) may code cross all layers.
- **One owner per responsibility:** see the
  [ownership table](../../PROJECT_MEMORY.md#6-canonical-ownership).
- **One database schema:** operational data lives in `parktwin.db` via the
  canonical `Base` in `backend/database/models.py`.
- **External surface:** new external endpoints go through the `/integration`
  gateway, never a parallel clone.
