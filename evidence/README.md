# ParkTwin AI — CCTV Evidence & Provenance Manifest

## 1. Overview

This directory houses the physical CCTV evidence extracted from the ParkTwin AI facility video library recorded at the **Carparking-01** facility on **27-Aug-2026**.

All evidence is categorized according to strict engineering verification standards to ensure complete provenance and **zero synthetic fabrication**.

---

## 2. Three-Tier Truth & Provenance Matrix

ParkTwin AI strictly distinguishes between physical sensor observations, algorithmic domain decisions, and simulated Digital Twin visual models:

| Tier | Category | Verified Elements | Boundaries & Unobserved Gaps |
| :--- | :--- | :--- | :--- |
| **Level 1** | **CCTV Ground Truth** | • Physical entry barrier arm and vehicle entry at CAM-01 (cam1_entry_gate.mp4)<br>• Real parked vehicles in marked bays at CAM-02 (KA05ND1565, KA03MY0035, KA41MG7586)<br>• Physical exit barrier, driver scanner pole, and speed bumps at CAM-03 (cam3_exit_ramp.mp4)<br>• Original DVR cameras: IP Camera 3, IP Camera 16, IP Camera 5 | • Continuous single-vehicle tracking across all 3 cameras simultaneously does not exist in available 15s clips (independent recordings from 2026-08-27 15:45:00)<br>• Dynamic stall maneuvering (pulling into bay) is not captured in the 15s CAM-02 clip<br>• Dynamic barrier lifting on exit is not captured in the 15s CAM-03 clip |
| **Level 2** | **Application Logic** | • ANPR normalization via nprEvidenceAdapter.ts<br>• Event normalizer emitting VEHICLE_ENTERED, OCCUPANCY_CHANGED, VEHICLE_EXITED<br>• A* pathfinding and aisle navigation via 
avigationRouter.ts<br>• Real-time cross-tab state sync via crossTabSyncService.ts | • Synthesized domain events based on verified camera positions rather than continuous physical tracker re-identification across camera blind spots |
| **Level 3** | **Digital Twin Model** | • 1472×1508 canonical SVG floorplan coordinates<br>• 60 canonical parking bays (SP-01 to SP-60)<br>• 16 camera location markers<br>• Single access point ACCESS_POINT_B2 (100, 720) | • Virtual replica abstraction representing the facility state |

---

## 3. Physical CCTV Video Inventory Summary

A comprehensive scan of the project workspace (ideo_inventory.json) indexed **240 video files**, including **33 multi-camera CCTV DVR recordings** from 27-Aug-2026/27-Aug_3-55 to 5-05 pm/ covering 16 IP cameras (IP Cameras 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 19, 20, 21, 22, 24).

The primary clips deployed in the live application portal are:

1. **CAM-01: Entry Gateway** (pps/web/public/videos/cam1_entry_gate.mp4)
   - **Hardware**: IP Camera 3 / Carparking-01
   - **Specs**: 1280×720, 25.0 fps, 15.0 seconds (375 frames)
   - **Observation**: Maroon Toyota approaching entry barrier, arm lifting, vehicle passing into B2 aisle.

2. **CAM-02: Parking Bay Cluster** (pps/web/public/videos/cam2_parking_bay.mp4)
   - **Hardware**: IP Camera 16 (B2-Cam 11) / Carparking-01
   - **Specs**: 1280×720, 25.0 fps, 15.0 seconds (375 frames)
   - **Observation**: Stationary parked vehicles in marked perpendicular stalls:
     - Dark Grey Tata Punch (KA05ND1565)
     - White Hyundai Venue (KA03MY0035)
     - Dark Metallic Baleno (KA41MG7586)

3. **CAM-03: Exit Ramp & Barrier** (pps/web/public/videos/cam3_exit_ramp.mp4)
   - **Hardware**: IP Camera 5 (B2-Baricade Exit Cam 2) / Carparking-01
   - **Specs**: 1280×720, 25.0 fps, 15.0 seconds (375 frames)
   - **Observation**: Physical exit infrastructure showing boom barrier, access card scanner pedestal, speed bumps, and exit roadway leading out of B2.

---

## 4. Extracted Evidence Frame Sequence

Key frames extracted at 25 fps (evidence/source_manifest.json):

### Entry Sequence (evidence/entry/)
- cam1_entry_gate_f30.png — Vehicle approach to barricade (t = 1.2s)
- cam1_entry_gate_f75.png — Boom barrier raised, entering threshold (t = 3.0s)
- cam1_entry_gate_f150.png — Mid-passage through gate (t = 6.0s)
- cam1_entry_gate_f250.png — Gateway cleared (t = 10.0s)
- cam1_entry_gate_f350.png — Gateway returning to standby (t = 14.0s)

### Parking Bay Sequence (evidence/parking/)
- cam2_parking_bay_f30.png — Overview of occupied bays (KA05ND1565 & KA03MY0035) (t = 1.2s)
- cam2_parking_bay_f75.png — Stationary dwell observation (t = 3.0s)
- cam2_parking_bay_f150.png — Stationary dwell observation (t = 6.0s)
- cam2_parking_bay_f250.png — Stationary dwell observation (t = 10.0s)
- cam2_parking_bay_f350.png — Persistent stall occupancy confirmed (t = 14.0s)

### Exit Sequence (evidence/exit/)
- cam3_exit_ramp_f30.png — Exit lane roadway and scanner pedestal (t = 1.2s)
- cam3_exit_ramp_f75.png — Exit barrier arm and speed bumps (t = 3.0s)
- cam3_exit_ramp_f150.png — Standby monitoring of exit threshold (t = 6.0s)
- cam3_exit_ramp_f250.png — Exit corridor view (t = 10.0s)
- cam3_exit_ramp_f350.png — Egress gate standby (t = 14.0s)

---

## 5. Verification Policy

ParkTwin AI strictly enforces:
1. **No Synthetic Bounding Boxes**: Annotations are only rendered where supported by genuine ANPR or CV inference outputs.
2. **Clear Declarations**: Where physical evidence is stationary (e.g. parked vehicles in CAM-02), the UI states stationary dwell rather than claiming dynamic entry.
3. **Cross-Portal Consistency**: The same evidence feeds both Admin Digital Twin and Driver User Portal via crossTabSyncService.
