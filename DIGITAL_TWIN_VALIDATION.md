# ParkTwin AI — Digital Twin Architectural Validation Report

## 1. Executive Summary

This report validates the implementation of the authentic, floor-plan-based **Digital Twin** for ParkTwin AI. The digital twin has been calibrated strictly against the authoritative architectural drawings for the Carparking-01 Tech Park facility. All fictional or generic representations have been eliminated in favor of a 1:1 scale vector spatial model backed by real-time backend state, live CCTV video integrations, dynamic camera role mappings, and authentic Dijkstra aisle navigation.

---

## 2. Floor Plan Ground Truth & Calibration

### Physical Source
- **Document Path**: `C:\Users\ASUS\Documents\Floor Plans 03.06.2022.pdf`
- **Architectural Drawings Verified**:
  - Sheet 1: Level 75.0 M LVL & Level 78.75 M LVL (Basement 2 / B2 Lower)
  - Sheet 2: Level 82.5 M LVL (Basement 1 / B1 & B2 Mezzanine Main Parking Deck)
  - Sheet 3: Level 86.25 M LVL & Level 90.0 M LVL (Upper Ramp & Ground Access)
- **Facility Footprint**: True **L-shaped** configuration spanning `1255 × 2155` units (aspect ratio `0.582`).
- **Core Obstruction**: TECH PARK high-rise core foundation (`[345, 1585]` to `[1245, 2145]`) forming the inner reflex boundary of the L-shape.
- **Calibrated Underlay Asset**: High-resolution extraction generated at `apps/web/public/parking_exact_l_shape.png`.

### Coordinate Geometry & Scale Factor
The coordinate space uses an SVG `viewBox="0 0 1255 2155"` with 1 unit ≈ 0.05 meters (~5 cm per pixel):
- **North Perimeter Lane**: `(80, 180)` to `(1200, 180)`, width 65 units.
- **Main West Driving Trunk**: `(360, 180)` to `(360, 1520)`, width 80 units.
- **Central Aisle A (Bay A)**: `(360, 820)` to `(1200, 820)`, width 75 units.
- **Lower Aisle B (Bay B)**: `(180, 1400)` to `(1200, 1400)`, width 75 units.
- **Lower Vertical Leg**: `(180, 1400)` to `(180, 2120)`, width 70 units.
- **Eastern Exit Connector**: `(1160, 180)` to `(1160, 1400)`, width 65 units.
- **Inter-Floor Ramps**:
  - Ramp Down from 86.25 M LVL: `(440, 610)`, 420 × 60 units (westbound).
  - Ramp Up to 86.25 M LVL: `(440, 920)`, 420 × 60 units (eastbound).

### Parking Bay Layout (P01–P10)
All 10 primary parking bays are calibrated to their physical positions and orientations:
- **Zone A (P01–P05)**: Centered at `Y = 720` px (facing South at 180° towards Central Aisle A), `X = [560, 650, 740, 830, 920]`. Covered by `CAM-02`.
- **Zone B (P06–P10)**: Centered at `Y = 1480` px (facing North at 0° towards Lower Aisle B), `X = [560, 650, 740, 830, 920]`. Covered by `CAM-03`.

---

## 3. Dynamic Camera System & Footage Decoupling

Physical camera positions are strictly decoupled from operational roles:
1. **CAM-01 (B2 Entrance Gate)**:
   - Physical Position: `(310, 750)`, Angle: 35°, FOV: 65°
   - Dynamic Role: `ENTRY`
   - Real CCTV Footage: `/videos/cam1_entry_gate.mp4` (verified authentic 25 FPS stream)
2. **CAM-02 (B2 Parking Bays)**:
   - Physical Position: `(480, 860)`, Angle: -35°, FOV: 75°
   - Dynamic Role: `PARKING_LOT`
   - Coverage: Slots P01–P05 (Zone A)
   - Real CCTV Footage: `/videos/cam2_parking_bay.mp4` (verified authentic 25 FPS stream)
3. **CAM-03 (B2 Exit Ramp)**:
   - Physical Position: `(1100, 900)`, Angle: 195°, FOV: 70°
   - Dynamic Role: `EXIT`
   - Coverage: Slots P06–P10 (Zone B) + Exit Ramp barrier
   - Real CCTV Footage: `/videos/cam3_exit_ramp.mp4` (verified authentic 25 FPS stream)

Role changes performed via the backend API (`PUT /cameras/{id}`) dynamically update the twin's behavior, FOV cone color-coding, and navigation routing without requiring code changes.

---

## 4. Navigation & Graph Topology

Dijkstra shortest-path routing (`backend/services/navigation_service.py`) calculates paths exclusively along legal drive aisles:
- **Graph Nodes**: `ENTRY_GATE` (360, 780), `MAIN_LANE` (360, 820), `JUNCTION_A` (520, 820), `JUNCTION_B` (520, 1400), `AISLE_A` (760, 820), `AISLE_B` (760, 1400), `EXIT_RAMP` (1160, 820), and slot nodes `P01`–`P10`.
- **Bidirectional Edges**: Weighted with physical metric distances (12m, 8m, 15m, 25m, etc.).
- **Turn-by-Turn Guidance**: Provides human-readable instructions (e.g., 'Proceed straight through MAIN_LANE', 'Turn right onto AISLE_A', 'Pull into slot P01 on your left').
- **Frontend Integration**: Rendered as a high-visibility animated cyan/emerald polyline on the SVG map with waypoint markers and pulse indicators.

---

## 5. Frontend Digital Twin Component Architecture

Built in `apps/web/components/digital-twin/` and `apps/web/app/digital-twin/`:
- **FacilityMap.tsx**: Master 10-layer SVG canvas featuring:
  1. Floor plan architectural raster underlay (`parking_exact_l_shape.png`) with live opacity adjustment slider.
  2. Exterior concrete facility boundary polygon and Tech Park structural footprint.
  3. Structural columns and elevator core markers.
  4. Drive aisle network with directional arrows and centerlines.
  5. Directional inter-floor ramps with slope striping.
  6. Parking stalls (P01–P10) with real-time status color coding (`free`: emerald, `occupied`: rose, `reserved`: amber, `violation`: yellow).
  7. Camera mounts and coverage FOV cones with role-based styling (`ENTRY`: blue, `PARKING_LOT`: violet, `EXIT`: amber).
  8. Animated Dijkstra pathfinding polyline.
  9. Live vehicle markers with license plate tags and heading orientation.
  10. Full interactive pan, zoom, reset, and layer visibility toggles (Underlay, Columns, FOV cones, Driving Lanes, Vehicle Labels).
- **SlotDrawer.tsx**: Slide-over drawer displaying slot occupancy, assigned camera, occupant plate, live elapsed session timer, and one-click *Navigate From Entry Gate* shortest-path trigger.
- **VehicleDrawer.tsx**: Detailed telemetry card with OCR plate confidence, check-in timestamp, session status, embedded live CCTV player, and turn-by-turn navigation card.
- **CameraDrawer.tsx**: Live video feed player (`cam1_entry_gate.mp4`, `cam2_parking_bay.mp4`, `cam3_exit_ramp.mp4`), dynamic backend role badge, stream resolution/FPS, and covered stalls list.
- **TwinControls.tsx**: Mode switcher (2D Map / 3D Isometric View), Heatmap density toggle, and Reset Canvas button.
- **TwinSummaryBar.tsx**: Executive metrics header showing Total Stalls, Occupied, Free, Utilization Rate, and Active Camera count.
- **DigitalTwinView.tsx**: Master orchestrator integrating React Query API polling fallback, real-time WebSocket event ingestion (`slot_update`, `vehicle_detected`, `system_event`), and an on-demand *Replay Monday* simulation button.

---

## 6. Verification & Test Execution Results

All automated test suites, type checking, production builds, and end-to-end replay simulations pass cleanly:

### 1. Backend Navigation & Topology Tests
```powershell
pytest tests/unit/test_navigation.py tests/unit/test_config.py
============================== 8 passed in 1.91s ==============================
```
- Validates node positions, edge weights, Dijkstra shortest path accuracy, and camera role configuration.

### 2. Frontend TypeScript Typecheck
```powershell
npm --prefix apps/web run typecheck
> parktwin-web@1.0.0 typecheck
> tsc --noEmit
# Exit Code 0 — Zero errors
```

### 3. Frontend Next.js Production Build
```powershell
npm --prefix apps/web run build
# Exit Code 0 — All 15 routes compiled and statically optimized
# Route: /digital-twin (Static prerender)
```

### 4. End-to-End Monday Scenario Replay
```powershell
python run_demo.py --scenario monday --reset
# Processed 40 events across 10 parking slots
# 6 vehicles parked, 1 exited, 6 slots occupied, 4 slots free
# Navigation route verified: 42.0m from ENTRY_GATE to Slot P01
```

---

## 7. Artifacts & Deliverables Summary

| File | Purpose |
| :--- | :--- |
| `DIGITAL_TWIN_GEOMETRY.md` | Authoritative geometric specification of Carparking-01 B2 |
| `DIGITAL_TWIN_VALIDATION.md` | Verification, calibration, and test results document |
| `REAL_CCTV_ACCEPTANCE_TEST.md` | Authoritative end-to-end Real CCTV pipeline acceptance report |
| `evidence/real_cctv/acceptance_test_report.json` | Real-time CCTV acceptance telemetry and navigation output |
| `evidence/real_cctv/lifecycle_validation_report.json` | Multi-camera lifecycle and designation persistence report |
| `evidence/real_cctv/cctv_cam2_frame50_full.jpg` | Forensic representative CCTV full frame from cam2 |
| `evidence/real_cctv/cctv_target_vehicle_crop.jpg` | Calibrated target vehicle crop (grey Tata Punch in Bay 2) |
| `evidence/real_cctv/cctv_target_plate_crop.jpg` | High-resolution bumper plate crop (KA05ND1565) |
| `apps/web/public/parking_exact_l_shape.png` | Calibrated architectural floor plan underlay raster |
| `apps/web/components/digital-twin/twinConfig.ts` | Shared geometry constants, anchors, road network, and status color maps |
| `apps/web/components/digital-twin/FacilityMap.tsx` | Master interactive 10-layer SVG floor plan canvas |
| `apps/web/components/digital-twin/SlotDrawer.tsx` | Slot detail drawer with live timer and pathfinding trigger |
| `apps/web/components/digital-twin/VehicleDrawer.tsx` | Vehicle drawer with telemetry, route card, and CCTV player |
| `apps/web/components/digital-twin/CameraDrawer.tsx` | Camera drawer with live CCTV stream and dynamic role badge |
| `apps/web/components/digital-twin/TwinControls.tsx` | 2D/3D toggle, heatmap toggle, and view controls |
| `apps/web/components/digital-twin/TwinSummaryBar.tsx` | KPI bar reflecting real-time backend occupancy |
| `apps/web/components/digital-twin/DigitalTwinView.tsx` | Main twin orchestrator with WebSocket & REST live sync |
| `apps/web/services/navigation.ts` | Client-side navigation service for Dijkstra route API |
| `backend/services/navigation_service.py` | Backend Dijkstra routing engine calibrated to floor plan |
