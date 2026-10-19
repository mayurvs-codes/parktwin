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

## 9. Acceptance checklist (Three Explicit Honesty Groups)

### Group 1: Proven by Automated Tests
- [x] **[PASS] Slot ID Canonicalization:** SP-XX canonical across 2D, 3D, DB, Nav Graph; IDs and coordinates match without alias tables — [`docs/SLOT_ID_MAP.md`](file:///docs/SLOT_ID_MAP.md), [`tests/unit/test_slot_id_consistency.py`](file:///tests/unit/test_slot_id_consistency.py) (5/5 passed).
- [x] **[PASS] Single Vehicle Gateway & Camera Invariants:** Facility geometry has exactly 1 vehicle gateway (`ACCESS_POINT_B2` with entry `CAM-01` and exit `CAM-16`), `CAM-03` role is strictly `PATH/PARKING`, `CAM-16` role is strictly `EXIT`, and all 16 cameras are `status: "unconfigured"` at runtime — [`tests/unit/test_camera_registry.py`](file:///tests/unit/test_camera_registry.py) (6/6 passed).
- [x] **[PASS] Twin Selection & Occupancy Parity:** 2D and 3D scenes share identical slot IDs, selection states, and occupancy statuses — [`apps/web/e2e/parktwin-3d-voice-violation.spec.ts`](file:///apps/web/e2e/parktwin-3d-voice-violation.spec.ts) (Scenario 4).
- [x] **[PASS] 3D Fallback to 2D:** Simulated WebGL context crash renders user-friendly fallback banner and restores usable 2D vector twin — [`apps/web/components/digital-twin/Twin3DErrorBoundary.tsx`](file:///apps/web/components/digital-twin/Twin3DErrorBoundary.tsx), Playwright Scenario 5.
- [x] **[PASS] Pipeline End-to-End Wiring:** Backend authoritative event bus forwards tracker output -> BayEntryDetector -> ViolationEngine -> VoiceService -> WebSocket manager -> UI voice queue — [`docs/PIPELINE_CALLPATH.md`](file:///docs/PIPELINE_CALLPATH.md), [`tests/integration/test_pipeline_voice_violation.py`](file:///tests/integration/test_pipeline_voice_violation.py).
- [x] **[PASS] Voice Assignment Announcement:** ANPR vehicle ingress triggers route computation and spoken turn-by-turn guidance containing assigned bay ID — [`modules/integration_layer/services/integration_service.py`](file:///modules/integration_layer/services/integration_service.py), [`tests/integration/test_pipeline_voice_violation.py`](file:///tests/integration/test_pipeline_voice_violation.py), Playwright Scenario 1.
- [x] **[PASS] Wrong-Bay Immediate Spoken Warning:** Entering an unassigned bay triggers immediate `WRONG_BAY_ENTRY_WARNING` with spoken audio; dedup ensures speech occurs exactly once — [`modules/integration_layer/voice/service.py`](file:///modules/integration_layer/voice/service.py), [`docs/evidence/3d-voice-violation/announcement_log.json`](file:///docs/evidence/3d-voice-violation/announcement_log.json), Playwright Scenario 2.
- [x] **[PASS] Drive-Past & Adjacent Lane Suppression:** Aisle transit past bays produces 0 false-alarm violation events — [`tests/unit/test_bay_entry.py`](file:///tests/unit/test_bay_entry.py) (`test_drive_past_along_aisle_produces_no_event`).
- [x] **[PASS] Correct Bay Entry Generates No Warning:** Parking in assigned bay emits entry confirmation without violation — [`tests/unit/test_violations.py`](file:///tests/unit/test_violations.py), Playwright Scenario 1.
- [x] **[PASS] 10-Minute Escalation & 8-Minute Duration Stage:** Injectable clock tests verify 480s visual/admin warning (speech suppressed by default per `voice.announce_duration_warning=False`), 599s no escalation, 601s single `WRONG_BAY_ESCALATED`, leave before 600s resolves without violation — [`tests/unit/test_violations.py`](file:///tests/unit/test_violations.py), [`tests/unit/test_voice_service.py`](file:///tests/unit/test_voice_service.py), Playwright Scenario 3 (backend time-acceleration API hook).
- [x] **[PASS] Relocation & Early Departure:** Relocation from Bay A to Bay B resets timer; early exit closes session cleanly — [`tests/unit/test_violations.py`](file:///tests/unit/test_violations.py).
- [x] **[PASS] Voice Failure Isolation:** Voice exceptions never interrupt parking state updates — [`tests/unit/test_voice_service.py`](file:///tests/unit/test_voice_service.py) (`test_voice_exception_never_raises`).
- [x] **[PASS] Frontend Suite Regression:** All 33 Vitest test files pass (258 unit tests green).

### Group 2: Proven on Recorded Footage Only
- [x] **[PASS] Replay Pipeline Execution on Real Tracker Output:** Real CCTV tracks (pixel bboxes, zero floor coordinates) fed through `modules/parking_intelligence/engine.py` using bottom-edge pixel footprint against image-space bay polygons — [`tests/integration/test_replay_bay_entry_real_tracks.py`](file:///tests/integration/test_replay_bay_entry_real_tracks.py).
- [x] **[PASS] Evaluated on One Unregistered Clip Only:** Footage source is `videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4` (on-screen overlay `B2-Cam 5`), extracted via YOLOv8m + ByteTrack into `data/annotations/real_cctv_tracks_camera10.json` (150 frames, 5 tracks).
- [x] **[PASS] Replay Bay Polygons Defined from Visible Markings:** Polygons follow visible painted floor dividing lines and yellow transverse boundary (`configs/replay_bay_polygons.yaml`, evidence image `configs/cam10_bay_polygons_evidence.jpg`).
- [!] **[REGRESSION SNAPSHOT ONLY]** Assertions in `test_replay_bay_entry_real_tracks.py` are strictly regression snapshots of current detector output to catch pipeline execution regressions. **No human-labelled accuracy measurement exists yet.**

### Group 3: Not Demonstrated
- [ ] **[NOT DEMONSTRATED] Live Real-Video Detection:** Cannot compute floor coordinates from live video streams without guessing, as all 16 facility cameras lack surveyed physical calibration (`status: "unconfigured"` in `configs/camera_calibration.yaml`).
- [ ] **[NOT DEMONSTRATED] Calibrated Floor Positions from Video:** Zero physical survey point correspondences exist in the repository; no metric homography matrices are available for runtime live cameras.
- [ ] **[BLOCKED] Measured Real CCTV Accuracy (Precision / Recall / F1):** Real CCTV benchmark in `scripts/eval_bay_entry.py --mode real` is BLOCKED pending operator hand-labelling via `scripts/label_bay_entries.py` into `data/annotations/cctv_bay_entry_ground_truth.csv`.
- [ ] **[NOT DEMONSTRATED] CAM-16 Physical Exit Footage:** No physical CCTV archive recording exists for the egress gateway camera `CAM-16` at `ACCESS_POINT_B2`.

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
