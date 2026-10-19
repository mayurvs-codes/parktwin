# ParkTwin AI — Camera Registry & Gateway Audit Report

**Document:** `docs/CAMERA_REGISTRY_AUDIT.md`  
**Date:** 2026-10-19  
**Branch:** `feat/3d-voice-violation`  
**Authoritative References:**
1. `shared/facility_geometry.json` (Canonical facility specification)
2. `configs/camera_calibration.yaml` (Camera calibration runtime configuration)
3. `apps/web/components/digital-twin/twinConfig.ts` (`CANONICAL_CAMERAS`)
4. `apps/web/components/digital-twin/demoScenarioData.ts` (`CANONICAL_16_CAMERAS`)

---

## 1. Executive Summary & Facility Access Architecture

The Carparking-01 Basement B2 facility operates with a **Single Vehicle Gateway**:
- **Gateway ID:** `ACCESS_POINT_B2`
- **Location:** Top-Right corner of B2 (`centroid`: x: 55.25m, y: 2.75m; canvas: x: 1105, y: 55).
- **Physical Operation:** Single throttle gate serving both vehicular ingress (entry) and egress (exit).
- **Camera Designation:**
  - **Ingress Camera:** `CAM-01` (B2 Entrance Gate, Role: `ENTRY`)
  - **Egress Camera:** `CAM-16` (Exit Gate / Access Point B2, Role: `EXIT`)

There are **zero secondary vehicle entry/exit ramps** in the active facility model.

---

## 2. Complete 16-Camera Registry Audit (CAM-01 – CAM-16)

| Camera ID | Canonical Name | Role | Registry Status | Calibration Status | Physical Video Source | Verification & Audit Notes |
|:---------:|:---------------|:----:|:---------------:|:------------------:|:----------------------|:---------------------------|
| **CAM-01** | B2 Entrance Gate | `ENTRY` | ONLINE | `unconfigured` | `cam1_entry_gate.mp4` / `1A-IP Camera1...` | **VERIFIED.** Primary ANPR ingress gate. Captures entering vehicles, triggers bay assignment voice announcement. |
| **CAM-02** | East Vertical Drive Aisle | `PATH/PARKING` | ONLINE | `unconfigured` | Synthetic / Demonstration | **VERIFIED.** Monitors east vertical circulation drive aisle and transit toward Zone B. |
| **CAM-03** | Southeast Drive Corridor | `PATH/PARKING` | ONLINE | `unconfigured` | Synthetic / Demonstration | **VERIFIED.** Role is strictly `PATH/PARKING` (circulation aisle). Legacy demo references to `cam3_exit_ramp.mp4` are obsolete; CAM-03 is NOT an exit ramp. |
| **CAM-04** | South Perimeter Corridor East | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. No physical video clip available. |
| **CAM-05** | 3rd Horizontal Aisle East | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. No physical video clip available. |
| **CAM-06** | 3rd Horizontal Aisle West | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. No physical video clip available. |
| **CAM-07** | Southwest Corridor Junction | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. No physical video clip available. |
| **CAM-08** | West Lift Core 02 Junction | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. No physical video clip available. |
| **CAM-09** | 2nd Horizontal Aisle West | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. Positioned at Zone C entry junction. |
| **CAM-10** | 2nd Horizontal Aisle Center | `PATH/PARKING` | STANDBY | `unconfigured` | None (Registry Position) | Unverified infrastructure. Positioned at central cross driveway in CAD model. |
| **CAM-11** | East Services Corridor | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. Covers east utility aisle. |
| **CAM-12** | Top Horizontal Aisle Center | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. Overhead coverage for Island 1 bays. |
| **CAM-13** | West Entry Ramp Junction | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. Inter-floor ramp junction. |
| **CAM-14** | West Lift Core 01 Junction | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. Stair/lift core pedestrian transition. |
| **CAM-15** | Northwest Perimeter Junction | `PATH/PARKING` | STANDBY | `unconfigured` | None | Unverified infrastructure. Perimeter turn junction. |
| **CAM-16** | Exit Gate / Access Point B2 | `EXIT` | ONLINE | `unconfigured` | None (Physical Clip Missing) | Ingress/egress gateway partner to CAM-01 at `ACCESS_POINT_B2`. No physical CCTV archive clip exists in repo. |

---

## 3. Disambiguation: Real CCTV Clip `CAM-10` vs Registry `CAM-10`

An important distinction exists between the **CAD Registry Position `CAM-10`** and the **Physical CCTV Archive Clip**:

- **Archive Clip:** `videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827155000_20260827165520_823164.mp4` (and `data/annotations/real_cctv_tracks_camera10.json`).
- **Nature:** This is an **unregistered source clip** extracted from the 27-Aug-2026 CCTV archive.
- **Orientation & View:** The camera angle depicts a non-perpendicular parking bay row with unknown focal length, unknown sensor height, and no surveyed floor reference points.
- **Handling in Pipeline:**
  1. Because floor calibration is unavailable (`status: "unconfigured"` in `configs/camera_calibration.yaml`), the pipeline **refuses to invent synthetic floor coordinates**.
  2. For replay evaluation, the clip uses **image-space bay polygons** (`configs/replay_bay_polygons.yaml`) strictly flagged with `source="replay"`.
  3. It is **never** presented as a calibrated live camera at the physical CAD coordinates of `CAM-10`.

---

## 4. Architectural Rules Enforced by Automated Tests

The camera registry test suite (`tests/unit/test_camera_registry.py`) enforces the following invariants:

1. **Single Physical Gateway:** Exactly 1 gateway entity exists (`ACCESS_POINT_B2`), with `cameras.entry == "CAM-01"` and `cameras.exit == "CAM-16"`.
2. **CAM-03 Role Invariant:** `CAM-03` role is strictly `PATH/PARKING` (never `EXIT` or `EXIT_RAMP`).
3. **CAM-16 Role Invariant:** `CAM-16` role is strictly `EXIT`.
4. **Calibration Transparency:** All cameras in `configs/camera_calibration.yaml` have `status == "unconfigured"` (zero synthetic calibrations exposed to runtime).
5. **No Fabricated Live Video:** Cameras `CAM-04` through `CAM-15` are marked `verified: false` and `status: "STANDBY"`.
