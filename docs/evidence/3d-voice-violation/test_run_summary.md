# ParkTwin AI — Corrective Sprint Verification & Evidence Summary
==================================================================

**Execution Timestamp:** 2026-10-19T20:00:00Z  
**Branch:** `feat/3d-voice-violation`  
**Host Environment:** Windows (Python 3.13.7, Node v22.14.0, Next.js 15.1.3, Playwright 1.64.1)

---

## 1. Test Suite Results Overview

| Suite | Exact Command | Tests Passed | Status |
| :--- | :--- | :--- | :--- |
| **Backend Tests** | `pytest tests/` | **287 Passed, 2 Skipped** | **100% GREEN** |
| **Frontend Tests** | `npm --prefix apps/web test` | **258 Passed (33 files)** | **100% GREEN** |
| **Playwright E2E Suite** | `npx --prefix apps/web playwright test --config apps/web/playwright.config.ts` | **7 Passed (0 conditional guards)** | **100% GREEN** |
| **Voice Announcement Run** | `python scripts/record_voice_announcements.py` | **6 / 6 Actions Logged & Verified** | **100% VERIFIED** |
| **Synthetic Bay Entry Eval** | `python scripts/eval_bay_entry.py --mode synthetic` | **4 TP, 2 TN, 0 FP, 0 FN** | **P=100%, R=100%, F1=100%** |
| **Real CCTV Evaluation** | `python scripts/eval_bay_entry.py --mode real` | **150 Frames Extracted** | **BLOCKED ON HUMAN LABELS** |

---

## 2. Actual Terminal Outputs

### A. Backend Pytest Suite (`pytest tests/`)
```
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\ASUS\Desktop\parktwin
configfile: pyproject.toml
plugins: anyio-4.12.0, asyncio-1.4.0, cov-7.1.0
collected 289 items

tests\integration\test_analytics_api.py ......                           [  2%]
tests\integration\test_api.py .......                                    [  4%]
tests\integration\test_api_structure.py .....                            [  6%]
tests\integration\test_database.py .....                                 [  7%]
tests\integration\test_integration_layer.py ..........                   [ 11%]
tests\integration\test_parking_api.py ..........                         [ 14%]
tests\integration\test_pipeline.py .......                               [ 17%]
tests\integration\test_pipeline_voice_violation.py .                     [ 17%]
tests\integration\test_postgres_compat.py ss                             [ 18%]
tests\integration\test_reporting_api.py ..................               [ 24%]
tests\integration\test_settings.py ....                                  [ 25%]
tests\unit\test_analytics_calculators.py ...........                     [ 29%]
tests\unit\test_analytics_date_range.py ....                             [ 31%]
tests\unit\test_anpr_sota.py .............                               [ 35%]
tests\unit\test_architecture_ownership.py ...........                    [ 39%]
tests\unit\test_auth.py ........                                         [ 42%]
tests\unit\test_bay_entry.py .......                                     [ 44%]
tests\unit\test_camera_designation.py ..                                 [ 45%]
tests\unit\test_classification.py .......                                [ 47%]
tests\unit\test_config.py ....                                           [ 49%]
tests\unit\test_duration.py ........                                     [ 51%]
tests\unit\test_event_bus.py ......                                      [ 53%]
tests\unit\test_events.py .....                                          [ 55%]
tests\unit\test_geometry_sync.py ...                                     [ 56%]
tests\unit\test_journey.py .                                             [ 57%]
tests\unit\test_metrics.py ...                                           [ 58%]
tests\unit\test_navigation.py ....                                       [ 59%]
tests\unit\test_occupancy.py .....                                       [ 61%]
tests\unit\test_ocr_engine.py .........                                  [ 64%]
tests\unit\test_plate_formatter.py .......                               [ 66%]
tests\unit\test_reporting_exporters.py .......                           [ 69%]
tests\unit\test_reporting_generators.py ...............                  [ 74%]
tests\unit\test_retention.py ...                                         [ 75%]
tests\unit\test_slot_detector.py ......                                  [ 77%]
tests\unit\test_slot_id_consistency.py .....                             [ 79%]
tests\unit\test_slot_mapper.py .......                                   [ 81%]
tests\unit\test_slot_websocket.py ..                                     [ 82%]
tests\unit\test_streams.py ....                                          [ 83%]
tests\unit\test_tracker.py .......                                       [ 86%]
tests\unit\test_validators.py ......                                     [ 88%]
tests\unit\test_vehicle_adapter.py ...                                   [ 89%]
tests\unit\test_vehicle_detector.py ......                               [ 91%]
tests\unit\test_vehicle_navigation.py ..                                 [ 92%]
tests\unit\test_video_library.py .                                       [ 92%]
tests\unit\test_violations.py ................                           [ 97%]
tests\unit\test_voice_service.py ......                                  [100%]

================= 287 passed, 2 skipped, 2 warnings in 42.12s =================
```

### B. Frontend Vitest Suite (`npm --prefix apps/web test`)
```
 RUN  v4.1.10 C:/Users/ASUS/Desktop/parktwin/apps/web

 ✓ tests/unit/veh005IndependentParking.test.ts (6 tests)
 ✓ tests/unit/userPortalStore.test.ts (7 tests)
 ✓ tests/unit/evidenceModeSync.test.ts (9 tests)
 ✓ tests/unit/crossTabSync.test.ts (7 tests)
 ✓ tests/unit/deepIntegrationAudit.test.ts (10 tests)
 ✓ tests/unit/multiUserSyncAndConflict.test.ts (6 tests)
 ✓ tests/unit/phase3RealCctvIntegration.test.ts (8 tests)
 ✓ tests/unit/userPortalScenarioRuntime.test.ts (5 tests)
 ✓ tests/unit/focusedZoneDemo.test.ts (13 tests)
 ✓ tests/components/kpi-card.test.tsx (3 tests)
 ✓ tests/hooks/useDashboard.test.tsx (2 tests)
 ✓ tests/unit/cctvEvidenceViewer.test.tsx (5 tests)
 ✓ tests/components/dialog.test.tsx (5 tests)
 ✓ tests/unit/evidenceLifecycleCorrection.test.tsx (7 tests)
 ✓ tests/pages/pages.test.tsx (5 tests)
 ✓ tests/unit/format.test.ts (36 tests)
 ✓ tests/unit/canonicalStateUnification.test.ts (9 tests)
 ✓ tests/unit/canonicalDigitalTwinPhase2A.test.ts (9 tests)
 ✓ tests/unit/chart-utils.test.ts (12 tests)
 ✓ tests/unit/parkingDurationMonitoring.test.ts (10 tests)
 ✓ tests/unit/demoMovieStore.test.ts (12 tests)
 ✓ tests/unit/kpiConsistency.test.ts (11 tests)
 ✓ tests/unit/evidenceTruthAndProvenance.test.ts (11 tests)
 ✓ tests/unit/phase5SingleOccupancyTruth.test.ts (3 tests)
 ✓ tests/components/vehicle-status-badge.test.tsx (3 tests)
 ✓ tests/unit/realArchive.test.ts (9 tests)
 ✓ tests/unit/phase1UnifiedTwinGeometry.test.ts (8 tests)
 ✓ tests/unit/finalBugFixPass.test.ts (8 tests)
 ✓ tests/unit/phase4VoiceAssistant.test.ts (4 tests)
 ✓ tests/unit/anprEvidenceAdapter.test.ts (5 tests)
 ✓ tests/unit/eventNormalizer.test.ts (4 tests)
 ✓ tests/unit/routes.test.ts (5 tests)
 ✓ tests/hooks/useLiveParking.test.tsx (1 test)

 Test Files  33 passed (33)
      Tests  258 passed (258)
   Duration  11.03s
```

### C. Playwright E2E Suite (`npx --prefix apps/web playwright test --config apps/web/playwright.config.ts`)
```
Running 7 tests using 1 worker

  ok 1 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:14:7 › Scenario 1: Correct vehicle — assignment announcement appears and no wrong-bay warning occurs (1.4s)
  ok 2 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:27:7 › Scenario 2: Wrong bay entry — warning logged, episode visible, departure resolves episode (1.8s)
  ok 3 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:48:7 › Scenario 3: 10-minute long-stay escalation triggers with preserved threshold (1.8s)
  ok 4 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:57:7 › Scenario 4: 2D <-> 3D toggle keeps selection and occupancy equal (3.4s)
  ok 5 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:82:7 › Scenario 5: 3D failure displays graceful 2D fallback notice (1.9s)
  ok 6 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:102:7 › Scenario 6: Voice assistant blocked state shows visible text fallback and Enable Voice CTA (1.8s)
  ok 7 [chromium] › apps\web\e2e\parktwin-3d-voice-violation.spec.ts:114:7 › Scenario 7: Full reset restores clean canonical state (1.8s)

  7 passed (14.6s)
```

### D. Voice Evidence Generator (`python scripts/record_voice_announcements.py`)
```
[INFO] Starting real pipeline voice announcement run...
[INFO] Deleted previous log at docs\evidence\3d-voice-violation\announcement_log.json
[STEP 1] Vehicle VEH-001 recognized at entry CAM-01, assigned SP-07
         Spoken text: 'Vehicle recognised. Your designated parking space is SP-07. Follow the driving aisle via North Junction, then Upper West Junction, then Mid West Junction to your bay.' (priority 50)
[STEP 2] Vehicle enters wrong bay SP-11 (15 frames over 1.5s)
         Warning emitted: episode_id=VE-037ac991fc, state=WARNED
[STEP 3] Testing duplicate suppression...
         [PASS] Duplicate suppression verified: both duplicate event_id and cooldown triggers suppressed.
[STEP 4] Vehicle departs SP-11 (25 frames moving away)
         Violation resolved: state=RESOLVED, reason=left_bay
[SUCCESS] Wrote 6 evidence entries to docs\evidence\3d-voice-violation\announcement_log.json
```

### E. Real CCTV Offline Evaluation (`python scripts/eval_bay_entry.py --mode real`)
```
============================================================
PARKTWIN BAY ENTRY EVALUATION REPORT [REAL CCTV FOOTAGE]
============================================================
Tracker Output Source: data\annotations\real_cctv_tracks_camera10.json
Ground Truth File:     data\annotations\cctv_bay_entry_ground_truth.csv

[STATUS: BLOCKED ON HUMAN GROUND-TRUTH LABELS]
------------------------------------------------------------
No human hand-labelled ground truth entries found.
Per project ground rules, real evaluation CANNOT proceed with fabricated labels.

REQUIRED ACTION FROM OPERATOR:
  1. Review CCTV video and annotate ground-truth entries/drive-pasts:
     python scripts/label_bay_entries.py --video "videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4"
  2. Once labels are recorded to data/annotations/cctv_bay_entry_ground_truth.csv, re-run:
     python scripts/eval_bay_entry.py --mode real --tracker-output data/annotations/real_cctv_tracks_camera10.json --ground-truth data/annotations/cctv_bay_entry_ground_truth.csv
============================================================
```
