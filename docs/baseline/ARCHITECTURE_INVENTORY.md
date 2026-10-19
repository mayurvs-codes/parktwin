# ParkTwin AI — Phase 0 Architecture Inventory

**Date:** 2026-10-19  
**Branch:** `feat/3d-voice-violation`

---

## 1. 3D Twin: Which implementation is more complete?

### TwinCanvas3D (digital-twin component)

**File:** `apps/web/components/digital-twin/TwinCanvas3D.tsx` (176 lines)

- Uses **React Three Fiber** (`@react-three/fiber`) + `@react-three/drei`
- Slot data from `useDigitalTwinStore` (canonical backend-driven store)
- 3D positions from `SLOT_3D_POSITIONS` in `twinConfig.ts` — **P01–P10 only** (10 slots)
- Renders: ground plane, lane dividers, kerbs, entry/exit markers, slot meshes (`TwinSlot3DMesh`), vehicle meshes (`TwinVehicle3DMesh`), heatmap overlay, selection popover
- **Reads live backend state** via `useDigitalTwinStore`
- No route display, no camera markers, no zone labels, no violations highlight
- Used on `/digital-twin` page within the existing 2D/3D toggle

### ParkingZone3D (3d-zone component)

**File:** `apps/web/components/3d-zone/ParkingZone3D.tsx` (852 lines)

- Uses **raw Three.js** (no React Three Fiber) — manual renderer lifecycle
- Slot positions **hardcoded** as Three.js world coordinates (SP-01 through SP-20)
- Slot IDs use `SP-XX` naming (matches the demo scenario IDs)
- **Hardcoded demo data** — static occupancy/vehicle assignments baked in
- Renders: full 3D parking lot, vehicles, animated route highlight (`ZoneRoute3D`), camera presets (aerial, driver, zone), minimap (`MiniMap2D`)
- Used on `/3d-zone` page route only
- **Does NOT read from `useDigitalTwinStore`** — completely disconnected from backend state
- Much richer visuals but completely siloed

### Verdict

`ParkingZone3D` is visually superior (852 lines, more features), but uses **hardcoded static data**.  
`TwinCanvas3D` is smaller but **live-data-connected** to the canonical store.

**Phase 1 strategy:** Use `TwinCanvas3D` as the base (canonical state connection), enrich it with the visual patterns from `ParkingZone3D`, and replace hardcoded geometry with the shared `facilityGeometry.ts` data.

---

## 2. Canonical Geometry Module

### Source of Truth

**`apps/web/components/digital-twin/twinConfig.ts`** (689 lines) is the canonical geometry source.

It defines:
- `CANONICAL_COORDS` — PDF coordinate system (842 × 2384 units, 1 unit ≈ 1 PDF point)
- `FACILITY_BOUNDARY` — L-shaped facility polygon
- `TECH_PARK_CORE` — obstacle polygon
- `VEHICLE_FORBIDDEN_REGIONS` — 5 pedestrian-only regions
- `DRIVE_AISLES` — 8 aisles with centerline polylines
- `PARKING_ROWS` — structured row definitions for 42 HIGH_CONFIDENCE spaces
- `SCATTERED_SPACES` — 10 MEDIUM_CONFIDENCE spaces
- `UNVERIFIED_CANDIDATE_SPACES` — 6 UNVERIFIED spaces
- `PHYSICAL_PARKING_SPACES` — 58 physical spaces with IDs `PHYS_001–PHYS_058`
- `PARKING_ZONES` — Zone A/B/C/D/E/Perimeter
- `RUNTIME_TO_PHYSICAL_MAP` — P01–P10 → PHYS_001–PHYS_010
- `CANONICAL_CAMERAS` — 16 cameras with positions
- `NAV_NODES` / `FACILITY_NAV_NODES` — navigation graph nodes
- `SLOT_3D_POSITIONS` — P01–P10 in 3D world space (for TwinCanvas3D)

**`apps/web/components/digital-twin/facilityGeometry.ts`** (290 lines) is a **re-export layer** that wraps `twinConfig.ts` and adds SVG path helpers.

### Runtime Slot IDs (SP-XX vs P0X)

The system uses **two parallel ID systems**:

| ID Format | Used By | Meaning |
|-----------|---------|---------|
| `SP-01` to `SP-20` | Demo state, violation engine, user portal, `ParkingZone3D` | Runtime "physical" slot IDs for demo |
| `P01` to `P10` | Backend nav graph, `useDigitalTwinStore`, `TwinCanvas3D`, `RUNTIME_TO_PHYSICAL_MAP` | Backend runtime slots |
| `PHYS_001` to `PHYS_058` | `twinConfig.ts` physical space inventory | PDF floor-plan verified spaces |

**Critical gap:** `ParkingZone3D` uses `SP-01–SP-20` with hardcoded Three.js positions. The backend uses `P01–P10`. The canonical `twinConfig.ts` uses `PHYS_001–PHYS_058`. These three ID systems do not share a single lookup table.

### Do 2D and 3D read the same geometry source?

- **TwinCanvas2D** → reads `useDigitalTwinStore` + draws via `facilityGeometry.ts` (SVG paths) ✅
- **TwinCanvas3D** → reads `useDigitalTwinStore` + `SLOT_3D_POSITIONS` from `twinConfig.ts` ✅ (partial)
- **ParkingZone3D** → **hardcoded positions, no shared geometry** ❌

---

## 3. Coordinate System for Tracked Vehicles

### Frontend Coordinate Space

`twinConfig.ts` uses **PDF coordinate space**: 842 × 2384 PDF points (1 unit ≈ 1 PDF point, rough scale ~0.5m per unit). No affine transform is applied at the data layer — rendering components apply their own transforms.

`SLOT_3D_POSITIONS` maps P01–P10 to 3D world units (range: x ∈ [-3.6, 3.6], z ∈ [-2.4, 2.4]).

### Backend/Camera Coordinate Space

**No camera-to-floor homography exists anywhere in the repo.**

Search findings:
- `configs/` — contains `settings.yaml` for general config; no `camera_calibration.yaml`
- `modules/vehicle_recognition/` — ByteTrack outputs pixel-space bounding boxes per camera
- `backend/api/routers/cameras.py` — camera registry, no calibration matrices
- `modules/parking_intelligence/mapping/slot_mapper.py` — maps track IDs to slot IDs via rule-based overlap, not metric floor projection

**Conclusion:** Tracked vehicle positions are in **per-camera pixel space**. There is no homography to convert to floor coordinates. Bay-entry detection (Phase 2) must use image-space bay polygons or replay/demo mode, labelled `unconfigured`.

---

## 4. Tracker Output Reachability from Violation Engine

The tracker (`modules/vehicle_recognition/`) outputs per-frame:
- `track_id`, `bbox` (pixel coords), `camera_id`, `frame_ts`

This is consumed by `slot_mapper.py`, which assigns track IDs to slot IDs based on overlap. The violation engine (`violation_engine.py`) operates on **sessions** (closed or active), not on per-frame tracks.

**Gap:** The violation engine has no access to live per-frame bboxes. It only evaluates static session properties (duration, reservation match, plate registration). Phase 3 wrong-bay detection will need to extend the engine to consume slot-assignment events rather than tracker frames directly.

---

## 5. Violation Creation and Broadcasting

### Violation Flags (current)

`modules/parking_intelligence/violations/violation_engine.py`:

| Flag | Trigger |
|------|---------|
| `overstay` | `duration_seconds > max_duration_hours * 3600` |
| `reserved_occupied` | Reserved slot occupied by non-matching plate |
| `unauthorized_parking` | No readable plate or unregistered vehicle |

### Long-Stay Alert

`modules/parking_intelligence/duration/duration_tracker.py`:

```python
PARKING_DURATION_THRESHOLD_SECONDS = 600.0   # 10 min
PARKING_DURATION_WARNING_THRESHOLD_SECONDS = 480.0  # 8 min
```

`evaluate_long_stay_alert()` — only fires if vehicle is still in the **same space**.

### Missing Events (for Phase 3)

No `WRONG_BAY_ENTRY_WARNING`, `WRONG_BAY_ESCALATED`, or `WRONG_BAY_RESOLVED` events exist. These need to be added.

### Relocation / Exit / Reset

- Exit: handled in parking router — session closed, slot released, `SlotReleased` + `VehicleExited` events fired
- Reset: `POST /api/demo/reset` — clears all sessions/occupancy
- Relocation: no explicit relocation logic; a new session opening in a different slot implicitly ends the old one

### Violation Broadcasting

Violations are stored in the session record. They are broadcast via the `events` WebSocket channel as part of session/parking events, not as standalone violation events.

---

## 6. WebSocket Events

**Channels:** `vehicles`, `occupancy`, `sessions`, `events`, `slots`

**Event types** (`modules/integration_layer/events/bus.py`):

| Event Type | Trigger |
|-----------|---------|
| `VehicleDetected` | ANPR/tracker first recognition |
| `VehicleTracked` | Track update (per-frame) |
| `VehicleParked` | Vehicle settled into slot |
| `VehicleExited` | Vehicle departed |
| `SessionStarted` | Parking session opened |
| `SessionEnded` | Parking session closed |
| `SlotOccupied` | Slot → OCCUPIED |
| `SlotReleased` | Slot → FREE |
| `SlotStateChanged` | Any slot state transition |

**Payload shape** (`IntegrationEvent.to_dict()`):
```json
{
  "event_id": "IE-abc123def456",
  "event_type": "VehicleParked",
  "timestamp": "2026-10-19T10:00:00Z",
  "camera_id": "CAM-01",
  "payload": { ... }
}
```

**Missing for new features:**
- `BAY_ENTRY_CONFIRMED` (Phase 2)
- `WRONG_BAY_ENTRY_WARNING` (Phase 3)
- `WRONG_BAY_ESCALATED` (Phase 3)
- `WRONG_BAY_RESOLVED` (Phase 3)
- `VOICE_ANNOUNCEMENT` (Phase 4)
- `VOICE_CANCEL` (Phase 4)
- `UNASSIGNED_VEHICLE_IN_BAY` (Phase 3)

---

## 7. Text-to-Speech / Voice

**No `speechSynthesis`, TTS, or voice code exists anywhere in the repo.**

Result of grep for `speechSynthesis`, `tts`, `text-to-speech`, `speak(` across all `.ts`/`.tsx`/`.py` files: **zero matches**.

Phase 4 must build this from scratch using the browser Web Speech API.

---

## 8. Navigation Service — Node IDs

`backend/services/navigation_service.py` defines:

**Junction nodes:** `ACCESS_POINT_B2`, `NORTH_JUNCTION`, `UPPER_WEST_JUNCTION`, `MID_WEST_JUNCTION`, `LOWER_MID_JUNCTION`, `SOUTH_JUNCTION`, `WEST_TRUNK_NORTH`, `WEST_TRUNK_SOUTH`, `EAST_UPPER_JUNCTION`, `EAST_MID_JUNCTION`, `EAST_LOWER_JUNCTION`, `EAST_SOUTH_JUNCTION`

**Slot nodes:** `P01–P10`

**Coordinates:** same x/y values as `NAV_NODES` in `twinConfig.ts` ✅ (manually mirrored)

**Gap:** The Python nav graph references `P01–P10`; the demo system uses `SP-01–SP-20`. There is no backend API to validate nav graph ↔ geometry consistency. Phase 1 must add this test and optionally export a `shared/facility_geometry.json`.

---

## 9. Bay IDs in facilityGeometry.ts vs Navigation Graph

| Geometry system | Bay IDs |
|-----------------|---------|
| `twinConfig.ts` `PHYSICAL_PARKING_SPACES` | `PHYS_001–PHYS_058` |
| `twinConfig.ts` `RUNTIME_TO_PHYSICAL_MAP` | `P01–P10` → `PHYS_001–PHYS_010` |
| `twinConfig.ts` `NAV_NODES` | `P01–P10` (plus junction nodes) |
| `backend/services/navigation_service.py` | `P01–P10` (manually mirrored) |
| Demo system / user portal | `SP-01–SP-20` |
| `ParkingZone3D.tsx` | `SP-01–SP-20` (hardcoded Three.js) |

**There is no unified mapping from SP-XX to PHYS_XXX or to 3D world coordinates.**

---

## 10. /3d-zone Route Status

**Active route:** `apps/web/app/3d-zone/page.tsx`

The route renders `Zone3DView` → `ParkingZone3D` (dynamically imported, SSR=false).

`ParkingZone3D.tsx` is a full self-contained Three.js scene with hardcoded data. It is the most visually polished 3D component in the repo, but completely isolated from the canonical state.

**Phase 1 plan:** Keep `/3d-zone` as a thin wrapper/redirect; consolidate the 3D rendering into `TwinCanvas3D` using the rich visual techniques from `ParkingZone3D`, fed by `useDigitalTwinStore`.
