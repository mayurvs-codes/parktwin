# ParkTwin AI — Sprint 2 Actual File Manifest

**Document:** `docs/SPRINT2_FILE_MANIFEST.md`  
**Generated:** 2026-10-19  
**Source:** Exact output from `git show --stat --name-only <sha>` across commits `a35dde8..e9a6d06`.

This document records the exact files modified, added, or deleted in each commit of Sprint 2, replacing any incorrect file paths cited in conversational reports.

---

## 1. Commit `a35dde8`
**Message:** `feat(bay-entry): real cctv image-space replay bay polygons and detector fallback`  
**Actual Files Changed (8 files):**
- `configs/cam10_bay_polygons_evidence.jpg`
- `configs/replay_bay_polygons.yaml`
- `docs/PIPELINE_CALLPATH.md`
- `modules/parking_intelligence/bay_entry/detector.py`
- `modules/parking_intelligence/engine.py`
- `modules/parking_intelligence/mapping/slot_mapper.py`
- `scripts/generate_replay_evidence.py`
- `tests/integration/test_replay_bay_entry_real_tracks.py`

*(Note: The actual detector file is `modules/parking_intelligence/bay_entry/detector.py`, NOT `.../geometry/bay_entry_detector.py`. The actual test file is `tests/integration/test_replay_bay_entry_real_tracks.py`, NOT `.../test_replay_bay_entry.py`.)*

---

## 2. Commit `4db033f`
**Message:** `feat(violations): 8-minute duration warning, clock-injection tests, and test-acceleration hooks`  
**Actual Files Changed (6 files):**
- `backend/api/routers/violations.py`
- `modules/integration_layer/adapters/event_adapter.py`
- `modules/integration_layer/events/bus.py`
- `modules/parking_intelligence/events/event_engine.py`
- `modules/parking_intelligence/violations/violation_engine.py`
- `tests/unit/test_violations.py`

*(Note: The actual router is `backend/api/routers/violations.py`, NOT `backend/app/routes/violations.py`.)*

---

## 3. Commit `8fc805d`
**Message:** `test(e2e): backend-driven websocket verification and speech synthesis dedup assertions`  
**Actual Files Changed (34 files):**
- `apps/web/components/digital-twin/DigitalTwinView.tsx`
- `apps/web/components/user/UserDashboardView.tsx`
- `apps/web/e2e/parktwin-3d-voice-violation.spec.ts`
- `apps/web/hooks/useDigitalTwinSocket.ts`
- `apps/web/store/useDigitalTwinStore.ts`
- `apps/web/store/useSharedDemoState.ts`
- `apps/web/store/useVoiceStore.ts`
- `docs/evidence/3d-voice-violation/e2e/playwright-report.json`
- `docs/evidence/3d-voice-violation/e2e/report/index.html`
- `docs/evidence/3d-voice-violation/e2e/report/data/*.png` (13 artifact screenshot updates)
- `docs/evidence/3d-voice-violation/e2e/test-results/**/*.png` (12 test execution screenshots)

*(Note: No component named `apps/web/components/voice/VoiceOutput.tsx` was touched or exists; voice state in the UI is rendered by `UserDashboardView.tsx` via `useVoiceStore`.)*

---

## 4. Commit `912c7db`
**Message:** `docs(geometry): bay count reconciliation (24 vs 52 vs 58) and unverified bay styling`  
**Actual Files Changed (33 files):**
- `apps/web/components/3d-zone/ParkingBay3D.ts`
- `apps/web/components/3d-zone/types.ts`
- `apps/web/components/digital-twin/FacilityMap.tsx`
- `apps/web/components/digital-twin/TwinLegend.tsx`
- `apps/web/components/digital-twin/TwinSlot2D.tsx`
- `apps/web/components/digital-twin/UnifiedTwinCanvas3D.tsx`
- `docs/baseline/BAY_COUNT_RECONCILIATION.md`
- `docs/evidence/3d-voice-violation/e2e/playwright-report.json`
- `docs/evidence/3d-voice-violation/e2e/report/index.html`
- `docs/evidence/3d-voice-violation/e2e/report/data/*.png` (16 artifact screenshot updates)
- `docs/evidence/3d-voice-violation/e2e/test-results/**/*.png` (8 test execution screenshots)

---

## 5. Commit `51c653b`
**Message:** `docs(cameras): camera registry audit and single gateway assertion test`  
**Actual Files Changed (2 files):**
- `docs/CAMERA_REGISTRY_AUDIT.md`
- `tests/unit/test_camera_registry.py`

---

## 6. Commit `e9a6d06`
**Message:** `docs(audit): honest section 9 checklist audit and limitations matrix`  
**Actual Files Changed (25 files):**
- `PARKTWIN_3D_VOICE_VIOLATION_BUILD_PLAN.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/evidence/3d-voice-violation/e2e/playwright-report.json`
- `docs/evidence/3d-voice-violation/e2e/report/index.html`
- `docs/evidence/3d-voice-violation/e2e/report/data/*.png` (14 artifact screenshot updates)
- `docs/evidence/3d-voice-violation/e2e/test-results/**/*.png` (7 test execution screenshots)
