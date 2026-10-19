# ParkTwin AI — Known System Limitations & Production Readiness Report
========================================================================

**Document:** `docs/KNOWN_LIMITATIONS.md`  
**Milestone:** Phase 6 Delivery & Corrective Sprint Audit  
**Branch:** `feat/3d-voice-violation`  
**Facility Scope:** Carparking-01 Basement B2  

---

## 1. Executive Limitations Statement

> [!IMPORTANT]
> **Live real-video detection is NOT demonstrated.**  
> Because all 16 facility cameras lack physical surveying and floor homography calibration (`status: "unconfigured"`), runtime detection cannot compute metric floor coordinates from live video streams without guessing.
>
> Wrong-bay detection and voice escalation behaviour are strictly demonstrated on:
> 1. **Synthetic tracks:** Unit and integration pipelines with known floor coordinates ([`tests/unit/test_violations.py`](file:///tests/unit/test_violations.py), [`tests/integration/test_pipeline_voice_violation.py`](file:///tests/integration/test_pipeline_voice_violation.py)).
> 2. **Scripted interactive demo:** Deterministic simulation timeline driven by backend API and WebSocket events ([`run_demo.py --scenario wrong-bay`](file:///run_demo.py), [`apps/web/e2e/parktwin-3d-voice-violation.spec.ts`](file:///apps/web/e2e/parktwin-3d-voice-violation.spec.ts)).
> 3. **Offline CCTV replay mode:** Image-space bay polygon intersections using bottom-edge pixel footings for real CCTV tracks ([`configs/replay_bay_polygons.yaml`](file:///configs/replay_bay_polygons.yaml), [`tests/integration/test_replay_bay_entry_real_tracks.py`](file:///tests/integration/test_replay_bay_entry_real_tracks.py)). Events in this mode strictly carry `source="replay"`.

---

## 2. Camera Calibration Coverage (Truthful Registry)

In strict compliance with the project ground rules against fabricating surveyed data:
- **Calibrated Cameras:** **0 / 16**
- **Unconfigured Cameras:** **16 / 16** (All cameras `CAM-01` through `CAM-16` are explicitly marked `status: "unconfigured"` in `configs/camera_calibration.yaml`).
- **Homography Matrix Quarantine:**
  - Round-number synthetic matrices have been moved under `_synthetic_test_only` and are quarantined exclusively for isolated unit test fixtures (`test_bay_entry.py`).
  - At runtime, `BayEntryDetector.get_camera_status()` returns `"unconfigured"` for all cameras, `project_to_floor()` returns `None`, and **0 vehicle positions or floor coordinates are fabricated**.
- **Action Required:**
  - To enable physical floor-plane tracking, the survey measurements detailed in [`docs/CALIBRATION_REQUEST.md`](file:///docs/CALIBRATION_REQUEST.md) must be supplied (at least 4 pixel-to-meter surveyed point correspondences per camera).

---

## 3. Operating Modes & Feature Provenance Demarcation

Every feature in the ParkTwin stack explicitly operates and labels its provenance:

| Subsystem / Feature | Operating Mode | Data Source & Provenance | Visual Label / UI Badge |
| :--- | :--- | :--- | :--- |
| **Physical CCTV Stream** | `unconfigured` | Raw RTSP/video frames from `videos/`. No homography exists; emits 0 floor-space entries. | `UNCONFIGURED` |
| **Offline CCTV Replay** | `replay` | Uses image-space bounding box overlap with camera-specific bay polygons. | `REPLAY` |
| **Demo Scenarios (`monday`, `wrong-bay`)** | `demo` | Deterministic simulation timeline driven by `run_demo.py` / `demoScenarioData.ts`. | `DEMO` |
| **Driver Dashboard Guidance** | `demo` | Simulated driver journey for User A (SP-07), User B (SP-14), and Guest. | `DEMO` |
| **Voice Announcement Engine** | `live` / `demo` | Real `VoiceService` generating turn-by-turn spoken guidance from nav graph and violation engine. | `VOICE ACTIVE` / `VOICE ON` |
| **2D Vector Digital Twin** | `live` / `demo` | Authoritative 2D SVG map consuming canonical `shared/facility_geometry.json`. | Status Strip |
| **3D Three.js Digital Twin** | `live` / `demo` | WebGL canvas consuming canonical `shared/facility_geometry.json` with 2D fallback. | Status Strip |

---

## 4. Bay Entry Detection: Precision & Recall Status

> [!WARNING]
> **No human-labelled accuracy measurement exists yet.**  
> Real CCTV replay test assertions in [`tests/integration/test_replay_bay_entry_real_tracks.py`](file:///tests/integration/test_replay_bay_entry_real_tracks.py) are strictly regression snapshots of current detector output to verify pipeline execution consistency across refactors. They do NOT grade physical detection accuracy or represent ground truth. Precision and recall metrics for real CCTV footage remain BLOCKED until verified operator ground-truth annotations are provided.

- **Synthetic Trajectory Benchmark:**
  - **Tool:** `python scripts/eval_bay_entry.py --mode synthetic`
  - **Status:** **PASS** (100% precision, 100% recall, 100% F1).
  - **Metrics:** 4 True Positives, 2 True Negatives, 0 False Positives, 0 False Negatives across 6 simulated test episodes.
  - **Demarcation:** Clearly designated as synthetic test-only.
- **Real 27-Aug-2026 CCTV Footage:**
  - **Tool:** `python scripts/eval_bay_entry.py --mode real`
  - **Real Tracker Extraction:** Successfully executed YOLOv8m + ByteTrack over 150 frames of real CCTV clip `videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4` to produce `data/annotations/real_cctv_tracks_camera10.json`.
  - **Status:** **BLOCKED ON HUMAN GROUND-TRUTH LABELS**
  - **Reason:** The repository contains zero verified human annotations for the physical CCTV footage archive. Per ground rules, no synthetic or hand-written fake results were created.
  - **Unblocking Action:** Operator must use `python scripts/label_bay_entries.py` to annotate entries/drive-pasts into `data/annotations/cctv_bay_entry_ground_truth.csv`.

---

## 5. Voice Audio & Browser Autoplay Constraints

- **Browser Audio Unlock:**
  - Modern browsers strictly disallow unprompted programmatic text-to-speech without prior user gesture.
  - Driver and Admin interfaces render an **"Enable Voice"** CTA button when audio is blocked, unlocking Web Speech API on the first click.
  - When muted or blocked, visual fallback banners display the complete announcement text without interrupting parking workflows.
- **Hardware Integration:**
  - Prototype voice output is bound to browser Web Speech API. Vehicle CAN-bus or Apple CarPlay/Android Auto head-unit integration requires external mobile hardware adapters.

---

## 6. Summary Matrix (Three Explicit Honesty Groups)

### Group 1: Proven by Automated Tests
| Milestone Component | Verified & Tested | Mode | Status / Evidence |
| :--- | :--- | :--- | :--- |
| **Slot ID Canonicalization** | SP-XX canonical across 2D, 3D, DB, Nav Graph | Live / Replay / Demo | **DONE** (`tests/unit/test_slot_id_consistency.py` 5 passed) |
| **Single Vehicle Gateway & Invariants** | ACCESS_POINT_B2 (CAM-01 entry, CAM-16 exit), CAM-03 path/parking | Architecture | **DONE** (`tests/unit/test_camera_registry.py` 6 passed) |
| **Pipeline End-to-End Wiring** | Tracker $\rightarrow$ BayEntry $\rightarrow$ Violations $\rightarrow$ Voice $\rightarrow$ WS | Live / Replay / Demo | **DONE** (`tests/integration/test_pipeline_voice_violation.py`) |
| **Bay Entry Logic & Drive-Past Suppression** | Footprint overlap with bay geometry; drive-past along aisle produces 0 events | Synthetic Floor | **DONE** (`tests/unit/test_bay_entry.py` 10 passed) |
| **Wrong-Bay Immediate Warning & Dedup** | Spoken warning emitted immediately on bay entry; duplicate frames deduped | Voice Engine | **DONE** (`tests/unit/test_voice_service.py`, `announcement_log.json`) |
| **10-Min Escalation & 8-Min Warning Stage** | Injectable clock: 480s visual/admin warning (speech off by default), 599s clean, 601s single WRONG_BAY_ESCALATED | Backend Core | **DONE** (`tests/unit/test_violations.py`, `tests/unit/test_voice_service.py`) |
| **Playwright E2E Suite** | 8 Scenarios (Backend-driven WS, strict assertions, speech dedup, 3D fallback) | E2E Browser | **DONE** (`docs/evidence/3d-voice-violation/e2e/report/`) |
| **Frontend Unit Test Suite** | All stores, hooks, 2D/3D components, error boundaries | Vitest Unit | **DONE** (33 test files, 258 passed) |

### Group 2: Proven on Recorded Footage Only
| Milestone Component | Verified & Tested | Mode | Status / Evidence |
| :--- | :--- | :--- | :--- |
| **Replay Image-Space Fallback** | Footprint bottom edge $\cap$ pixel polygons (`configs/replay_bay_polygons.yaml`) | Replay (`source="replay"`) | **DONE** (`tests/integration/test_replay_bay_entry_real_tracks.py`) |
| **Real CCTV Track Ingestion** | 150 frames extracted via YOLOv8m + ByteTrack into `real_cctv_tracks_camera10.json` | Replay Extraction | **DONE** (5 vehicle tracks parsed) |
| **Visible Bay Markings Polygons** | Bounded by painted floor dividers and yellow aisle boundary (`configs/cam10_bay_polygons_evidence.jpg`) | Image-Space Config | **DONE** (`BAY-CAM10-01` to `BAY-CAM10-05`) |
| **Scope: Single Unregistered Clip Only** | Recorded clip `6B-IP Camera10...mp4` (overlay `B2-Cam 5`), not verified CAD CAM-10 | Recorded Replay | **DONE** (`docs/CAMERA_REGISTRY_AUDIT.md`) |
| **Accuracy Measurement** | **No human-labelled accuracy measurement exists yet.** Assertions in tests are regression snapshots of current output. | Regression Snapshot | **NO GROUND TRUTH ACCURACY YET** |

### Group 3: Not Demonstrated
| Milestone Component | Verification Barrier | Operating Mode | Blocking Dependency |
| :--- | :--- | :--- | :--- |
| **Live Real-Video Detection** | Live streams cannot compute floor coordinates without guessing; all 16 cameras unconfigured | Live Video | **BLOCKED** on physical surveying |
| **Calibrated Floor Positions** | 0 physical point correspondences exist; no metric homography matrices in repo | Live Runtime | **BLOCKED** on survey data (`docs/CALIBRATION_REQUEST.md`) |
| **Measured Real CCTV Accuracy** | Precision, recall, and F1 metrics for real footage cannot be scored without ground truth | Real Footage Eval | **BLOCKED** on operator labels (`scripts/eval_bay_entry.py --mode real`) |
| **CAM-16 Physical Exit Footage** | Physical archive contains no video footage for egress gateway camera CAM-16 | Egress Gateway | **NO PHYSICAL VIDEO IN REPO** |

