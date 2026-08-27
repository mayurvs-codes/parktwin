# PROJECT_FUTURE.md — ParkTwin AI
# Future Development Roadmap & Implementation Plan

> **Purpose:** This document is the forward-looking counterpart to `PROJECT_MEMORY.md`.
> It captures every identified gap, improvement opportunity, and new capability for ParkTwin AI,
> organized into clearly-defined phases with **ready-to-use Claude prompts** for each phase.
>
> **How to use:** Read the phase description and its context. Then copy the `Claude Prompt` block
> verbatim into Claude (claude.ai / Claude API). Each prompt is self-contained and references
> the architecture rules from `PROJECT_MEMORY.md`.
>
> **Architecture rules (apply to ALL phases):**
> - Read `PROJECT_MEMORY.md` before any code change.
> - Never duplicate logic; use canonical owners (§6).
> - Respect the dependency direction (§10): shared → backend → engine → M1 → M2 → M3 → M4 → M5 → frontend.
> - One database schema (`parktwin.db` via SQLAlchemy `Base`) unless explicitly justified.
> - Update `PROJECT_MEMORY.md §13 Change Log` after every architectural change.
> - **DOCKER GOVERNANCE:** Never re-build Docker images or rewrite Dockerfiles during feature development/testing. Use `.\dev.ps1 up` or `.\dev.ps1 backend` (hot-reload via `docker-compose.hotdev.yml` with source volume mounts and persistent model/DB volumes). Rebuild (`.\dev.ps1 rebuild`) ONLY if `pyproject.toml` dependencies change.
>
> **Last updated:** 2026-07-28 (Post-v1.0.0-RC1 Full Analysis & Docker Governance Update)

---

## CURRENT STATE SUMMARY

| Layer | Status | Outstanding Gaps |
|-------|--------|------------------|
| Backend (M1–M5) | ✅ Complete & tested (230/230 tests) | D12 vehicle-field model, no real user DB (env-var bootstrap) |
| Auth (`backend/auth/`) | ✅ JWT + bcrypt + API-key + rate limiting + WS token | No `/users` CRUD; hardcoded-user store only |
| Frontend (apps/web) | ✅ All 6 pages + CCTV + ANPR + Demo Mode complete | No E2E tests (Playwright) |
| Frontend Tests | ✅ 81/81 Vitest tests (unit, component, hook, page smoke) | No E2E / Playwright |
| Demo Mode | ✅ D1–D5 + Live Mode with graceful fallback | — |
| Deployment | ✅ Docker + Caddy + Prometheus + Alembic + PostgreSQL | No CI/CD pipeline (Phase 14) |
| Security | ✅ Auth complete — safe for external deployment | Hardcoded user store; no real user CRUD |
| RTSP/USB Streams | ✅ `/streams` router + CCTV stream source selector | No E2E live-feed test |
| Mobile App | ✅ Expo scaffold (4 screens) | Analytics/Reports/Settings screens missing; no mobile tests |
| Digital Twin (M7) | ❌ Not started — deferred by user | Major new module — see Phase 7 |
| CI/CD (GitHub Actions) | 🚫 **DROPPED** — Private project, not needed | — |

---

## PHASE OVERVIEW

| Phase | Name | Priority | Effort | Dependency |
|-------|------|----------|--------|------------|
| Phase 1 | Security & Authentication | 🔴 CRITICAL | High | None — must be first |
| Phase 2 | Backend Deduplication (D1–D13) | 🔴 High | High | None |
| Phase 3 | API Hardening & Type Safety | 🟡 Medium | Medium | None |
| Phase 4 | Settings Page & User Preferences | 🟡 Medium | Low | None |
| Phase 5 | Frontend Test Coverage | 🟡 Medium | Medium | None |
| Phase 6 | Real-Time WebSocket Enhancement | 🟡 Medium | Medium | Phase 1 |
| Phase 7 | Digital Twin Module (M7) | 🟢 Future | Very High | Phase 1, 2, 3 |
| Phase 8 | Analytics Date-Range & Backend Params | 🟢 Future | Medium | None |
| Phase 9 | Multi-Database Migration (SQLite → PostgreSQL) | 🟢 Future | High | Phase 1 |
| Phase 10 | Live Camera Feed & RTSP Integration | 🟢 Future | High | Phase 1 |
| Phase 11 | Demo Mode Backend Integration | 🟢 Future | Medium | Phase 1, 6 |
| Phase 12 | Observability & Production Monitoring | 🟢 Future | Medium | Phase 1 |
| Phase 13 | Mobile App & API Expansion | 🟢 Future | Very High | Phase 1, 3, 7 |
| Phase 14 | D12 Fix — Vehicle Field Model Deduplication | 🟡 Medium | Low | Phase 2 |
| Phase 15 | E2E Tests (Playwright) | 🟡 Medium | Medium | Phase 1 |
| Phase 16 | Mobile App Completion (Analytics, Reports, Settings) | 🟢 Future | High | Phase 13 |
| Phase 17 | Multi-Camera Parallel Processing | 🟢 Future | High | Phase 10 |
| Phase 18 | Real User Management (User DB & Admin CRUD) | 🟢 Future | Medium | Phase 1 |

---

## Phase 1 — Security & Authentication
### Priority: 🔴 CRITICAL — Must be completed before any external deployment

**Context:** Every REST router and the `/integration/ws` WebSocket currently accept any client without authentication. Anyone can read live ANPR/PII data (license plates, vehicle movements) and push frames to the inference pipeline. As documented in `PROJECT_MEMORY.md §16.4`, this is the single blocker for external deployment. The `SECRET_KEY` setting exists in `backend/core/config/loader.py` but is currently unused.

**What needs to be built:**
- JWT-based authentication (access + refresh tokens) for all REST endpoints.
- WebSocket authentication via a short-lived token query parameter.
- API-key authentication as an alternative for machine-to-machine consumers.
- Role-based access: `admin` vs `viewer`.
- Normalized 5xx error responses that don't leak internal errors.
- Rate limiting on inference endpoints.
- Frontend login page, token storage, auth headers on all API calls, 401 redirect.

**Files affected:**
- NEW: `backend/auth/` (token, dependencies, router, models, hardcoded_users)
- MODIFY: `backend/app/app.py` (mount auth router, error handler)
- MODIFY: `backend/api/dependencies.py` (add `get_current_user`, `require_role`)
- MODIFY: All 5 backend routers + all module routers (add `Depends(get_current_user)`)
- MODIFY: `modules/integration_layer/websocket/manager.py` (token validation)
- NEW: `apps/web/app/login/page.tsx`, `apps/web/store/auth.ts`
- MODIFY: `apps/web/services/api-client.ts` (auth headers + 401 interceptor)

---

### CLAUDE PROMPT — Phase 1: Security & Authentication

Copy this prompt to Claude:

```
You are working on ParkTwin AI, a FastAPI + Next.js 15 parking intelligence platform.
Read PROJECT_MEMORY.md before making ANY change. Architecture rules are binding.

CURRENT STATE (from PROJECT_MEMORY.md §16.4):
- Every REST router and /integration/ws WebSocket accept any client (no auth).
- SECRET_KEY exists in Settings (backend/core/config/loader.py) but is unused.
- This is the only blocker for external/public deployment.

YOUR TASK: Implement authentication end-to-end without breaking existing functionality.

BACKEND (implement in this exact order):

1. Create backend/auth/ package with these files:
   models.py: Pydantic schemas — TokenPayload, TokenResponse (access_token, refresh_token,
   token_type, expires_in), LoginRequest (username, password), UserInDB.
   
   token.py: create_access_token(subject, role, expires_delta), create_refresh_token,
   decode_token returning TokenPayload. Use python-jose (HS256).
   Signing key = get_settings().secret_key.
   
   dependencies.py: get_current_user FastAPI dependency reads Bearer from Authorization
   header OR x-api-key header for M2M. Raises 401 on invalid or expired token.
   get_viewer_or_above and get_admin_only are role-checking wrappers.
   
   router.py: POST /auth/login (username+password → TokenResponse),
   POST /auth/refresh (refresh_token → new TokenResponse),
   POST /auth/logout (server-side blocklist using in-memory set or Redis),
   GET /auth/me (current user info). Mount at /auth prefix.
   
   hardcoded_users.py: Two demo users (admin/viewer) loaded from env vars
   ADMIN_PASSWORD and VIEWER_PASSWORD with bcrypt-hashed comparison.
   This is a bootstrap credential store — production should use a real user DB.

2. Modify backend/api/dependencies.py (ONLY cross-layer wiring file):
   Add get_current_user, require_admin, require_viewer exports.
   These call into backend/auth/dependencies.py.

3. Modify backend/app/app.py:
   Mount the auth router at /auth prefix.
   Add exception handler for HTTPException 500s to return
   {"detail": "Internal server error"} instead of the raw exception string.

4. Add Depends(get_current_user) to ALL routers:
   backend/api/routers/health.py → viewer (GET routes)
   backend/api/routers/cameras.py → admin (write), viewer (GET)
   backend/api/routers/vehicles.py → viewer (GET), admin (POST process routes)
   backend/api/routers/parking.py → viewer (GET), admin (POST/PATCH)
   backend/api/routers/anpr.py → admin
   modules/integration_layer/gateway/router.py → viewer (GET), admin (POST sync/process)
   modules/analytics/api/router.py → viewer
   modules/reporting/api/router.py → viewer (GET), admin (POST generate)

5. WebSocket authentication in modules/integration_layer/websocket/manager.py:
   ConnectionManager.connect(websocket, token: str | None) validates the token
   using decode_token before accepting. Close with code 4001 if invalid.
   The /integration/ws route must read token from ?token= query param.

6. Rate limiting on inference endpoints:
   Use slowapi — limiter at 10 req/min per IP on POST /integration/process-frame
   and POST /integration/process-video. Mount the limiter in backend/app/app.py.

FRONTEND:

7. New login page apps/web/app/login/page.tsx:
   Server component rendering LoginForm (client component).
   LoginForm: username + password inputs, POST /auth/login via api-client.ts.
   On success: store access_token in localStorage using STORAGE_KEYS.authToken,
   redirect to /dashboard. On failure: show error message.

8. Modify apps/web/services/api-client.ts:
   Request interceptor: read STORAGE_KEYS.authToken from localStorage, add
   Authorization: Bearer token header to every request.
   Response interceptor: on 401, clear localStorage token, redirect to /login.

9. Modify apps/web/components/layout/AppShell.tsx:
   On mount: if no token in localStorage, router.replace('/login').
   Add Logout button to UserMenu that clears token and redirects to /login.

TESTS:

10. The 201 passing tests must STILL pass.
    Add conftest fixture creating viewer JWT and admin JWT for test use.
    Patch get_current_user in integration tests via dependency_overrides.
    Add tests/unit/test_auth.py: token creation, decode, expiry, 401 on missing token.

ARCHITECTURE RULES (binding):
- Never import backend/auth/ from any module (M1-M5). Auth is backend/ only.
- Never store the secret in any module config; always use get_settings().secret_key.
- Never add auth logic inside a module router file — only Depends() calls.
- Update PROJECT_MEMORY.md §13 Change Log with a single entry describing this phase.
- Run pytest -q after every change. Must stay at 201+ passed, 0 failed.
- Run next build + tsc --noEmit + next lint in apps/web after frontend changes.
```

---

## Phase 2 — Backend Deduplication (D1–D13 Resolution)
### Priority: 🔴 High — Reduces technical debt & prevents future violations

**Context:** `PROJECT_MEMORY.md §5` documents 13 duplication patterns. Some are resolved (D5, D10). The remainder cause maintenance risk, bugs (D3 — three separate DB connections), and confusion. This phase resolves the highest-impact patterns first.

**Priority order by risk:**
1. **D3** — Three separate SQLite databases. Consolidate into one canonical DB.
2. **D1** — Service registry singleton copied 3+ times. Introduce `shared/registry.py`.
3. **D4** — Occupancy recomputed in 3 places. Route through M2's `occupancy_manager`.
4. **D6/D7** — `format_duration` and `iso_now` in 3+ places. Complete migration to `shared/helpers/time_utils.py`.
5. **D9** — Three frame-processing endpoints. Reduce M1/M2 copies to thin delegators.
6. **D8** — Duplicate ring-buffer in EventBus and EventEngine. Share one buffer.
7. **D13** — Cell-stringify helper in 2 exporters. Move to `reporting/exporters/base.py`.

---

### CLAUDE PROMPT — Phase 2: Backend Deduplication

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §5 carefully before starting.
Also read DUPLICATE_REGISTRY.md for full context on each duplication.
Your task is to resolve duplications D1, D3, D4, D6/D7, D9, D13, D8 in that order.
Do NOT change any public API, response schema, route path, or test behavior.
All 201 tests must pass after each step. Complete steps in ORDER.

STEP 1 — D1: Shared singleton registry
Create shared/helpers/registry.py with make_singleton(factory_fn) helper returning
(make, get, reset) functions wrapping a module-level _instance variable.
Refactor integration_layer/services/registry.py, analytics/services/registry.py,
reporting/services/registry.py to use make_singleton internally.
Public names (get_integration_service, etc.) MUST be unchanged.
integration_layer/events/factory.py also uses make_singleton.
Verify: pytest -q → 201 passed.

STEP 2 — D3: Consolidate analytics.db and reports.db into parktwin.db
a) Create modules/analytics/storage/models.py: AnalyticsSnapshot ORM model
   using canonical Base from backend/database/models.py.
b) Create modules/reporting/storage/models.py: Report ORM model using same Base.
c) Add init calls in backend/app/app.py lifespan for new tables.
d) Rewrite modules/analytics/storage/store.py (AnalyticsStore) using SQLAlchemy
   async session from backend/database/session.py. Keep same public methods:
   save_snapshot, get_snapshots, count, clear.
e) Rewrite modules/reporting/storage/report_store.py (ReportStore) similarly.
f) Remove _default_db_path / aiosqlite connection lifecycle from both stores.
g) Update all callers to pass the db session.
h) Verify: pytest -q → 201 passed.
i) Update PROJECT_MEMORY.md §3 (remove analytics.db / reports.db entries) and §5-D3.

STEP 3 — D4: Occupancy recomputation
In modules/analytics/occupancy/occupancy_analytics.py: replace local compute_occupancy
with a call via analytics/integration_client.py to fetch occupancy data.
In modules/reporting/generators/occupancy.py: replace local calculation with the
value from the analytics DTO already fetched by DataFetcher.
Never modify modules/parking_intelligence/occupancy/occupancy_manager.py (canonical owner).
Verify: pytest -q → 201 passed. Update PROJECT_MEMORY.md §5-D4.

STEP 4 — D6/D7: Duration and time helpers
shared/helpers/time_utils.py already exists (created in §22.3 of PROJECT_MEMORY).
Verify it exports: iso_now() → str, format_duration(seconds: float) → str.
Audit ALL files for remaining copies of format_duration / iso_now:
  analytics/utilization/utilization_analytics.py → replace with shared import
  Any remaining copy in reporting/utils.py → replace with shared import
  track_manager.get_duration_str → replace with shared import
Verify: pytest -q → 201 passed. Update PROJECT_MEMORY.md §5-D6/D7.

STEP 5 — D9: Frame-processing endpoint consolidation
The canonical endpoint is /integration/process-frame|process-video (M3 gateway).
Reduce backend/api/routers/vehicles.py POST process endpoints to thin delegators.
Reduce backend/api/routers/parking.py POST process endpoints similarly.
Consolidate _decode_b64_image and video temp-file helpers into shared/helpers/frame_utils.py.
Verify: pytest -q → 201 passed. Update PROJECT_MEMORY.md §5-D9.

STEP 6 — D13: Cell-stringify helper
modules/reporting/exporters/base.py: add cell(value: Any) → str helper.
Remove _cell from csv_exporter.py and _txt from pdf_exporter.py — use base.cell.
Verify: pytest -q → 201 passed. Update PROJECT_MEMORY.md §5-D13.

STEP 7 — D8: Ring-buffer
Create shared/helpers/ring_buffer.py with generic RingBuffer[T](maxlen: int) class
supporting: append, __iter__, __len__, clear, count (property), recent(n) → list.
Replace duplicated implementations in:
  modules/integration_layer/events/memory_bus.py (InMemoryEventBus)
  modules/parking_intelligence/events/event_engine.py (EventEngine)
Public methods (recent_events, count, clear) STAY IDENTICAL.
Verify: pytest -q → 201 passed. Update PROJECT_MEMORY.md §5-D8.

FINAL:
Update PROJECT_MEMORY.md §5 marking each resolved D with "RESOLVED (Phase 2)".
Run full suite: pytest -q → 201+ passed, 0 failed.
Update PROJECT_MEMORY.md §13 Change Log with single Phase 2 entry.
```

---

## Phase 3 — API Hardening & Type Safety
### Priority: 🟡 Medium — Improves reliability & developer experience

**Context:** `PROJECT_MEMORY.md §7` notes analytics returns bare `Dict[str,Any]`; gateway read endpoints declare DTOs but return raw dicts. This breaks OpenAPI generation and complicates frontend type inference.

**What needs to be built:**
- Typed Pydantic response models for all analytics endpoints.
- Typed Pydantic response models for all integration gateway read endpoints.
- Consistent error response schema: `ErrorResponse(detail, code, timestamp)`.
- OpenAPI metadata enrichment (tags, summaries, descriptions).
- Frontend type alignment with new Pydantic schemas.

---

### CLAUDE PROMPT — Phase 3: API Hardening & Type Safety

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §7, §8, and §11 before starting.
Add typed Pydantic response models to all currently untyped endpoints WITHOUT changing
any existing response field name, value, or HTTP status code.
All 201 backend tests must pass. Frontend types must remain consistent.

STEP 1 — Create modules/analytics/api/schemas.py (NEW file):
Define Pydantic models matching existing dict returns from AnalyticsService:
- OccupancyAnalyticsResponse with current_occupancy, occupancy_percentage,
  average_occupancy_percentage, free_slots, reserved_slots, total_slots,
  occupancy_timeline list of OccupancyTimelinePoint
- OccupancyTimelinePoint: timestamp str, occupancy_percentage float, occupied int, free int
- TrafficAnalyticsResponse with vehicle_counts, peak_hour, peak_hour_entries,
  hourly_traffic list of HourlyTrafficPoint, daily_traffic list
- HourlyTrafficPoint: hour int, count int, entries int, exits int
- UtilizationAnalyticsResponse with slot_utilization_percentage, average_parking_duration,
  most_used_slots and least_used_slots as list of SlotUsage
- SlotUsage: slot_id str, usage_count int, utilization_percentage float
- TrendsAnalyticsResponse: occupancy_timeline, traffic_timeline, session_statistics, duration_statistics
- AnalyticsDashboardResponse combining all four above
All fields use Optional[X] = None where backend may not populate them.

STEP 2 — Update modules/analytics/api/router.py:
Change return type annotations from Dict to new Pydantic models.
Wrap dict returns in Pydantic model using model_validate (Pydantic v2).
Add response_model= and tags=["Analytics"], summary= to each route.

STEP 3 — Extend modules/integration_layer/gateway/schemas.py:
GatewayVehicle, GatewaySlot, GatewaySession, GatewayOccupancy, GatewayEvent already exist.
Add response list wrappers: VehicleListResponse, SlotListResponse, SessionListResponse,
EventListResponse, StatisticsResponse with proper types.
Update modules/integration_layer/gateway/router.py to declare response_model= on every GET route.

STEP 4 — Add shared error response schema:
In backend/schemas/__init__.py add ErrorDetail(detail: str, code: str, timestamp: str).
Add exception handler in backend/app/app.py for generic Exception → 500 returning
ErrorDetail(detail="Internal server error") never the raw str(e).
Update HTTPException detail strings to use short codes like NOT_FOUND, INVALID_REQUEST.

STEP 5 — OpenAPI metadata:
In backend/app/app.py create_app(): add title, description, version, contact, license_info.
Add tags_metadata listing all API groups.
Each router: add tags and summary to all route decorators.

STEP 6 — Frontend type alignment:
Review apps/web/types/analytics.ts against new Pydantic schemas.
Tighten any field typed as unknown or any to match the schema exactly.
Review apps/web/types/dashboard.ts similarly.
Run: cd apps/web && tsc --noEmit — must be clean.
Run: next lint — must be 0 warnings/errors.
Run: next build — must compile.

STEP 7 — Test assertions:
In tests/integration/, update at least one test per router to assert on response body
field names not just status_code == 200.
Run: pytest -q → 201+ passed, 0 failed.
Final: Update PROJECT_MEMORY.md §7 (mark all endpoints as typed), §13 (change log entry).
```

---

## Phase 4 — Settings Page & User Preferences
### Priority: 🟡 Medium — Completes the frontend (last placeholder page)

**Context:** `PROJECT_MEMORY.md §19.8` lists Settings as a known placeholder. The backend has a full Settings model. This phase builds the settings page and exposes safe read-only settings.

---

### CLAUDE PROMPT — Phase 4: Settings Page & User Preferences

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §4 (config section) and §15.
Build the Settings page — the last placeholder page in apps/web.
Backend: safe read-only settings endpoint. Frontend: two-section settings page.
All 201 backend tests must remain passing. next build + tsc --noEmit + next lint must be clean.

BACKEND:

1. Create backend/api/routers/settings.py:
   GET /settings/public (viewer role) returns PublicSettings with ONLY safe fields:
   app: {name, version, environment, debug: bool}
   api: {host, port, cors_origins list}
   models: {device, confidence_threshold, tracking algorithm names}
   parking: {max_session_duration_hours, violation_threshold_minutes, camera_ids list}
   logging: {level, format}
   NEVER include: secret_key, database_url, redis_url, any password or key.
   GET /settings/health-extended: extended health including model device and camera count.
   Mount router in backend/app/app.py at /settings prefix.

2. Add PublicSettings Pydantic schema to backend/schemas/__init__.py.

3. Add 3 tests to tests/integration/test_settings.py:
   GET /settings/public → 200, response contains app.name, NOT secret_key.
   GET /settings/public → response.parking.camera_ids is a list.
   GET /settings/public → no password or key fields in body.

FRONTEND:

4. Create apps/web/store/preferences.ts:
   usePreferences() hook backed by localStorage (key: parktwin_prefs).
   UserPreferences type: theme light/dark/system, pollingInterval 5000/10000/30000,
   defaultCameraId string or null, compactMode boolean, showNotifications boolean.
   getPreferences(), setPreferences(partial), resetPreferences() with defaults.

5. Create apps/web/services/settings.ts:
   fetchPublicSettings() calling apiGet<PublicSettingsDTO>('/settings/public').
   Types in apps/web/types/settings.ts mirroring backend schema.

6. Create apps/web/hooks/useSettings.ts:
   useSystemSettings() TanStack Query over fetchPublicSettings, 5-min staleTime.

7. Build settings page apps/web/app/settings/page.tsx rendering SettingsView:
   Section A — System Configuration (read-only, from backend):
   App Info card: name, version, environment, debug mode badge.
   AI Models card: device CPU/CUDA, confidence threshold, tracking algorithm.
   Parking Config card: session duration limit, violation threshold, camera IDs.
   Logging card: log level, format.
   Loading/error/empty states using shared ErrorState, LoadingSpinner.

   Section B — User Preferences (localStorage, no backend call):
   Theme selector Light/Dark/System wired to existing ThemeProvider useTheme().setTheme.
   Polling interval selector 5s/10s/30s.
   Default camera ID input.
   Compact mode toggle.
   Show notifications toggle.
   Reset to Defaults button calling resetPreferences().
   Save button calling setPreferences() with success banner.

8. Wire polling interval from preferences into hooks/useLiveParking.ts:
   import usePreferences from store/preferences
   Pass pollingInterval as refetchInterval to TanStack Query hooks.

ACCESSIBILITY:
   All form controls have labels and aria-describedby.
   Toggle switches use role=switch and aria-checked.
   Save/Reset buttons have type and aria-label.

Verify:
   pytest -q → 201+ passed, 0 failed.
   cd apps/web && next build → clean.
   tsc --noEmit → 0 errors.
   next lint → 0 warnings/errors.
   Update PROJECT_MEMORY.md §13 and §19.8 (mark Settings as complete).
```

---

## Phase 5 — Frontend Test Coverage
### Priority: 🟡 Medium — Quality gate for future frontend changes

**Context:** The frontend has zero test files. Any regression is undetected until manual review. This phase adds Vitest + React Testing Library coverage.

---

### CLAUDE PROMPT — Phase 5: Frontend Test Coverage

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §15 before starting.
Add a comprehensive frontend test suite to apps/web using Vitest and React Testing Library.
The existing next build + tsc --noEmit + next lint gates must remain green.
Backend tests (201/201) are untouched.

SETUP:

1. Install in apps/web:
   npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react
   @testing-library/jest-dom @testing-library/user-event msw

2. Create apps/web/vitest.config.ts:
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'
   export default defineConfig({
     plugins: [react()],
     test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'] }
   })

3. Create apps/web/tests/setup.ts:
   import '@testing-library/jest-dom'
   import { server } from './mocks/server'
   beforeAll(() => server.listen())
   afterEach(() => server.resetHandlers())
   afterAll(() => server.close())

4. Create apps/web/tests/mocks/handlers.ts with MSW request handlers for:
   GET /integration/occupancy, /statistics, /vehicles, /slots, /sessions, /health
   GET /analytics/dashboard
   GET /reports, /reports/history
   Each handler returns realistic mock data matching the DTO shapes.

5. Create apps/web/tests/mocks/server.ts using setupServer from msw/node.

6. Add scripts to apps/web/package.json:
   "test": "vitest run"
   "test:watch": "vitest"

UNIT TESTS (apps/web/tests/unit/):

format.test.ts — test every function in lib/format.ts:
   formatNumber, formatPercent, formatDuration, formatDateTime, formatClock,
   formatConfidence, isToday, elapsedSecondsFrom, edge cases for null and NaN.
   At least 25 test cases.

chart-utils.test.ts — test components/analytics/chart-utils.ts:
   formatAxisTime, formatHour, hourlyToChartData, filterTimelineByRange, peakFromTimeline.

routes.test.ts — test utils/routes.ts:
   ROUTES has all expected keys.
   getBreadcrumbs returns correct trail for /dashboard and /parking.

parking-state.test.ts — test components/demo/parkingState.ts:
   computeParkingState at time=0 returns all free.
   computeParkingState at time=duration returns all events applied.
   summarizeParkingState returns correct counts.

vehicle-state.test.ts — test components/demo/vehicleState.ts:
   computeVehicleState at time=0 returns empty state.
   summarizeVehicleState counts correctly.
   computeVehicleEventFeed grows as time advances.

COMPONENT TESTS (apps/web/tests/components/):

dialog.test.tsx — test components/ui/dialog.tsx:
   Renders children when open=true.
   Does not render when open=false.
   Calls onOpenChange(false) when Escape pressed.
   Focus is trapped inside the dialog.
   Focus returns to trigger on close.

kpi-card.test.tsx — test components/dashboard/KpiCard.tsx:
   Renders label and value.
   Applies correct tone class.

vehicle-status-badge.test.tsx — test VehicleStatusBadge:
   Renders correct text for parked, exited, unknown statuses.

HOOK TESTS (apps/web/tests/hooks/):

useDashboard.test.tsx — wrap in QueryClientProvider:
   On success: isLoading=false, data contains occupancy fields.
   On MSW 500 error: isError=true.

useLiveParking.test.tsx:
   buildSlotViews joins slots and sessions correctly.
   A slot with an active session shows the license_plate.

PAGE SMOKE TESTS (apps/web/tests/pages/):
For each of the 6 real pages (dashboard, parking, vehicles, analytics, reports, demo):
   Renders with MSW handlers active.
   Page heading or unique landmark text is present.
   No uncaught console.error during render.

VERIFY:
   npm run test (vitest run) → all tests pass.
   npm run build → still clean.
   npm run typecheck → 0 errors.
   Update PROJECT_MEMORY.md §13 and §16.7 testing section.
```

---

## Phase 6 — Real-Time WebSocket Enhancement
### Priority: 🟡 Medium — Per-slot live updates & better real-time UX

**Context:** `PROJECT_MEMORY.md §15.13` documents: no per-slot WS channel exists. Live Parking polls every 5 seconds. This phase adds a `slots` channel for slot-level diffs and fixes the cameraId invalidation gap from §16.9.

---

### CLAUDE PROMPT — Phase 6: Real-Time WebSocket Enhancement

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §9 (event flow), §15.13, §16.9.
Add per-slot WebSocket broadcasting and fix the cameraId invalidation gap.
All 201 backend tests must pass. Frontend build/type/lint gates must be green.

BACKEND:

1. Extend modules/integration_layer/events/bus.py:
   Add IntegrationEvent type SlotStateChanged with payload:
   slot_id str, camera_id str, state str, session_id str or None,
   license_plate str or None, timestamp str.
   Emitted by IntegrationService.handle_frame AFTER a slot state changes.

2. Extend modules/integration_layer/services/integration_service.py:
   In handle_frame, after ParkingIntelligenceEngine.ingest_frame:
   compare before/after slot states (fetch from M2 CRUD).
   For each changed slot: publish SlotStateChanged to event bus.
   Only publishes — no state logic duplicated (M2 remains sole owner).

3. Extend modules/integration_layer/websocket/manager.py:
   Add slots channel alongside existing channels.
   SlotStateChanged events broadcast on slots channel.
   Payload is the event JSON (slot diff, not full slot snapshot).

4. Update modules/integration_layer/gateway/router.py:
   Add slots to list of valid channels for /integration/ws route.

5. Add tests/unit/test_slot_websocket.py:
   Mock EventBus and ConnectionManager.
   Assert slot state change triggers SlotStateChanged event.
   Assert manager broadcasts on slots channel.
   Run: pytest -q → 201+ passed.

FRONTEND:

6. Update apps/web/hooks/useParkingWebSocket.ts:
   Add second WS connection to slots channel.
   On slots message: invalidate parkingKeys.slots(cameraId) where cameraId matches event payload.
   useParkingWebSocket now accepts optional cameraId param.
   Backward compat: if no cameraId, invalidate parkingKeys.slots() without filter.

7. Update apps/web/hooks/useLiveParking.ts:
   Pass cameraId to useParkingWebSocket.

8. Create apps/web/components/layout/NotificationFeed.tsx:
   Connects to /integration/ws?channel=events.
   Shows sliding panel of last 10 parking events.
   Uses Badge and Card primitives. Accessible with role=log and aria-live=polite.
   Add bell icon to TopNav to open/close the panel.
   No new backend endpoint; consumes existing events channel.

VERIFY:
   cd apps/web && next build → clean.
   tsc --noEmit → 0 errors.
   next lint → 0 warnings.
   pytest -q → 201+ passed.
   Update PROJECT_MEMORY.md §7 (add slots to WS channels), §13, §16.9 item 6 (resolved).
```

---

## Phase 7 — Digital Twin Module (M7)
### Priority: 🟢 Future — Requires Phase 1 + 2 + 3 complete

**Context:** The Digital Twin is referenced throughout `PROJECT_MEMORY.md`, `github/ROADMAP.md`, and release notes as the primary future capability. It creates a virtual 2D mirror of the parking lot with real-time occupancy and predictive analytics.

**M7 architecture rules:**
- New top-level module: `modules/digital_twin/`
- Depends on M3 (integration_layer) via `modules/digital_twin/integration_client.py` boundary
- MAY consume M4 (analytics) via the same boundary pattern
- MUST NOT import M1, M2, or engine directly
- New DB tables use canonical `Base` from `backend/database/models.py`
- Update `PROJECT_MEMORY.md §2 and §10` BEFORE creating any files

---

### CLAUDE PROMPT — Phase 7A: Digital Twin Foundation (M7 Backend)

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md ENTIRELY before starting.
This is Module 7 (M7) — the Digital Twin backend foundation.
Prerequisites: Phase 1 (Auth), Phase 2 (Deduplication), Phase 3 (API typing) must be complete.

ARCHITECTURE DECISION: Document in PROJECT_MEMORY.md §2 and §10 BEFORE creating files:
M7 is modules/digital_twin/ — depends on M3 via integration_client.py boundary.
May consume M4 analytics via same boundary. Must NOT import M1, M2, or engine directly.
Exposes router at /digital-twin. New DB tables use canonical Base.

STEP 1 — ORM models (modules/digital_twin/storage/models.py):
ParkingLotLayout: id, name, camera_id, width_m float, height_m float, created_at, config_json JSON.
TwinSnapshot: id, layout_id FK, captured_at, occupancy_rate float, slot_states_json JSON,
vehicles_json JSON.
Use canonical Base. Import from backend.database.models.
Create table initializer called in backend/app/app.py lifespan.

STEP 2 — Slot spatial model (modules/digital_twin/spatial/):
slot_coordinate.py: SlotCoordinate dataclass (slot_id, x, y, width, height, angle, zone).
layout_parser.py: parse_layout(config_json: dict) → list[SlotCoordinate].
Reads GeoJSON-like config with slots array having id, x, y fields.
coordinate_utils.py: normalize_coords, slots_in_zone, nearest_slot_to_point.

STEP 3 — Twin service (modules/digital_twin/services/twin_service.py):
TwinService methods:
  get_layout(camera_id) → ParkingLotLayout from DB.
  create_layout(camera_id, config_json) → ParkingLotLayout (admin only).
  get_current_twin_state(camera_id) → TwinStateDTO:
    Merges layout slot coordinates + current M3 slot states via integration_client.
    Returns unified structure: slot_id, x, y, width, height, zone, state, license_plate.
  save_snapshot(camera_id) → TwinSnapshot.
  get_snapshot_history(camera_id, limit) → list[TwinSnapshot].
  predict_occupancy(camera_id, minutes_ahead) → float using M4 trends data.

STEP 4 — DTOs (modules/digital_twin/api/schemas.py):
TwinSlotDTO: slot_id, x, y, width, height, angle, zone, state, license_plate, session_duration_s.
TwinStateDTO: camera_id, captured_at, total_slots, occupied, available, occupancy_rate, slots list.
LayoutCreateRequest: camera_id, name, width_m, height_m, slots list.
PredictionDTO: camera_id, predicted_at, minutes_ahead, predicted_occupancy_rate, confidence.

STEP 5 — Router (modules/digital_twin/api/router.py, prefix /digital-twin):
GET /digital-twin/state?camera_id= → TwinStateDTO (viewer auth)
GET /digital-twin/layouts → list[LayoutResponse] (viewer auth)
POST /digital-twin/layouts → LayoutCreateRequest (admin auth)
GET /digital-twin/snapshots?camera_id=&limit= → list (viewer auth)
GET /digital-twin/predict?camera_id=&minutes_ahead=30 → PredictionDTO (viewer auth)
WS /digital-twin/ws?camera_id= → streams TwinStateDTO every 2s (viewer token required)

STEP 6 — Mount in backend/app/app.py:
Import and include_router the digital_twin router.
Call init_digital_twin_db() in lifespan after M2 init.

STEP 7 — Tests:
tests/unit/test_twin_spatial.py: parse_layout, normalize_coords, nearest_slot_to_point.
tests/unit/test_twin_service.py: mock M3 integration_client, assert get_current_twin_state merges correctly.
tests/integration/test_digital_twin_api.py: GET /digital-twin/state → 200 with valid fields.
Run: pytest -q → 201+ passed.

Update PROJECT_MEMORY.md §2, §3, §6, §10, §13.
```

---

### CLAUDE PROMPT — Phase 7B: Digital Twin Frontend (2D Floor Plan)

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §15 and Phase 7A schemas.
Phase 7A backend must be complete.
Build the Digital Twin frontend page: a 2D interactive SVG floor plan.

ROUTE: /digital-twin (apps/web/app/digital-twin/page.tsx)
Add to NAV_ITEMS in utils/routes.ts with Lucide Building2 icon, after Dashboard.

COMPONENTS (apps/web/components/twin/):

TwinFloorPlan.tsx — core SVG canvas:
  svg element scaled to fill container (viewBox from layout dimensions).
  Each SlotDTO rendered as rect with transform rotate(angle) at x, y, width, height.
  Fill color from TWIN_SLOT_STATUS_CONFIG reusing Live Parking slotStatus.ts palette.
  Hover shows SlotTooltip with slot_id, state, plate, duration.
  Click opens TwinSlotDialog read-only detail panel.
  React.memo per slot element, keyed by slot_id.
  Accessibility: each rect has role=button, aria-label, tabIndex=0, keyboard handlers.

TwinOccupancySummary.tsx:
  Total, Occupied, Available, Occupancy % from TwinStateDTO.
  Predicted Occupancy in 30 min from PredictionDTO as gauge or badge.
  Reuses KpiCard from components/dashboard/.

TwinPredictionChart.tsx:
  Area/line chart using Recharts (lazy-loaded like AnalyticsChart).
  Predicted occupancy % over next 60 minutes (6 × 10-min prediction calls).
  X-axis HH:MM, Y-axis occupancy %, single Predicted line.

TwinControls.tsx:
  Camera selector.
  Refresh button with last-updated timestamp.
  Save Snapshot button calling POST /digital-twin/snapshots (admin only).
  Snapshot History button opening TwinHistoryDialog.

TwinHistoryDialog.tsx:
  List of snapshots with captured_at and occupancy_rate.
  Select snapshot → TwinFloorPlan replays slot_states_json (frozen in time).
  Live button restores current TwinStateDTO feed.

DigitalTwinView.tsx — orchestrator:
  Composes all components.
  useTwinState() hook: TanStack Query over GET /digital-twin/state + WS /digital-twin/ws.
  usePrediction(minutes) hook over GET /digital-twin/predict.
  Loading/error/empty states with EmptyState for no layout configured.

DATA LAYER:
  apps/web/services/twin.ts: fetchTwinState, fetchLayouts, fetchPrediction, saveSnapshot.
  apps/web/hooks/useTwinState.ts: TanStack Query + WS subscription.
  apps/web/types/twin.ts: TwinSlotDTO, TwinStateDTO, PredictionDTO.

VERIFY:
  cd apps/web && next build → clean.
  tsc --noEmit → 0 errors.
  next lint → 0 warnings.
  Update PROJECT_MEMORY.md §2 M6 routes, §13 Phase 7B entry.
```

---

## Phase 8 — Analytics Date-Range & Backend Query Params
### Priority: 🟢 Future — Improves analytics usefulness

**Context:** `PROJECT_MEMORY.md §15.15`: The time range selector is UI-only. The backend `/analytics` endpoints have no range parameters, so filtering only trims already-returned data.

---

### CLAUDE PROMPT — Phase 8: Analytics Date-Range

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §7 (analytics router) and §15.15.
Add start/end date range query parameters to analytics endpoints.
No new routes, no new modules. All 201 tests must pass.

BACKEND:

1. Update modules/analytics/services/analytics_service.py:
   All fetch methods accept optional start: datetime | None and end: datetime | None.
   Filter DB queries to snapshots within [start, end].
   Default: last 24 hours if no range provided (backward compat).

2. Update modules/analytics/api/router.py:
   Add optional Query params start and end datetime to all analytics endpoints.
   Validate: if both provided, end > start. Return 422 if end < start.
   Pass through to service layer.

3. Update modules/analytics/api/schemas.py:
   Add query_start and query_end strings to all response models.

4. Tests: Add tests/unit/test_analytics_date_range.py:
   With start/end: returns only data in range.
   With no params: returns last 24h.
   With end < start: returns 422.
   Run: pytest -q → 201+ passed.

FRONTEND:

5. Update apps/web/components/analytics/TimeRangeSelector.tsx:
   Add actual start/end datetime values alongside label.
   Custom Range shows native date pickers (input type=date).
   Component now emits { label, start: Date, end: Date }.

6. Update apps/web/hooks/useAnalytics.ts:
   Accept { start: Date, end: Date } params.
   Pass as ISO strings to fetcher.

7. Update apps/web/services/analytics.ts:
   Add start and end query params to all fetch calls.

8. Update apps/web/components/analytics/AnalyticsView.tsx:
   Wire TimeRangeSelector start/end into useAnalyticsDashboard.
   Remove client-side filterTimelineByRange (no longer needed).

VERIFY:
   cd apps/web && next build, tsc --noEmit, next lint → all clean.
   pytest -q → 201+ passed.
   Update PROJECT_MEMORY.md §7 and §13.
```

---

## Phase 9 — Multi-Database Migration (SQLite → PostgreSQL)
### Priority: 🟢 Future — Required for multi-worker production scale

**Context:** `PROJECT_MEMORY.md §20.9`: PostgreSQL profile is wired in Docker Compose but not activated. SQLite cannot handle concurrent writes from multiple uvicorn workers. **Prerequisite: Phase 2** (all DB stores consolidated into SQLAlchemy session).

---

### CLAUDE PROMPT — Phase 9: PostgreSQL Migration

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §3 (database) and §20.9.
Prerequisite: Phase 2 complete (single SQLAlchemy DB, no raw aiosqlite stores).
Make the application work with both SQLite and PostgreSQL via DATABASE_URL.

BACKEND:

1. Update backend/database/session.py:
   Replace hardcoded sqlite+aiosqlite with DATABASE_URL from get_settings().
   If DATABASE_URL starts with postgresql: use asyncpg driver.
   If DATABASE_URL starts with sqlite: use aiosqlite (existing behavior).
   Create async engine dynamically based on URL type.

2. Update pyproject.toml:
   Add optional dependency group: postgres = ["asyncpg>=0.29"]
   Document: pip install -e ".[postgres]" for PostgreSQL mode.

3. Update configs/settings.yaml and .env.production.example:
   database_url default: "sqlite+aiosqlite:///./data/parktwin.db"
   Document: override with DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname

4. Update docker/compose/docker-compose.prod.yml:
   Set DATABASE_URL in backend environment to use postgres container.
   Add POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD from .env.production.

5. Migration script scripts/migrations/migrate_to_postgres.py:
   Reads from SQLite, writes to PostgreSQL.
   Migrates Camera, Vehicle, DetectionLog, ParkingSlot, ParkingSession, ParkingEvent.
   Idempotent: skips rows that already exist by primary key.

6. Add Alembic for schema migrations:
   pip install alembic.
   alembic init alembic/.
   Configure to read DATABASE_URL from environment.
   Create initial migration with alembic revision --autogenerate.
   Document in docs/deployment/database-migrations.md.

7. Tests:
   Existing 201 tests use SQLite — must still pass.
   Add tests/integration/test_postgres_compat.py (skips if no PG_TEST_URL env var).
   Run: pytest -q → 201+ passed.

Update PROJECT_MEMORY.md §3 and §13.
```

---

## Phase 10 — Live Camera Feed & RTSP Integration
### Priority: 🟢 Future — Core operational feature

**Context:** `PROJECT_MEMORY.md §15.22`: CameraPanel has source-agnostic architecture but only `upload` is implemented. `engine/frame_processor.py` already has RTSP capture code — it needs to be wired to the API.

---

### CLAUDE PROMPT — Phase 10: Live Camera Feed & RTSP Integration

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §3 (engine/frame_processor.py),
§7 (cameras router), §15.22 (CCTV Control Center architecture).
Prerequisite: Phase 1 (auth). Wire live RTSP/USB camera feeds into the CCTV Control Center.

BACKEND:

1. Create backend/api/routers/streams.py:
   POST /streams/start: body with camera_id and source_url (rtsp:// or 0 for USB).
   Starts CameraStream for that camera using engine/frame_processor.py.
   Returns camera_id, status started, source_url.
   POST /streams/stop?camera_id= → stops the camera stream.
   GET /streams → list all active streams with camera_id, source_url, fps, frame_count, status.
   GET /streams/{camera_id}/frame → latest frame as JPEG bytes.
   Mount at /streams prefix in backend/app/app.py. Require admin auth.

2. Extend engine/frame_processor.py:
   Add FrameProcessor.get_latest_frame(camera_id) → bytes or None.
   Returns most recent JPEG-encoded frame from in-memory frame buffer.

3. Update backend/api/dependencies.py:
   Expose get_frame_processor() as singleton dependency for streams router.

4. Tests:
   tests/unit/test_streams.py with mocked FrameProcessor.
   POST /streams/start starts stream. GET /streams returns active stream.
   POST /streams/stop stops it. Run: pytest -q → 201+ passed.

FRONTEND:

5. Update apps/web/components/video/CameraPanel.tsx:
   Add source selector dropdown (Upload / RTSP / USB) using Select primitive.
   For source=rtsp: show RTSP URL input and Start Stream button.
   For source=usb: show Connect button (sends 0 as source_url).
   For source=upload: existing VideoUpload unchanged.
   Start Stream calls POST /streams/start. Stop calls POST /streams/stop.
   While stream active: poll GET /streams/{camera_id}/frame every 100ms,
   display in img tag as blob URL.

6. Create apps/web/hooks/useStreamFrame.ts:
   useStreamFrame(cameraId, isActive) polls at 100ms.
   Returns frameUrl string or null, fps number, error.
   Uses URL.createObjectURL from JPEG blob. Revokes old ObjectURLs.

7. Update apps/web/components/video/ControlPanel.tsx:
   Add Start All RTSP Streams and Stop All Streams buttons.

8. Create apps/web/services/streams.ts:
   startStream, stopStream, fetchStreams, fetchFrame functions.

VERIFY:
   cd apps/web && next build, tsc --noEmit, next lint → clean.
   pytest -q → 201+ passed.
   Update PROJECT_MEMORY.md §7 (/streams routes), §15.22, §13.
```

---

## Phase 11 — Demo Mode Backend Integration
### Priority: 🟢 Future — Wire real ANPR results into Demo Mode

**Context:** `PROJECT_MEMORY.md §15.28`: Demo Mode uses deterministic timelines as stand-in for real inference. The swap point is clearly documented: `DEMO_PARKING_TIMELINE` and `DEMO_VEHICLE_TIMELINE`. This phase replaces static timelines with live backend data.

---

### CLAUDE PROMPT — Phase 11: Demo Mode Backend Integration

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §15.24 through §15.28 (Demo Mode architecture).
The Demo Playback Engine is the single source of time.
Timeline swap points: DEMO_PARKING_TIMELINE and DEMO_VEHICLE_TIMELINE.
Add live backend data into Demo Mode with graceful fallback to static timelines.

ARCHITECTURE: Document in PROJECT_MEMORY.md before coding.
Demo Mode adds recorded (existing static timelines) and live (backend-fed) modes.
Toggle in Demo Controls switches between them.
In live mode: demo plays the video AND shows live slot/vehicle data from /integration/*.

1. Create apps/web/services/demo-live.ts:
   fetchLiveParkingState() calling apiGet for /integration/slots and /integration/sessions.
   fetchLiveVehicleState() calling apiGet for /integration/vehicles and /integration/sessions.
   Uses existing api-client.ts.

2. Create apps/web/hooks/useDemoLiveData.ts:
   Polls /integration/slots (2s interval) and /integration/vehicles in live mode.
   Returns parkingState DemoParkingState, vehicleState array or null,
   isLive boolean, isLoading, error.
   In live mode: maps API response to DemoParkingState.
   In recorded mode or on error: returns null (DemoView falls back to computed state).

3. Create apps/web/components/demo/liveDataAdapter.ts:
   adaptLiveSlotsToParking(slots, sessions) → DemoParkingState.
   adaptLiveVehiclesToDemo(vehicles, sessions) → DemoVehicleState array.
   Pure functions — no state, no side effects.

4. Update apps/web/components/demo/DemoView.tsx:
   Add Live Mode toggle (Badge with onClick) to DemoHeader area.
   In live mode: use useDemoLiveData() results instead of computed state.
   Demo Playback Engine STILL controls the video.
   In recorded mode: existing behavior unchanged.
   Show LIVE indicator badge in DemoHeader when in live mode.

5. Update DemoPlaybackController.tsx:
   Add Toggle Live Data button.
   Show LIVE badge indicator when active.

6. Error handling:
   If backend unreachable in live mode: show Banner (Backend unavailable — using recorded data).
   Automatically fall back to recorded mode.

7. Safety: static DEMO_PARKING_TIMELINE and DEMO_VEHICLE_TIMELINE remain UNCHANGED.
   computeParkingState and computeVehicleState are UNCHANGED.
   DemoPlaybackEngine is NEVER modified.

VERIFY:
   cd apps/web && next build, tsc --noEmit, next lint → clean.
   Update PROJECT_MEMORY.md §15.28 and §13.
```

---

## Phase 12 — Observability & Production Monitoring
### Priority: 🟢 Future — Required for production operations

**Context:** `PROJECT_MEMORY.md §20.9`: Prometheus exporter is recommended. Currently only structured JSON logs and /health endpoints exist.

---

### CLAUDE PROMPT — Phase 12: Prometheus Metrics & Observability

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §20.6 and §16.7.
Add a Prometheus metrics endpoint and structured observability.
Do NOT change any existing API behavior or business logic.

BACKEND:

1. Install prometheus-fastapi-instrumentator.
   Add to pyproject.toml dependencies.

2. In backend/app/app.py create_app():
   from prometheus_fastapi_instrumentator import Instrumentator
   Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
   This adds GET /metrics automatically instrumenting:
   http_requests_total by method, endpoint, status code.
   http_request_duration_seconds histogram.
   http_requests_in_progress.

3. Add custom business metrics in modules/integration_layer/metrics.py:
   from prometheus_client import Gauge, Counter, Histogram
   parking_occupancy_rate = Gauge with camera_id label.
   vehicles_detected_total = Counter with camera_id label.
   frame_processing_duration = Histogram.
   Call these in IntegrationService.handle_frame.

4. Extend GET /health/stats:
   Add uptime_seconds, request_count_last_minute, error_count_last_minute.
   Sourced from Prometheus counters in memory.

5. Update docker/compose/docker-compose.prod.yml:
   Add prometheus service under profile monitoring.
   Add grafana service under profile monitoring.
   Create docker/monitoring/prometheus.yml scraping backend:8000/metrics every 15s.
   Create docker/monitoring/grafana-datasource.yml.

6. Update reverse proxy configs:
   Add /metrics to Nginx/Caddy as blocked from external access (internal network only).

7. Structured log enrichment:
   In shared/logging/logger.py: add request_id context variable.
   In backend/app/app.py: add middleware setting UUID request_id per request.
   Include request_id in every log line via Loguru's contextualize.

8. Tests:
   tests/unit/test_metrics.py: GET /metrics → 200, contains parktwin_parking_occupancy_rate.
   Run: pytest -q → 201+ passed.

Update docs/deployment/ with Monitoring stack section.
Update PROJECT_MEMORY.md §20.6 and §13.
```

---

## Phase 13 — Mobile App & API Expansion
### Priority: 🟢 Future — Extends platform to mobile operators

**Context:** Parking lot operators need mobile access for on-the-go monitoring. A React Native/Expo app consuming the same `/integration` gateway API would provide live occupancy, vehicle lookup, and operator tools.

---

### CLAUDE PROMPT — Phase 13: Mobile App Foundation (React Native / Expo)

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §7 (API surface).
Prerequisite: Phase 1 (Auth) must be complete.
Scaffold a React Native (Expo) mobile app in apps/mobile/ consuming the ParkTwin AI API.
This is a NEW application. Do NOT modify any backend, module, or web frontend file.

SETUP:

1. Scaffold:
   cd apps
   npx create-expo-app mobile --template tabs
   cd mobile && npx expo start (verify Metro bundler starts)

2. Install dependencies:
   npm install axios @tanstack/react-query@5 zustand
   npm install react-native-safe-area-context react-native-screens

3. Create apps/mobile/services/api-client.ts:
   Axios instance with baseURL from EXPO_PUBLIC_API_BASE.
   Request interceptor: add Authorization: Bearer header from Zustand auth store.
   Response interceptor: on 401 navigate to Login.

4. Create apps/mobile/store/auth.ts (Zustand):
   token string or null, setToken, clearToken.
   Persist to AsyncStorage via zustand/middleware/persist.

5. Build 4 core screens:
   app/(auth)/login.tsx: email + password form → POST /auth/login → store JWT.
   app/(tabs)/index.tsx (Dashboard): KPI cards from /integration/occupancy + /integration/statistics.
   app/(tabs)/parking.tsx (Live Parking): slot grid as FlatList from /integration/slots + /integration/occupancy.
   app/(tabs)/vehicles.tsx (Vehicle Lookup): search box → GET /integration/vehicles?plate=.

6. Create apps/mobile/types/: occupancy.ts, slot.ts, vehicle.ts.

7. Create apps/mobile/constants/Config.ts:
   API_BASE: process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:8000"

VERIFY:
   npx expo start → no Metro errors.
   Login screen visible on simulator.
   Dashboard KPI cards render.
   Update PROJECT_MEMORY.md §3 (add apps/mobile/) and §13.
   Note: apps/mobile/ has its own package.json independent of apps/web.
```

---

## Phase 14 — D12 Fix: Vehicle Field Model Deduplication
### Priority: 🟡 Medium — Eliminates last major unresolved duplication

**Context:** `PROJECT_MEMORY.md §5-D12` documents the one remaining unresolved duplication: `modules/reporting/generators/` re-declares vehicle fields (`license_plate`, `vehicle_type`, `color`, `tracking_id`, `plate_confidence`, `is_registered`, `last_seen`) as Python dataclasses, while the canonical shape is already `backend/schemas.VehicleResponse` (Pydantic). This means two separate serialization stacks describe the same vehicle, risking silent drift if a field is added to `VehicleResponse` but not to the reporting dataclass.

**What needs to be built:**
- Map the reporting generator vehicle rows to `VehicleResponse` DTO instead of the local dataclass.
- Remove the ad-hoc vehicle field list from all reporting generator files.
- Verify all report types (occupancy, vehicle, session, parking summary, analytics summary, violation) still produce correct output.

**Files affected:**
- MODIFY: `modules/reporting/generators/vehicle.py` — remove local dataclass, import `VehicleResponse` from `backend/schemas`
- MODIFY: `modules/reporting/generators/parking_summary.py` — same
- MODIFY: `modules/reporting/generators/analytics_summary.py` — same
- MODIFY: Any other generator that reconstructs vehicle rows from scratch
- MODIFY: `DUPLICATE_REGISTRY.md` — mark D12 RESOLVED
- MODIFY: `PROJECT_MEMORY.md §5-D12` — mark RESOLVED (Phase 14)

---

### CLAUDE PROMPT — Phase 14: D12 Vehicle Field Model Deduplication

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §5-D12 and §6 before starting.
Do NOT change any report content, field names, format, or HTTP endpoint behavior.
All 230 backend tests must still pass after every step. Zero public API changes.

BACKGROUND:
modules/reporting/generators/ currently re-declares vehicle fields as Python dataclasses
(license_plate, vehicle_type, color, tracking_id, plate_confidence, is_registered, last_seen)
instead of consuming the canonical Pydantic shape backend/schemas.VehicleResponse.
This is the sole remaining D12 duplication.

STEP 1 — Audit:
Find every file in modules/reporting/generators/ that defines or unpacks vehicle fields
manually (grep for license_plate, vehicle_type, tracking_id inside generator files).
List each file and line.

STEP 2 — Refactor:
For each generator file identified in Step 1:
  a) Import VehicleResponse from backend.schemas (only via the M5 boundary —
     never import backend/ directly from modules/; use the Integration Layer DTO
     or the DataFetcher result which already returns typed VehicleResponse-shaped dicts).
  b) Replace manual field unpacking with attribute access on the typed DTO.
  c) Remove any local vehicle dataclass or TypedDict that duplicates VehicleResponse fields.
  d) Keep all field names and report output format byte-for-byte identical.

STEP 3 — Tests:
Run pytest -q → must show 230+ passed, 0 failed.
Specifically run: pytest tests/unit/test_reporting*.py tests/integration/test_reporting*.py -v
Verify all report types (occupancy, vehicle, session, parking_summary, analytics_summary,
violation) produce non-empty correct output.

STEP 4 — Documentation:
Update DUPLICATE_REGISTRY.md D12 entry: mark RESOLVED (Phase 14).
Update PROJECT_MEMORY.md §5-D12: mark RESOLVED (Phase 14) with date and method.
Update PROJECT_MEMORY.md §13 Change Log with one entry for this phase.

ARCHITECTURE RULES (binding):
- Never import backend/ schemas directly from modules/reporting/ files.
  Use the Integration Layer DTO or DataFetcher intermediary.
- Never change report field names, CSV column headers, PDF labels, or JSON keys.
- Never modify backend/schemas.py VehicleResponse — consume it read-only.
- Run pytest -q after every file change. Must stay green.
```

---

## Phase 15 — E2E Tests (Playwright)
### Priority: 🟡 Medium — Validates the full stack works end-to-end as a user would

**Context:** The project has 230 backend unit/integration tests and 81 frontend Vitest tests, but zero end-to-end browser tests. Critical user flows (login → dashboard → live parking → video upload → ANPR result) are never automatically verified as a whole. Adding even a small Playwright suite catches regressions that isolated unit tests cannot.

**What needs to be built:**
- Playwright setup in `apps/web/` (`playwright.config.ts`, test fixtures for auth).
- Auth flow test: visit `/login` → submit credentials → assert redirect to `/dashboard`.
- Dashboard smoke test: assert all 6 KPI cards render and show numeric values.
- Live Parking test: navigate to `/parking`, assert slot grid renders, verify occupancy summary visible.
- Video upload test: navigate to `/video-processing`, upload a test video, verify AI pipeline stages animate and a result is shown.
- Demo mode test: navigate to `/demo`, press Start, assert playback progresses and parking grid updates.
- Logout test: click Logout, assert redirect to `/login`, assert protected route blocks.

**Files affected:**
- NEW: `apps/web/playwright.config.ts`
- NEW: `apps/web/tests/e2e/auth.spec.ts`
- NEW: `apps/web/tests/e2e/dashboard.spec.ts`
- NEW: `apps/web/tests/e2e/parking.spec.ts`
- NEW: `apps/web/tests/e2e/video-upload.spec.ts`
- NEW: `apps/web/tests/e2e/demo.spec.ts`
- MODIFY: `apps/web/package.json` — add `test:e2e` script
- MODIFY: `PROJECT_MEMORY.md §13` — change log entry

---

### CLAUDE PROMPT — Phase 15: E2E Playwright Tests

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §16.7 and §15.30 before starting.
The backend is running at http://localhost:8000 via `.\.dev.ps1 backend`.
The frontend dev server is at http://localhost:3000 via `.\.dev.ps1 up`.
Do NOT modify any application source code. Tests only.

SETUP:
1. Install Playwright:
   cd apps/web
   npm install --save-dev @playwright/test
   npx playwright install chromium

2. Create apps/web/playwright.config.ts:
   import { defineConfig } from '@playwright/test';
   export default defineConfig({
     testDir: './tests/e2e',
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
     },
     webServer: {
       command: 'npm run dev',
       url: 'http://localhost:3000',
       reuseExistingServer: true,
     },
   });

3. Create apps/web/tests/e2e/fixtures.ts:
   Define an `authedPage` fixture that:
   - Navigates to /login
   - Fills username=admin, password from env ADMIN_PASSWORD
   - Submits and waits for redirect to /dashboard
   - Returns the authenticated page object.

TEST FILES (create each):

auth.spec.ts:
- test: redirects unauthenticated user from /dashboard to /login
- test: login with valid credentials → redirects to /dashboard
- test: login with wrong password → shows error message
- test: logout button clears token and redirects to /login

dashboard.spec.ts (uses authedPage fixture):
- test: dashboard page loads with heading
- test: all 6 KPI cards render (Total Slots, Occupied, Available, Occupancy%, Active Sessions, Today Vehicles)
- test: system health panel is visible

parking.spec.ts (uses authedPage fixture):
- test: live parking page renders slot grid
- test: occupancy summary bar shows total/occupied/available counts
- test: clicking a slot opens the SlotDetailsDialog

video-upload.spec.ts (uses authedPage fixture):
- test: navigate to /video-processing, assert CCTV Control Center heading
- test: upload datasets/test_videos/test_parking.mp4 to Camera 1
- test: assert Process Video button enabled after file selection
- test: assert AI pipeline stages appear after processing

demo.spec.ts (uses authedPage fixture):
- test: navigate to /demo
- test: press Start Demo button
- test: assert DemoStatusBanner shows a processing or playing state
- test: assert parking grid has at least 1 slot tile visible

ADD to apps/web/package.json scripts:
  "test:e2e": "playwright test"

VERIFY:
  npx playwright test → all tests pass
  npx next build → still clean (no app code changed)
  pytest -q in backend → still 230+ passed
Update PROJECT_MEMORY.md §13 Change Log with one entry.
```

---

## Phase 16 — Mobile App Completion (Analytics, Reports, Settings)
### Priority: 🟢 Future — Brings the mobile app to feature parity with the web app

**Context:** `PROJECT_MEMORY.md §13 (2026-07-29)` records that `apps/mobile/` was scaffolded with 4 screens (Login, Dashboard, Live Parking, Vehicle Lookup). The web app has 6 full pages plus CCTV and Demo. The mobile app is missing: Analytics, Reports, Settings, and the notification feed. This phase adds those screens and improves the existing ones with pull-to-refresh and error handling.

**What needs to be built:**
- `app/(tabs)/analytics.tsx` — occupancy + traffic charts using Victory Native or `react-native-chart-kit`; date-range picker; server-side `start`/`end` params.
- `app/(tabs)/reports.tsx` — report list, generate button, share/download using `expo-sharing`.
- `app/(tabs)/settings.tsx` — read `GET /settings/public`, display system info cards; local preferences stored in AsyncStorage.
- Pull-to-refresh (`RefreshControl`) on Dashboard, Parking, Vehicles.
- Notification badge on a Bell icon using WS events channel (`/integration/ws?channel=events`).
- Offline banner when `GET /health` fails.

**Files affected:**
- NEW: `apps/mobile/app/(tabs)/analytics.tsx`
- NEW: `apps/mobile/app/(tabs)/reports.tsx`
- NEW: `apps/mobile/app/(tabs)/settings.tsx`
- NEW: `apps/mobile/hooks/useAnalytics.ts`, `useReports.ts`, `useSettings.ts`
- NEW: `apps/mobile/services/analytics.ts`, `reports.ts`, `settings.ts`
- MODIFY: `apps/mobile/app/(tabs)/index.tsx` — add RefreshControl
- MODIFY: `apps/mobile/app/(tabs)/parking.tsx` — add RefreshControl
- MODIFY: `apps/mobile/app/(tabs)/vehicles.tsx` — add RefreshControl
- MODIFY: `apps/mobile/_layout.tsx` — add Bell icon with notification badge
- MODIFY: `PROJECT_MEMORY.md §13` — change log entry

---

### CLAUDE PROMPT — Phase 16: Mobile App Completion

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md before starting.
The mobile app is in apps/mobile/ (Expo Router, React Native).
The backend API base is configured in apps/mobile/constants/Config.ts (EXPO_PUBLIC_API_BASE).
The auth store is apps/mobile/store/auth.ts (Zustand + AsyncStorage, Bearer token).
The HTTP client is apps/mobile/services/api-client.ts (Axios with Bearer interceptor).
Do NOT modify any backend, web frontend, or module source code.

STEP 1 — Service + Hook layer:
Create apps/mobile/services/analytics.ts:
  fetchOccupancyAnalytics(start?, end?) → GET /analytics/occupancy?start=&end=
  fetchTrafficAnalytics(start?, end?) → GET /analytics/traffic
  fetchUtilizationAnalytics(start?, end?) → GET /analytics/utilization
  fetchAnalyticsDashboard(start?, end?) → GET /analytics/dashboard
  All functions use the shared api-client Axios instance.

Create apps/mobile/services/reports.ts:
  fetchReportHistory() → GET /reports/history
  generateReport(type, format) → POST /reports/generate
  downloadReport(reportId, format) → GET /reports/download?report_id=&format=

Create apps/mobile/services/settings.ts:
  fetchPublicSettings() → GET /settings/public

Create apps/mobile/hooks/useAnalytics.ts, useReports.ts, useSettings.ts:
  TanStack Query useQuery hooks wrapping the services.
  useAnalytics: { occupancy, traffic, utilization, dashboard } with 30s staleTime.
  useReports: list query + generateReport mutation.
  useSettings: 5-minute staleTime.

STEP 2 — Analytics Screen:
Create apps/mobile/app/(tabs)/analytics.tsx:
  - Two date pickers (start, end) using @react-native-community/datetimepicker.
  - Occupancy percentage gauge (large text display, no library needed).
  - Traffic bar chart using react-native-chart-kit BarChart component.
  - Utilization list (top 5 slots by utilization %).
  - Error state and loading skeleton.

STEP 3 — Reports Screen:
Create apps/mobile/app/(tabs)/reports.tsx:
  - Report type selector (Picker).
  - Format selector (JSON / CSV / PDF).
  - Generate Report button → useGenerateReport mutation → success toast.
  - FlatList showing report history (name, type, date, status).
  - Download action using expo-sharing (Share.shareAsync with report blob URI).

STEP 4 — Settings Screen:
Create apps/mobile/app/(tabs)/settings.tsx:
  - System Config section: App Info card, AI Models card, Parking Config card
    from GET /settings/public.
  - Local Preferences section: stored in AsyncStorage key parktwin_mobile_prefs.
    Items: polling interval (5s/10s/30s), show notifications toggle.
  - App version from expo-constants.

STEP 5 — Pull-to-refresh:
Add RefreshControl with onRefresh calling refetch() to:
  apps/mobile/app/(tabs)/index.tsx (Dashboard)
  apps/mobile/app/(tabs)/parking.tsx (Live Parking)
  apps/mobile/app/(tabs)/vehicles.tsx (Vehicle Lookup)

STEP 6 — Offline banner:
In apps/mobile/app/_layout.tsx: add a useEffect that pings GET /health every 30s.
If the request fails, show a dismissible red banner at the top: "Backend offline — data may be stale".

STEP 7 — Tab bar update:
Update apps/mobile/app/(tabs)/_layout.tsx to include the 3 new tabs
(Analytics, Reports, Settings) with appropriate Ionicons icons.

VERIFY:
  npx expo config → no errors
  npx expo start → Metro bundler starts cleanly
  No backend, module, or web frontend files modified.
Update PROJECT_MEMORY.md §13 Change Log with one entry.
```

---

## Phase 17 — Multi-Camera Parallel Processing
### Priority: 🟢 Future — Unlocks the "Process All" button currently disabled in the CCTV Control Center

**Context:** `PROJECT_MEMORY.md §15.22` notes that the CCTV Control Center "Process All" button is **disabled** with the message "Multi-camera processing will be available in a future release." The current pipeline processes one video at a time (`IntegrationService.handle_frame` is synchronous per camera). This phase adds a job-queue layer so multiple cameras can be processed concurrently without blocking each other.

**What needs to be built:**
- A lightweight async job queue (`asyncio.Queue` + worker pool) inside the Integration Layer for concurrent frame/video ingestion per camera.
- A `POST /integration/process-all` endpoint accepting a list of camera+file pairs and fanning out to the queue.
- Progress tracking: `GET /integration/jobs/{job_id}` returning status (queued / processing / done / error), progress %, camera ID.
- Frontend: enable the "Process All" button in `ControlPanel.tsx`, wire it to `POST /integration/process-all`, and show per-camera progress bars from polling `GET /integration/jobs/{job_id}`.

**Files affected:**
- NEW: `modules/integration_layer/jobs/job_queue.py` (AsyncJobQueue, JobStatus, JobRecord)
- NEW: `modules/integration_layer/jobs/worker.py` (worker coroutine)
- NEW: `backend/api/routers/jobs.py` (GET `/integration/jobs/{job_id}`)
- MODIFY: `modules/integration_layer/gateway/router.py` — add `POST /integration/process-all`
- MODIFY: `backend/app/app.py` — start worker pool in lifespan
- MODIFY: `apps/web/components/video/ControlPanel.tsx` — enable Process All, add progress bars
- NEW: `apps/web/services/jobs.ts`, `apps/web/hooks/useJobStatus.ts`
- NEW: `tests/unit/test_job_queue.py`
- MODIFY: `PROJECT_MEMORY.md §13` — change log entry

---

### CLAUDE PROMPT — Phase 17: Multi-Camera Parallel Processing

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md before starting.
Do NOT use external task queues (Celery, RQ, Redis). Use Python asyncio only.
All 230+ existing tests must still pass. Never modify the existing
POST /integration/process-frame or POST /integration/process-video endpoints.
The Docker constraint (§23) applies: no image rebuild — use .\dev.ps1 test to verify.

STEP 1 — Job Queue core:
Create modules/integration_layer/jobs/job_queue.py:
  JobStatus = Enum: QUEUED | PROCESSING | DONE | ERROR
  @dataclass JobRecord:
    job_id: str (uuid4)
    camera_id: str
    status: JobStatus
    progress: float (0.0–1.0)
    error: str | None
    created_at: str (iso_now)
    completed_at: str | None

  AsyncJobQueue class:
    _queue: asyncio.Queue[JobRecord]
    _registry: dict[str, JobRecord]  # job_id → record
    async def enqueue(camera_id, video_bytes) → job_id
    def get(job_id) → JobRecord | None
    def list_all() → list[JobRecord]

Create modules/integration_layer/jobs/worker.py:
  async def run_worker(queue: AsyncJobQueue, integration_service: IntegrationService):
    while True:
      record = await queue._queue.get()
      record.status = PROCESSING
      try:
        # call integration_service.process_video_bytes(record.camera_id, video_bytes)
        # updating record.progress at key milestones (0.1, 0.5, 0.9, 1.0)
        record.status = DONE
        record.completed_at = iso_now()
      except Exception as e:
        record.status = ERROR
        record.error = str(e)
      finally:
        queue._queue.task_done()

STEP 2 — Lifespan integration:
In backend/app/app.py lifespan:
  Create AsyncJobQueue singleton and start 3 worker coroutines via asyncio.create_task.
  Store queue on app.state.job_queue.
  On shutdown: cancel worker tasks.

STEP 3 — Endpoints:
In modules/integration_layer/gateway/router.py:
  POST /integration/process-all:
    Body: list of {camera_id: str, file: UploadFile}
    For each item: enqueue to job_queue → return list of {job_id, camera_id}
    Protected by require_admin.

Create backend/api/routers/jobs.py:
  GET /integration/jobs/{job_id}:
    Returns JobRecord as Pydantic schema (JobStatusResponse).
    Protected by require_viewer.
  GET /integration/jobs:
    Returns list[JobStatusResponse].
    Protected by require_viewer.

STEP 4 — Frontend:
Create apps/web/services/jobs.ts:
  processAll(cameras: {cameraId, file}[]) → POST /integration/process-all
  fetchJobStatus(jobId) → GET /integration/jobs/{jobId}

Create apps/web/hooks/useJobStatus.ts:
  useJobStatus(jobId: string | null):
    TanStack Query polling every 1s while status is QUEUED | PROCESSING.
    Stops polling when DONE | ERROR.

Modify apps/web/components/video/ControlPanel.tsx:
  Remove the "Multi-camera processing will be available in a future release." disabled state.
  Enable Process All button when at least 1 camera is in Ready state.
  On click: call processAll() → receive job list → for each job render
  a progress bar driven by useJobStatus(job.jobId).
  Show camera name, job status badge, and progress %.

STEP 5 — Tests:
Create tests/unit/test_job_queue.py:
  test_enqueue_returns_job_id
  test_job_starts_in_queued_status
  test_worker_transitions_to_done
  test_worker_sets_error_on_exception
  test_get_unknown_job_returns_none

VERIFY:
  pytest -q → 235+ passed, 0 failed.
  next build → clean.
  tsc --noEmit → 0 errors.
  next lint → 0 warnings.
Update PROJECT_MEMORY.md §13 Change Log with one entry.
```

---

## Phase 18 — Real User Management (User DB & Admin CRUD)
### Priority: 🟢 Future — Replaces env-var bootstrapped credentials with a proper user table

**Context:** `PROJECT_MEMORY.md §13 (2026-07-28 Auth entry)` notes the current auth uses `hardcoded_users.py` — two demo users (`admin`, `viewer`) loaded from `ADMIN_PASSWORD`/`VIEWER_PASSWORD` env vars. This is explicitly documented as a bootstrap credential store. Before the system can be given to multiple end users, it needs a real user table in `parktwin.db`, admin-only CRUD, and password change capability.

**What needs to be built:**
- `User` ORM model in `backend/database/models.py` (id, username, hashed_password, role, is_active, created_at).
- Alembic migration for the `users` table.
- `backend/auth/user_store.py` replacing `hardcoded_users.py` — async CRUD against the `users` table.
- Admin-only `POST /auth/users`, `GET /auth/users`, `PATCH /auth/users/{id}`, `DELETE /auth/users/{id}` endpoints.
- `POST /auth/users/me/change-password` for any authenticated user.
- Seed script that reads `ADMIN_PASSWORD`/`VIEWER_PASSWORD` env vars and creates the initial admin/viewer rows on first run (idempotent).
- Frontend: minimal Admin panel under `/settings` for listing and creating users (admin only).

**Files affected:**
- MODIFY: `backend/database/models.py` — add `User` ORM model
- NEW: `alembic/versions/002_add_users_table.py`
- NEW: `backend/auth/user_store.py` (replaces `hardcoded_users.py`)
- MODIFY: `backend/auth/dependencies.py` — authenticate against DB instead of hardcoded store
- MODIFY: `backend/auth/router.py` — add user CRUD + change-password routes
- NEW: `scripts/migrations/seed_users.py` (idempotent seed from env vars)
- NEW: `apps/web/components/settings/UserManagementPanel.tsx`
- MODIFY: `apps/web/components/settings/SettingsView.tsx` — show panel if role=admin
- NEW: `tests/unit/test_user_store.py`, `tests/integration/test_user_management.py`
- MODIFY: `PROJECT_MEMORY.md §13` — change log entry

---

### CLAUDE PROMPT — Phase 18: Real User Management

```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §13 (Auth entry) and §23 before starting.
The existing auth (JWT, bcrypt, roles, WebSocket auth, rate limiting) must remain 100% intact.
All 230+ tests must still pass. The Docker zero-rebuild constraint (§23) applies.

STEP 1 — User ORM model:
In backend/database/models.py add:
  class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="viewer")  # admin | viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String(32), default=iso_now)

STEP 2 — Alembic migration:
Create alembic/versions/002_add_users_table.py:
  upgrade(): op.create_table("users", all columns above)
  downgrade(): op.drop_table("users")
Run: alembic upgrade head (inside the running container via .\dev.ps1 shell)

STEP 3 — User store:
Create backend/auth/user_store.py:
  async get_user_by_username(db, username) → User | None
  async create_user(db, username, plain_password, role) → User
  async update_user(db, user_id, **fields) → User
  async delete_user(db, user_id) → None
  async list_users(db) → list[User]
  async set_password(db, user_id, plain_password) → User
  async seed_default_users(db):
    idempotently creates admin (ADMIN_PASSWORD env) and viewer (VIEWER_PASSWORD env)
    if they don't exist yet. Call this in backend/app/app.py lifespan after DB init.

STEP 4 — Update authentication:
Modify backend/auth/dependencies.py:
  Replace calls to hardcoded_users.py verify_password with:
  user = await get_user_by_username(db, username)
  if not user or not verify_password(plain, user.hashed_password): raise 401
  Keep API-key auth unchanged (it can stay env-based).

STEP 5 — User management endpoints (in backend/auth/router.py):
  GET /auth/users → list[UserResponse] — require_admin
  POST /auth/users → UserResponse — require_admin — body: CreateUserRequest(username, password, role)
  PATCH /auth/users/{user_id} → UserResponse — require_admin — body: UpdateUserRequest(role?, is_active?)
  DELETE /auth/users/{user_id} → 204 — require_admin — cannot delete yourself
  POST /auth/users/me/change-password — any authenticated — body: ChangePasswordRequest(old, new)

  Pydantic schemas to add to backend/auth/models.py:
    UserResponse(id, username, role, is_active, created_at) — never expose hashed_password
    CreateUserRequest(username, password, role)
    UpdateUserRequest(role?, is_active?)
    ChangePasswordRequest(old_password, new_password)

STEP 6 — Seed script:
Create scripts/migrations/seed_users.py:
  Standalone script (python scripts/migrations/seed_users.py).
  Reads ADMIN_PASSWORD, VIEWER_PASSWORD from env.
  Calls seed_default_users() via asyncio.run().
  Prints Created / Already exists for each user.

STEP 7 — Frontend (admin panel in Settings):
Create apps/web/components/settings/UserManagementPanel.tsx:
  Visible only when role=admin (read from JWT claim in localStorage).
  Table of users (username, role, active, created date).
  Invite User dialog: username + role selector + temporary password.
  Toggle active/inactive per row.
  Change own password form.

Modify apps/web/components/settings/SettingsView.tsx:
  Add UserManagementPanel below Section B (User Preferences),
  rendered conditionally when the decoded JWT role === 'admin'.

STEP 8 — Tests:
Create tests/unit/test_user_store.py (use in-memory SQLite async session):
  test_create_user_hashes_password
  test_get_user_by_username_returns_none_for_unknown
  test_update_user_role
  test_delete_user
  test_seed_is_idempotent

Create tests/integration/test_user_management.py:
  test_list_users_requires_admin
  test_create_user_as_admin
  test_create_user_as_viewer_returns_403
  test_change_password_with_wrong_old_password_returns_400
  test_delete_self_returns_400

VERIFY:
  pytest -q → 240+ passed, 0 failed.
  next build → clean (15+ static pages).
  tsc --noEmit → 0 errors.
  next lint → 0 warnings.
  POST /auth/login still works with seeded admin credentials.
  GET /auth/users returns 200 for admin token, 403 for viewer token.
Update PROJECT_MEMORY.md §13 Change Log with one entry.
```
You are working on ParkTwin AI. Read PROJECT_MEMORY.md §17 and §19.
Create GitHub Actions workflows for CI/CD.
Do NOT modify any application code, API, DB schema, or module logic.

CREATE .github/workflows/ with these files:

.github/workflows/backend-ci.yml:
   name: Backend CI
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5 with python-version '3.12'
         - run: pip install -e .[dev]
         - run: python -m pytest tests/ -q --tb=short
         - run: python -m compileall backend/ engine/ modules/ shared/ -q

.github/workflows/frontend-ci.yml:
   name: Frontend CI
   on: [push, pull_request]
   jobs:
     build-and-test:
       runs-on: ubuntu-latest
- `User` ORM model in `backend/database/models.py`.
- Alembic migration for `users`.
- `backend/auth/user_store.py` replacing `hardcoded_users.py`.
- Admin CRUD endpoints and password management.
- Frontend: Admin panel for user management.

---

## QUICK REFERENCE: Pre/Post Phase Checklist

**Before starting ANY phase:**
- [ ] Read PROJECT_MEMORY.md in full
- [ ] Verify prerequisites from the phase description are complete
- [ ] Run `.\.dev.ps1 backend` — confirm container healthy
- [ ] Run `.\.dev.ps1 test` — confirm current baseline (240+ passing)
- [ ] Run `cd apps/web && next build` — confirm clean
- [ ] Run `tsc --noEmit` — confirm 0 errors
- [ ] Run `next lint` — confirm 0 warnings/errors
- [ ] Run `cd apps/web && npm run test` — confirm Vitest 81+ passing

**After completing ANY phase:**
- [ ] All backend tests still passing (240+ backend + all new tests via `.\.dev.ps1 test`)
- [ ] Frontend: next build + tsc --noEmit + next lint + npm run test all clean
- [ ] PROJECT_MEMORY.md §13 updated with a change log entry
- [ ] Any new duplicate patterns documented in DUPLICATE_REGISTRY.md
- [ ] No new secret/credential committed
- [ ] No new parallel implementation of an existing capability
- [ ] **NEVER** run `docker compose up --build` — use `.\.dev.ps1 rebuild` only if pyproject.toml changed

---

## IMMEDIATE FIXES (No Prompt Needed)


| Fix | File | Action |
|-----|------|--------|
| Pin torch version | `pyproject.toml` + `requirements.txt` | Change `torch>=2.1.0` to `torch>=2.1.0,<3.0.0` |
| Add reportlab to deps | `pyproject.toml` | Add `reportlab>=4.0` to dependencies |
| Disable `/docs` in production | Nginx/Caddy config | Block `/docs` and `/redoc` at proxy |
| Fill contact addresses | Community files | Replace *@example.com with real addresses |
| Fix §23 numbering gap | `PROJECT_MEMORY.md §23` | Rename §23.3 → §23.2, §23.4 → §23.3 (skips 23.2 currently) |

---

> **This file is the companion to `PROJECT_MEMORY.md`.**
> PROJECT_MEMORY records WHAT EXISTS. PROJECT_FUTURE records WHAT IS PLANNED.
> Update this file after each phase is completed — mark with ✅ and completion date.
> Last updated: 2026-07-29 (Phase 14 CI/CD dropped — private project; Phases 14–18 replaced with practical next improvements: D12 fix, E2E tests, Mobile completion, Multi-camera parallel processing, Real user management)

