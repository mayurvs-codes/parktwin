# ParkTwin AI — Build Plan: 3D Twin + Voice Navigation + Early Wrong-Bay Warning

**Audience:** Antigravity (AI coding agent). Execute phase by phase. Do not skip exit criteria.
**Branch:** `prototype-3day` (work on a new branch off it: `feat/3d-voice-violation`).
**Goal:** Extend the existing system with (1) a unified 2D/3D digital twin, (2) automatic spoken navigation after ANPR + assignment, (3) an immediate wrong-bay warning *before* parking completes — while keeping the existing 10-minute long-stay escalation intact.

---

## 0. Hard rules (read first)

1. **Reuse, don't rebuild.** No new rendering engine, DB, ANPR pipeline, or backend. Three.js + React Three Fiber + drei, Zustand, TanStack Query, FastAPI, and the WebSocket manager are already installed.
2. **Backend is the single source of truth** for assignments, occupancy, sessions, violations. Frontend stores only mirror it.
3. **Never fabricate** geometry, camera positions, vehicle movement, or states. Unknown → show "unknown/unconfigured".
4. **Label data honestly:** every runtime state is one of `live | replay | demo | unavailable | unconfigured`. Recorded video is never "live".
5. **Do not break existing behaviour.** Run the baseline (Phase 0) first and re-run it after every phase. The following must stay green: `tests/unit/test_duration.py`, `test_violations.py`, `test_navigation.py`, `test_vehicle_navigation.py`, `test_journey.py`, `test_slot_mapper.py`, `test_slot_websocket.py`, `test_camera_designation.py`, and `apps/web` vitest suite.
6. **The working tree has ~83 uncommitted paths.** Before any change: `git status`, then commit the existing work in logical chunks on a checkpoint commit (or stash) so the baseline is recoverable. Do not discard anyone's changes. Do not add the `videos/` (14 GB), `*.db`, or `*.pt` files to git.
7. Warning vs escalation are **separate events**: `WRONG_BAY_ENTRY_WARNING` (immediate) ≠ `WRONG_BAY_ESCALATED` (10 min, existing rule).
8. Voice output failure must never corrupt parking/violation state (fire-and-forget, errors logged).
9. Don't log full plate numbers at INFO level; mask (e.g. `KA05***565`).

---

## 1. What already exists (verified in repo — do NOT recreate)

| Capability | Existing location |
|---|---|
| FastAPI app wiring | `backend/app/app.py`; routers in `backend/api/routers/` (`anpr, cameras, journey, parking, prototype, streams, vehicles, videos, health, settings`) |
| Navigation graph + Dijkstra, `compute_route`, `compute_vehicle_route`, `_generate_directions` | `backend/services/navigation_service.py` |
| Journey/ANPR/replay/video services | `backend/services/{journey,anpr,replay,video_library,video_processing}_service.py` |
| 10-min long-stay rule (`PARKING_DURATION_THRESHOLD_SECONDS = 600`, `evaluate_long_stay_alert`) | `modules/parking_intelligence/duration/duration_tracker.py` |
| Violation engine | `modules/parking_intelligence/violations/violation_engine.py` |
| Vehicle↔slot mapping, occupancy, sessions | `modules/parking_intelligence/{mapping,occupancy,sessions,slot_detection}` |
| Tracking (ByteTrack) / detection / OCR | `modules/vehicle_recognition/*` |
| WebSocket broadcast | `modules/integration_layer/websocket/manager.py`, event bus in `integration_layer/events` |
| Deterministic demo | `run_demo.py --scenario monday --reset` |
| 2D twin | `apps/web/components/digital-twin/{TwinCanvas2D,FacilityMap,TwinSlot2D,...}.tsx` |
| **3D twin (partial)** | `apps/web/components/digital-twin/{TwinCanvas3D,TwinSlot3DMesh,TwinVehicle3DMesh}.tsx` and `apps/web/components/3d-zone/*` (+ route `apps/web/app/3d-zone`) |
| Canonical geometry | `apps/web/components/digital-twin/facilityGeometry.ts`, `twinConfig.ts`, `ArchitecturalBlueprintLayers.tsx` |
| Frontend state | `apps/web/store/{useDigitalTwinStore,useDemoMovieStore,useSharedDemoState,useJourneyStationStore,...}.ts` |
| **No TTS exists** (grep for `speechSynthesis` found nothing) | — build new |

**Key implication:** a partial 3D twin already exists in two places (`TwinCanvas3D` and `3d-zone`). Phase 1 must **consolidate**, not add a third.

---

## 2. Phase 0 — Audit & baseline (no feature code)

Tasks:
1. Create checkpoint commit/stash of current working tree (see rule 6).
2. Run and record results in `docs/baseline/BASELINE_REPORT.md`:
   - Backend: `pytest tests -q` (note failures, don't fix unrelated ones).
   - Frontend (`apps/web`): `npm run lint`, `npx tsc --noEmit`, `npm test`.
   - Docker/dev boot: backend health endpoint + `http://localhost:3000/dashboard` + `/digital-twin` + `/3d-zone`.
3. Write `docs/baseline/ARCHITECTURE_INVENTORY.md` answering:
   - Which of `TwinCanvas3D` vs `3d-zone` is more complete? Which data does each consume?
   - Is there one canonical geometry module? Where do slot ids (`P01..P10`) and coordinates come from? Do 2D and 3D read the same one?
   - What coordinate system do tracked-vehicle positions use (pixel space per camera? floor-plan metres)? Is there a camera→floor homography anywhere (`configs/`, `camera_designation`, `cameras.py`)?
   - Does the tracker output per-frame bbox centroids/foot points reachable from the violation engine?
   - How are violations currently created and broadcast (event names, payload shape)? Where is relocation/exit/reset handled?
   - What events does the WebSocket manager emit today (list them with payload schema)?
4. Write `docs/baseline/GAP_LIST.md`: what is missing for each of the 3 features.

**Exit:** the three docs exist; baseline test results are recorded; no source code changed.

---

## 3. Phase 1 — Canonical facility model + unified 2D/3D twin

Tasks:
1. Make `facilityGeometry.ts` (or a new framework-agnostic `facility.json` + typed loader it wraps) the **only** geometry source: bays (id, polygon, centroid, zone), aisles, junctions, entry/exit, restricted zones, verified cameras. Geometry must be renderer-independent (plain data, metres).
2. Reconcile bay geometry against the floor plan (`floorplan_page_*.png`, `apps/web/public/cad-floorplan.png`). Output `docs/baseline/GEOMETRY_RECONCILIATION.md` listing every bay: id, source, confidence, uncertainty. Mark uncertain items `verified: false`; never invent.
3. Make the navigation graph nodes (backend `navigation_service.py`) reference the same bay/junction ids as the frontend geometry. Add a backend test asserting every slot id in geometry exists in the nav graph and vice-versa. If the backend can't import the TS file, export a single JSON (e.g. `shared/facility_geometry.json`) consumed by both.
4. Consolidate 3D: pick the more complete implementation as the base (likely `TwinCanvas3D` + `TwinSlot3DMesh`/`TwinVehicle3DMesh`), port any missing features from `3d-zone/*`, keep `/3d-zone` route as a thin wrapper or redirect. Do not leave two divergent scenes.
5. 3D scene content: ground, bays + labels, aisles/junctions, entry/exit, obstacles (only where in geometry), vehicles, occupancy colouring, route polyline (`ZoneRoute3D` logic), verified cameras, violation highlight.
6. Controls: orbit/pan/zoom, fit-to-screen, reset view, 2D/3D toggle that **preserves selection** (selected slot/vehicle id lives in `useDigitalTwinStore`, not in the renderer).
7. Both views subscribe to the same store slice (occupancy, vehicles, route, violations). No renderer-local copies of state.
8. **Fallback:** wrap 3D in an error boundary + WebGL feature check; on failure show 2D with a visible notice. Lazy-load the 3D chunk (`next/dynamic`, `ssr: false`).
9. Performance: instanced meshes for bays; no per-frame React re-renders (use refs/`useFrame`); cap pixel ratio; document FPS on the demo laptop in the report.

Tests: vitest — geometry has unique ids, polygons closed/non-degenerate, every bay in nav graph; store→2D and store→3D selectors return identical bay/occupancy sets; toggle preserves selection.

**Exit:** user can toggle 2D⇄3D; same slot ids/occupancy/selection in both; 3D failure falls back to 2D; one geometry source.

---

## 4. Phase 2 — Vehicle→bay entry detection (backend)

New module (single owner): `modules/parking_intelligence/bay_entry/` with `detector.py`, `config.py`, `events.py`. Do **not** duplicate occupancy logic—call into existing occupancy/slot_mapper for state.

Design:
1. **Input:** per-frame tracked vehicles `{track_id, bbox, camera_id, ts}`. Convert to floor coordinates using a per-camera homography from config (`configs/` — add `camera_calibration.yaml`; if a camera has no calibration, it is `unconfigured` and emits no entry events — never guess).
2. **Reference point:** vehicle footprint = bottom-centre of bbox projected to floor; entry measured as **fraction of footprint polygon overlapping the bay polygon** (shapely) rather than a single point.
3. **State machine per (track_id, bay_id):** `OUTSIDE → APPROACHING → ENTERING → INSIDE → LEAVING → OUTSIDE`.
   - `ENTERING` confirmed when overlap ≥ `ENTRY_OVERLAP_MIN` (default 0.35) for ≥ `ENTRY_CONFIRM_MS` (default 800 ms / N frames) **and** velocity vector is oriented toward the bay (distinguishes drive-past from entry) **and** speed below `ENTRY_MAX_SPEED`.
   - Hysteresis on exit (`LEAVE_OVERLAP_MAX` 0.15 for `LEAVE_CONFIRM_MS`).
   - Track loss → state `UNKNOWN`, no events emitted; resume cleanly if track re-appears (or ID-switch handling via existing tracker).
4. **Events (typed, with idempotent `event_id = f"{track_id}:{bay_id}:{episode_n}"`):** `BAY_ENTRY_CONFIRMED`, `BAY_OCCUPIED`, `BAY_EXIT_CONFIRMED`. Publish on the existing event bus; include `source: live|replay|demo`.
5. All thresholds in `configs/settings.yaml` under `bay_entry:`, env-overridable.
6. Replay support: detector consumes frames from the replay/video-library path with the same code path as live; stamp `source=replay`.

Tests (`tests/unit/test_bay_entry.py`, pytest, synthetic tracks — no video needed):
- drive-past along aisle adjacent to bay → no event
- straight entry → exactly one `BAY_ENTRY_CONFIRMED`
- jittery bbox around threshold → no flapping (hysteresis)
- track dropout mid-entry → no false event; no duplicate on reacquire
- uncalibrated camera → no events, status `unconfigured`
- two vehicles, adjacent bays → independent episodes

Also add a small offline script `scripts/eval_bay_entry.py` that runs the detector on a recorded clip + hand-labelled CSV of entries and prints precision/recall. Include results in the final report. (Labelling a few clips by hand is required—flag to the user if clips/labels are missing rather than faking results.)

**Exit:** entry/occupied/exit events fire reliably on synthetic + at least one real labelled clip; passes drive-by test.

---

## 5. Phase 3 — Immediate wrong-bay warning + preserved 10-min escalation

Extend (not replace) `violation_engine.py` and keep `duration_tracker.py` semantics.

1. Subscribe violation engine to `BAY_ENTRY_CONFIRMED`. Look up the vehicle's assigned bay (via session/assignment, keyed by plate/vehicle id bound to `track_id` by the ANPR association).
2. If `target_bay != assigned_bay` → open a **violation episode** `{episode_id, vehicle_id, assigned_bay, actual_bay, started_at, state: WARNED}` and emit `WRONG_BAY_ENTRY_WARNING` **once per episode**.
3. While vehicle remains in the wrong bay, run the existing duration logic against the *episode* start. At 600 s (`PARKING_DURATION_THRESHOLD_SECONDS`, do not hardcode a new value) emit `WRONG_BAY_ESCALATED` through the existing alert workflow.
4. Resolution rules (each emits `WRONG_BAY_RESOLVED` with `reason`):
   - leaves the wrong bay (`BAY_EXIT_CONFIRMED`) → resolved, timer stops
   - enters assigned bay → resolved, **timer discarded**; new session starts fresh
   - facility exit → resolved, **no escalation if < 10 min**
   - demo reset → all episodes cleared
5. Moving wrong-bay A → wrong-bay B: close episode A, open episode B with fresh timer and a fresh warning.
6. Correct bay → no warning, normal session; long-stay alert for authorised bays stays a separate event type (`LONG_STAY_ALERT`) and must not be conflated.
7. Unassigned/unknown vehicle (no plate match): do **not** warn wrong-bay (no assignment to compare); emit `UNASSIGNED_VEHICLE_IN_BAY` info event only.
8. Persist episodes (existing violation table/migration via alembic if a column is needed; add migration, don't alter schema ad hoc).
9. API: extend `/parking` (or violations route) with `GET /violations/episodes?active=true`. Update OpenAPI docs.

Tests (extend `tests/unit/test_violations.py`, `test_duration.py`):
- wrong entry → exactly one warning; repeated frames → still one
- stays 600 s (fake clock) → one escalation
- leaves at 5 min → resolved, no escalation
- A→B relocation → timer reset
- wrong→assigned → resolved, no carry-over
- exit before threshold → no violation
- authorised long-stay > 10 min → `LONG_STAY_ALERT` only
- all **pre-existing** tests in those files unchanged and passing

**Exit:** all above pass; existing violation/duration tests green.

---

## 6. Phase 4 — Voice assistant (automatic announcements)

Architecture: backend decides *what* to say (message + event id + priority); an output adapter decides *how* it is voiced. Keep them separate so the voice channel is swappable.

Backend — new `modules/integration_layer/voice/` (or `backend/services/voice_service.py`, single owner):
1. `VoiceMessage {message_id, event_id, kind: ASSIGNMENT|ROUTE_STEP|WRONG_BAY_WARNING|ERROR, text, priority, lang, vehicle_id, ts, source}`.
2. Triggers (subscribe to the event bus):
   - `VEHICLE_ASSIGNED` (after ANPR confirm + assignment validated + route computed): "Vehicle recognised. Your designated parking space is B12. <route steps>". Text is **generated from the real assignment and `compute_vehicle_route` directions** — no canned destination.
   - `WRONG_BAY_ENTRY_WARNING`: "Warning! This is not your designated parking space. Please move to space B12." (use the real assigned id)
   - Failure cases: unknown plate → "Vehicle not recognised. Please contact the attendant."; no assignment → "No parking space is assigned. Please contact the attendant."; bay unavailable → "Your assigned space is currently unavailable. Please contact the attendant."; no route → announce destination only, no invented directions.
3. **Dedup/cancellation:** idempotency by `event_id` (set with TTL); per-vehicle cooldown for the same `kind`; higher priority warning pre-empts lower-priority route speech; new route cancels stale route speech; superseded/resolved episode cancels pending warning.
4. Condense directions: collapse consecutive "continue straight" steps; max ~3 sentences per announcement.
5. Emit `VOICE_ANNOUNCEMENT` over the existing WebSocket with the `VoiceMessage`, plus `VOICE_CANCEL` for cancellations. Persist an announcement log (event id, kind, delivered?) for tests/evidence. Voice failures are caught and logged; they never raise into the parking pipeline.

Frontend — new `apps/web/services/voice/` + `apps/web/store/useVoiceStore.ts`:
1. Output adapter using browser **Web Speech API** (`speechSynthesis`) as the default (no new dependency). Interface `VoiceOutput { speak(msg), cancel(id), isAvailable() }` so a server-side TTS/in-car adapter can be plugged in later.
2. Browsers block autoplay audio: add an explicit one-time **"Enable voice"** control (kiosk/driver screen) that unlocks speech; show state: `enabled | blocked | unavailable | muted`. If unavailable, show the text on screen (visible fallback) and log it.
3. Settings (existing `settings` page): enable/disable, voice, rate, volume, language, test button. Persist per-device.
4. UI: voice status chip in `DigitalTwinStatusBar`, an announcement log panel (text + time + delivered/blocked) — also the evidence source for tests.
5. Driver-facing screen: a minimal `/user` route view (already exists under `apps/web/app/user`) that shows current instruction large and speaks automatically; no interaction needed once enabled.

Tests:
- backend: message text built from real assignment/route; dedup by event id; cooldown; priority pre-emption; each failure-case message; voice exception doesn't affect state
- frontend (vitest, mock `speechSynthesis`): speaks on `VOICE_ANNOUNCEMENT`, ignores duplicates, cancels on `VOICE_CANCEL`, shows text fallback when unavailable/blocked

**Exit:** ANPR→assignment produces the correct spoken destination + route; wrong-bay produces one spoken warning; frames/duplicates never cause repeat speech.

---

## 7. Phase 5 — End-to-end integration & operator UI

1. Wire everything through the existing event bus + WebSocket (one event contract doc: `docs/api/EVENTS.md` listing every event name, payload schema, source label).
2. Digital twin: show vehicle position (only where calibrated data exists), destination bay, route (2D+3D), assigned vs actual bay, violation state (warned / escalated / resolved) with distinct colours; click vehicle → drawer shows plate (masked per role), assigned bay, actual bay, episode timer, route.
3. Single occupancy truth across Dashboard, Parking page, 2D, 3D (one selector/hook; add a test comparing counts across all four consumers).
4. Source badge on every live panel: `LIVE | REPLAY | DEMO | UNAVAILABLE | UNCONFIGURED` (extend `DigitalTwinStatusBar`). Replay/demo events carry `source` from the backend, never inferred by the UI.
5. Role-based access for plate data and destructive admin/reset actions (reuse existing auth; add confirmation dialog for reset).
6. Retention: configurable cleanup job for announcement logs / episodes / plate crops (setting + scheduled task + test).
7. Add the new wrong-bay demo scenario to `run_demo.py` (e.g. `--scenario wrong-bay`) deterministic and resettable; keep `monday` unchanged and passing.

**Exit:** full flow runs through the existing app; no competing state; existing pages unaffected.

---

## 8. Phase 6 — Validation & demo

1. Backend: `pytest tests -q`; frontend: lint, `tsc --noEmit`, `npm test`. Compare against Phase 0 baseline—no new failures.
2. Add Playwright e2e (use the Playwright setup if present; otherwise add `apps/web/e2e/` with `@playwright/test` as the only new dev dependency). Scenarios:
   - correct vehicle: plate recognised → announcement text appears in log → route in 2D and 3D → enters assigned bay → no warning
   - wrong bay: warning logged exactly once → episode visible → leave → resolved, timer stopped
   - wrong bay 10 min (fake clock / time-accelerated test hook, clearly labelled) → escalation
   - 2D⇄3D toggle keeps selection & occupancy equal
   - 3D disabled (force WebGL failure) → 2D fallback notice
   - voice unavailable → text fallback shown
   - reset → clean state; exit → session closed
3. Tests must assert **outcomes** (announcement text contents, episode state, counts), not just element presence.
4. Capture evidence to `docs/evidence/3d-voice-violation/` (screenshots, announcement logs, test output).
5. Write `docs/KNOWN_LIMITATIONS.md` (ANPR accuracy, calibration coverage, browser audio unlock, no real in-car audio channel, which results came from replay/simulation).
6. Write `DEMO_SCRIPT_3D_VOICE.md` following the 14-step scenario from the spec; every simulated step labelled replay/simulation.

**Exit:** all acceptance criteria below are met, or failures are documented and excluded from "done" claims.

---

## 9. Acceptance checklist (tick each with evidence link)

**Twin**
- [x] **[PASS]** One geometry source feeds 2D, 3D and the nav graph; ids match — [`docs/SLOT_ID_MAP.md`](file:///docs/SLOT_ID_MAP.md), [`tests/unit/test_slot_id_consistency.py`](file:///tests/unit/test_slot_id_consistency.py) (5/5 passed)
- [x] **[PASS]** Same slot ids/occupancy/selection in 2D and 3D — [`apps/web/e2e/parktwin-3d-voice-violation.spec.ts`](file:///apps/web/e2e/parktwin-3d-voice-violation.spec.ts) (Scenario 4)
- [x] **[PASS]** Unknown geometry/cameras shown as unconfigured, not invented — [`configs/camera_calibration.yaml`](file:///configs/camera_calibration.yaml), [`docs/CALIBRATION_REQUEST.md`](file:///docs/CALIBRATION_REQUEST.md), [`tests/unit/test_bay_entry.py`](file:///tests/unit/test_bay_entry.py)
- [x] **[PASS]** 3D failure → usable 2D — [`apps/web/components/digital-twin/Twin3DErrorBoundary.tsx`](file:///apps/web/components/digital-twin/Twin3DErrorBoundary.tsx), [`apps/web/e2e/parktwin-3d-voice-violation.spec.ts`](file:///apps/web/e2e/parktwin-3d-voice-violation.spec.ts) (Scenario 5)

**Voice**
- [x] **[PASS]** Assignment announcement built from real bay + route — [`modules/integration_layer/services/integration_service.py`](file:///modules/integration_layer/services/integration_service.py), [`tests/integration/test_pipeline_voice_violation.py`](file:///tests/integration/test_pipeline_voice_violation.py)
- [x] **[PASS]** Wrong-bay → exactly one spoken warning — [`docs/evidence/3d-voice-violation/announcement_log.json`](file:///docs/evidence/3d-voice-violation/announcement_log.json), [`modules/integration_layer/voice/service.py`](file:///modules/integration_layer/voice/service.py)
- [x] **[PASS]** No repeats from duplicate frames; failure messages for unknown/unassigned/unavailable — [`scripts/record_voice_announcements.py`](file:///scripts/record_voice_announcements.py), [`docs/evidence/3d-voice-violation/announcement_log.json`](file:///docs/evidence/3d-voice-violation/announcement_log.json) (`DUPLICATE_SUPPRESSION_AUDIT`)
- [x] **[PASS]** Voice failure does not alter parking state — [`tests/unit/test_voice_service.py`](file:///tests/unit/test_voice_service.py) (`test_voice_exception_never_raises`)

**Violations**
- [x] **[PASS]** Wrong-bay detected before parking completes; passing-by doesn't trigger — [`tests/unit/test_bay_entry.py`](file:///tests/unit/test_bay_entry.py) (`test_drive_past_along_aisle_produces_no_event`), [`tests/integration/test_pipeline_voice_violation.py`](file:///tests/integration/test_pipeline_voice_violation.py)
- [x] **[PASS]** Correct bay → no warning — [`tests/unit/test_violations.py`](file:///tests/unit/test_violations.py) (`test_authorised_long_stay_separate_from_wrong_bay`)
- [x] **[PASS]** 10-min escalation preserved (uses existing constant) — [`modules/parking_intelligence/violations/violation_engine.py`](file:///modules/parking_intelligence/violations/violation_engine.py) (`PARKING_DURATION_THRESHOLD_SECONDS = 600.0`)
- [x] **[PASS]** Relocation resets timer; early exit → no violation — [`tests/unit/test_violations.py`](file:///tests/unit/test_violations.py) (`test_relocation_a_to_b_resets_timer`, `test_leaves_at_5_min_resolved_no_escalation`)
- [x] **[PASS]** `LONG_STAY_ALERT` distinct from wrong-bay — [`modules/parking_intelligence/violations/violation_engine.py`](file:///modules/parking_intelligence/violations/violation_engine.py)

**Integration**
- [x] **[PASS]** Backend authoritative; WS updates reach UI — [`docs/PIPELINE_CALLPATH.md`](file:///docs/PIPELINE_CALLPATH.md), [`tests/integration/test_pipeline_voice_violation.py`](file:///tests/integration/test_pipeline_voice_violation.py), [`apps/web/hooks/useDigitalTwinSocket.ts`](file:///apps/web/hooks/useDigitalTwinSocket.ts)
- [x] **[PASS]** Live/replay/demo/unavailable/unconfigured labels everywhere — [`apps/web/components/digital-twin/DigitalTwinStatusBar.tsx`](file:///apps/web/components/digital-twin/DigitalTwinStatusBar.tsx), [`apps/web/components/user/UserDashboardView.tsx`](file:///apps/web/components/user/UserDashboardView.tsx)
- [x] **[PASS]** Existing pages, `monday` scenario, reset behave as before — [`run_demo.py`](file:///run_demo.py), [`tests/unit/test_slot_id_consistency.py`](file:///tests/unit/test_slot_id_consistency.py)
- [x] **[PASS]** Phase-0 baseline: no new failing tests — Pytest (287 passed, 2 skipped), Vitest (258 passed), Playwright (7 passed)

**Real CCTV Evaluation**
- [ ] **[BLOCKED]** Real CCTV precision/recall benchmark against human ground truth — [`scripts/eval_bay_entry.py --mode real`](file:///scripts/eval_bay_entry.py), [`docs/KNOWN_LIMITATIONS.md`](file:///docs/KNOWN_LIMITATIONS.md). Evaluator tool and tracker outputs (`data/annotations/real_cctv_tracks_camera10.json`) extracted, blocked pending operator annotations via [`scripts/label_bay_entries.py`](file:///scripts/label_bay_entries.py).

---

## 10. Dependency / risk notes for the agent

- **Biggest unknown: camera→floor calibration.** If the repo has no homography, create the calibration config + a small calibration helper script, calibrate only cameras with enough reference points, and ask the user for reference points/measurements for the rest. Do not fabricate coordinates. Without calibration, bay-entry detection must be demonstrated via replay with hand-defined image-space bay polygons for that camera (labelled `replay`).
- **Track↔plate association:** ANPR happens at the entry camera, bay entry at the parking camera. Use the existing journey/cross-camera logic (`journey_service.py`); if the association confidence is low, state it as unknown and don't warn.
- **Hands-free audio:** the prototype uses browser speech output on a device connected to the speaker/car Bluetooth. A real in-car channel is out of scope; document it.
- **Compliance:** campus approval is needed before live camera tests; use recorded footage for development.
- **Line endings:** repo shows LF→CRLF warnings; add `.gitattributes` (`* text=auto`) in a separate commit before large edits.

## 11. Suggested commit sequence

1. `chore: checkpoint existing prototype work` (+ `.gitattributes`)
2. `docs: phase 0 baseline & inventory`
3. `feat(twin): canonical facility geometry shared by 2D/3D/nav`
4. `feat(twin): consolidated 3D scene with 2D fallback`
5. `feat(bay-entry): calibrated bay entry detector + tests`
6. `feat(violations): immediate wrong-bay warning, preserved 10-min escalation`
7. `feat(voice): voice service, WS events, browser TTS adapter`
8. `feat(integration): operator UI, source badges, wrong-bay demo scenario`
9. `test(e2e): playwright acceptance + evidence + limitations report`

Report back after each phase with: files changed, tests run (pass/fail counts), and any deviations from this plan.
