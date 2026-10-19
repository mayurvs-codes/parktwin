# ParkTwin AI — Phase 6 Test & Verification Evidence Summary
============================================================

**Execution Timestamp:** 2026-10-19T17:51:00Z  
**Branch:** `feat/3d-voice-violation`  
**Base Commit:** `bbe0140` (Phase 0 Audit & Baseline)  

---

## 1. Test Suite Results Overview

| Component | Target Engine | Tests Passed | Tests Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | Pytest 9.1.1 (Python 3.13) | **208 / 208** | 0 | **100% GREEN** |
| **Frontend Unit Tests** | Vitest 4.1.10 (33 test files) | **258 / 258** | 0 | **100% GREEN** |
| **TypeScript Compilation**| `tsc --noEmit` (strict mode) | **0 Errors** | 0 | **100% GREEN** |
| **Frontend Linting** | Next.js ESLint CLI | **0 Warnings / 0 Errors** | 0 | **100% GREEN** |
| **Offline Bay Entry Eval**| `scripts/eval_bay_entry.py` | **4 TP, 2 TN, 0 FP, 0 FN** | 0 | **100% (P=1.0, R=1.0, F1=1.0)** |
| **Deterministic Replay** | `run_demo.py --scenario monday` | **40 Events Processed** | 0 | **100% VERIFIED** |
| **Deterministic Replay** | `run_demo.py --scenario wrong-bay` | **9 Events Processed** | 0 | **100% VERIFIED** |

---

## 2. Bay Entry Detection Offline Evaluation Metrics

```
============================================================
PARKTWIN BAY ENTRY EVALUATION REPORT
============================================================
Ground truth source: data/annotations/bay_entry_ground_truth.csv
Total labelled episodes: 6

Track 1001 -> SP-07: Expected=BAY_ENTRY_CONFIRMED  | Detected=True  | TP (Hit)
Track 1002 -> SP-14: Expected=BAY_ENTRY_CONFIRMED  | Detected=True  | TP (Hit)
Track 1003 -> SP-07: Expected=NONE                 | Detected=False | TN (Correct Rejection)
Track 1004 -> SP-11: Expected=NONE                 | Detected=False | TN (Correct Rejection)
Track 1005 -> SP-11: Expected=BAY_ENTRY_CONFIRMED  | Detected=True  | TP (Hit)
Track 1006 -> SP-07: Expected=BAY_ENTRY_CONFIRMED  | Detected=True  | TP (Hit)

------------------------------------------------------------
True Positives  (TP) : 4
True Negatives  (TN) : 2
False Positives (FP) : 0
False Negatives (FN) : 0
Precision            : 100.00%
Recall               : 100.00%
F1 Score             : 100.00%
============================================================
```

---

## 3. End-to-End Acceptance Checklist (Phase 6 Final Verification)

### Twin
- [x] One geometry source feeds 2D, 3D and the nav graph; IDs match (`shared/facility_geometry.json`)
- [x] Same slot IDs / occupancy / selection in 2D and 3D (`UnifiedTwinCanvas3D.tsx`)
- [x] Unknown geometry / cameras shown as unconfigured, not invented (`camera_calibration.yaml`)
- [x] 3D failure -> usable 2D (`Twin3DErrorBoundary.tsx`)

### Voice
- [x] Assignment announcement built from real bay + route directions (`VoiceService.build_assignment_message`)
- [x] Wrong-bay -> exactly one spoken warning (`VoiceService.build_wrong_bay_warning`)
- [x] No repeats from duplicate frames; failure messages for unknown/unassigned/unavailable (`VoiceService.build_failure_message`)
- [x] Voice failure does not alter parking state (`test_voice_exception_never_raises`)

### Violations
- [x] Wrong-bay detected before parking completes; passing-by doesn't trigger (`test_drive_past_along_aisle_produces_no_event`)
- [x] Correct bay -> no warning (`test_authorised_long_stay_separate_from_wrong_bay`)
- [x] 10-min escalation preserved using existing constant (`PARKING_DURATION_THRESHOLD_SECONDS = 600.0`)
- [x] Relocation resets timer; early exit -> no violation (`test_relocation_a_to_b_resets_timer`, `test_leaves_at_5_min_resolved_no_escalation`)
- [x] `LONG_STAY_ALERT` distinct from wrong-bay warning

### Integration
- [x] Backend authoritative; WS updates reach UI (`docs/api/EVENTS.md`)
- [x] `LIVE | REPLAY | DEMO | UNAVAILABLE | UNCONFIGURED` labels on all live panels (`DigitalTwinStatusBar.tsx`)
- [x] Existing pages, `monday` scenario, and reset behave as before (`run_demo.py`)
- [x] Phase-0 baseline preserved with 0 regressions across all suites
