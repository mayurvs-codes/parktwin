# PARKTWIN AI — 3D DIGITAL TWIN IMPLEMENTATION PLAN

## Executive Summary

Transform the existing 2D Digital Twin (FacilityMap.tsx) into a true 3D spatial representation of the B2 parking facility using the existing canonical geometry as the single source of truth. The 3D Twin will be the hero experience with 2D plan as secondary view, both sharing the same canonical data.

---

## Phase 0 — Audit Existing 3D Assets (Week 0)

### 0.1 Inventory Current 3D Implementation
- [ ] Check `apps/web/components/digital-twin/TwinCanvas3D.tsx` — existing Three.js/React Three Fiber implementation
- [ ] Check `apps/web/components/digital-twin/TwinSlot3DMesh.tsx`, `TwinVehicle3DMesh.tsx`, `TwinHeatmap3DOverlay.tsx`
- [ ] Check `apps/web/components/digital-twin/TwinHeatmap.tsx` — 2D heatmap
- [ ] Check `apps/web/components/digital-twin/DigitalTwinView.tsx` — main view component
- [ ] Check `apps/web/components/digital-twin/DigitalTwinClientWrapper.tsx` — client wrapper
- [ ] Check `apps/web/hooks/useDigitalTwinSocket.ts` — WebSocket hook
- [ ] Check `apps/web/store/useDigitalTwinStore.ts` — Zustand store (already has 3D view mode)
- [ ] Check `apps/web/types/digitalTwin.ts` — type definitions
- [ ] Check `apps/web/components/digital-twin/twinConfig.ts` — canonical geometry (source of truth)

### 0.2 Identify Gaps
- [ ] Current 3D implementation uses legacy `SLOT_3D_POSITIONS` (only P01-P10) not full 58 physical spaces
- [ ] Current 3D uses legacy 10-slot layout, not canonical 58-space geometry
- [ ] Camera FOV frustums not implemented in 3D
- [ ] Vehicle movement not tied to canonical navigation graph
- [ ] No forbidden/pedestrian region rendering in 3D
- [ ] No structural elements (walls, columns, ramps)
- [ ] No access point visualization in 3D
- [ ] No zone rendering in 3D
- [ ] View switch (3D ↔ 2D) not implemented in UI

---

## Phase 1 — Core 3D Infrastructure (Week 1)

### 1.1 Upgrade Three.js/React Three Fiber Stack
- [ ] Ensure `@react-three/fiber`, `@react-three/drei`, `three` are at compatible versions
- [ ] Add `three-stdlib` for additional utilities if needed
- [ ] Configure canvas with proper sizing, shadows, tone mapping
- [ ] Set up proper camera controls (OrbitControls with constraints)

### 1.2 Create Canonical 3D Geometry Builders
**File: `apps/web/components/digital-twin/geometry3d/` (new directory)**

#### `facility3d.ts` — Facility Structure from Canonical Geometry
```typescript
// Input: FACILITY_BOUNDARY, TECH_PARK_CORE, VEHICLE_FORBIDDEN_REGIONS, DRIVE_AISLES
// Output: Three.js meshes for floor, walls, aisles, forbidden regions, pedestrian areas

export function buildFacility3D() {
  // Floor slab from FACILITY_BOUNDARY
  // Walls from boundary extrusion
  // Drive aisles as textured lanes
  // Forbidden regions as semi-transparent volumes
  // Pedestrian areas as distinct material
  // Tech Park core as structural element
}
```

#### `parkingSpaces3d.ts` — 58 Physical Spaces
```typescript
// Input: PHYSICAL_PARKING_SPACES (58), RUNTIME_TO_PHYSICAL_MAP
// Output: InstancedMesh for parking bays with state-driven materials

export function buildParkingSpaces3D() {
  // Each PHYS_XXX becomes a spatial bay
  // Runtime slots (P01-P10) get special highlighting
  // Materials: FREE, OCCUPIED, RESERVED, VIOLATION, UNKNOWN, UNVERIFIED
  // InstancedMesh for performance (58 instances)
}
```

#### `structural3d.ts` — Walls, Columns, Ramps
```typescript
// Input: FACILITY_BOUNDARY, TECH_PARK_CORE, VEHICLE_FORBIDDEN_REGIONS
// Output: Structural meshes

export function buildStructural3D() {
  // Boundary walls (extruded from FACILITY_BOUNDARY)
  // Interior columns (from structural_core_tech_park, ramp cores)
  // Ramps (from ramp_core_west, ramp_core_east)
  // Service area boundaries
}
```

#### `cameras3d.ts` — Camera Objects & FOV
```typescript
// Input: CANONICAL_CAMERAS (16)
// Output: Camera meshes + FOV frustums

export function buildCameras3D() {
  // Only CAM-01, CAM-02, CAM-03 have verified positions
  // Camera body mesh
  // FOV frustum (subtle, semi-transparent cone)
  // Role-based color coding (ENTRY=green, EXIT=red, PATH=blue)
  // NOT_CONFIGURED cameras: registry only, no 3D mesh
}
```

#### `accessPoint3d.ts` — ACCESS_POINT_B2
```typescript
// Input: ACCESS_POINT_B2 (candidates, UNVERIFIED)
// Output: Access point visualization

export function buildAccessPoint3D() {
  // Single gateway representation
  // Two candidate markers (north/south ramp) with UNVERIFIED badges
  // ENTRY/EXIT directional arrows
  // Camera references (CAM-01 / CAM-16)
}
```

#### `navigation3d.ts` — Navigation Graph
```typescript
// Input: NAV_NODES, NAV_EDGES, active route
// Output: Route visualization

export function buildNavigation3D() {
  // Drive aisle centerlines as subtle lines
  // Junction nodes as subtle spheres
  // Active route as highlighted animated path
  // Vehicle position along route
}
```

#### `zones3d.ts` — Zone Volumes
```typescript
// Input: PARKING_ZONES, PHYSICAL_PARKING_SPACES
// Output: Zone boundary volumes

export function buildZones3D() {
  // Zone boundaries as subtle colored volumes
  // Zone labels at centroids
  // Color coding from PARKING_ZONES
}
```

#### `vehicles3d.ts` — Vehicle Meshes
```typescript
// Input: Vehicle state from store (position, orientation, slot, plate)
// Output: Vehicle meshes

export function buildVehicles3D() {
  // Vehicle body mesh (low-poly, realistic proportions)
  // Orientation from navigation state
  // Plate label when close
  // State: ENTERING, PARKED, EXITING, MOVING
  // Trajectory line when telemetry available
}
```

### 1.3 Scene Composition
**File: `apps/web/components/digital-twin/Scene3D.tsx` (new)**
- Compose all builders into single scene
- Proper layering: floor → structural → zones → parking → aisles → forbidden → cameras → access point → vehicles → navigation → route
- Lighting: ambient + directional (parking garage lighting)
- Shadows: directional light casting on floor
- Post-processing: subtle bloom for route/vehicle highlights

---

## Phase 2 — State Integration (Week 1-2)

### 2.1 Connect Zustand Store to 3D Scene
**File: `apps/web/components/digital-twin/use3DScene.ts` (new hook)**
- Subscribe to store slices: slots, vehicles, cameras, activeRoute, accessPoint, layerVisibility
- Transform store state → 3D scene props
- Handle layer visibility toggles in 3D

### 2.2 WebSocket Integration
- Reuse `useDigitalTwinSocket.ts` — already connects to `/integration/ws`
- Ensure 3D scene updates on: slot changes, vehicle changes, occupancy, events
- No duplicate WebSocket connection

### 2.3 Replay Integration
- Reuse existing replay flow: `/prototype/replay/run` → WebSocket → store → 3D
- 3D scene reflects replay state automatically via store
- Label: "REPLAY / DEMO" badge in 3D UI

---

## Phase 3 — 3D UI & Controls (Week 2)

### 3.1 Camera Controls
- OrbitControls with:
  - Min/max polar angle (prevent underground view)
  - Min/max zoom
  - Pan damping
  - Auto-rotate disable
- Preset views:
  - `ISO` (isometric) — default
  - `TOP` (plan view) — orthographic camera
  - `PERSPECTIVE` — perspective camera
  - `ENTRY` — CAM-01 view
  - `EXIT` — CAM-16 view

### 3.2 View Switcher (3D ↔ 2D)
**File: `apps/web/components/digital-twin/ViewSwitcher.tsx` (new)**
- Toggle button in header: `3D TWIN | 2D PLAN`
- Default: 3D TWIN
- Preserve camera position when switching
- Both views read from same store

### 3.3 Layer Visibility in 3D
- Reuse `layerVisibility` from store
- 3D-specific layers: structural, forbidden, pedestrian, cameras, navigation, route, zones, accessPoint
- Toggle in settings panel

### 3.4 Detail Panels (Click Interaction)
- Raycast on click → identify object → open drawer
- Parking bay: PHYSICAL_ID, RUNTIME_SLOT, ZONE, STATUS, CONFIDENCE, VEHICLE, SOURCE, LAST_UPDATE
- Vehicle: ID, PLATE, STATUS, SLOT, CAMERA, TIMESTAMP, SOURCE
- Camera: ID, ROLE, SOURCE, STATUS, POSITION_CONFIDENCE
- Access Point: ACCESS_POINT_B2, ENTRY/EXIT, LOCATION: UNVERIFIED

### 3.5 REPLAY / DEMO Badge
- Prominent badge when replay active
- Never show "LIVE CCTV" for replay

---

## Phase 4 — Visual Polish & Performance (Week 2-3)

### 4.1 Materials & Lighting
- Floor: concrete material with subtle noise
- Parking bays: painted lines as texture
- Drive aisles: asphalt material
- Walls/columns: concrete with subtle variation
- Forbidden regions: semi-transparent red tint
- Pedestrian areas: semi-transparent blue tint
- Lighting: ambient (0.4) + directional (0.8, parking garage angle)
- Shadows: PCF soft shadows, bias tuned for floor

### 4.2 Performance Optimization
- InstancedMesh for 58 parking bays
- InstancedMesh for vehicles (max 10-20)
- Frustum culling enabled
- Level of detail: simplify geometry at distance
- Texture atlasing for materials
- Target: 60fps on RTX 3050 Laptop (4GB VRAM)

### 4.3 Visual Hierarchy
- Far zoom: zones + major structures + access point
- Medium zoom: parking IDs + cameras + aisle labels
- Close zoom: individual bay details + vehicle plates + camera FOV
- Labels: HTML overlay via `drei/Html` or canvas texture

---

## Phase 5 — Validation & Testing (Week 3)

### 5.1 Automated Tests
- [ ] TypeScript compilation: `npm run build` in `apps/web`
- [ ] Frontend unit tests: `npm test` (72/72)
- [ ] Backend tests: `pytest tests/` (248 passed)
- [ ] Type definitions for new 3D components

### 5.2 Integration Tests
- [ ] Monday replay: 7 vehicles, 6 parked, 1 exited, 40 events
- [ ] WebSocket: occupancy updates → 3D bay state change
- [ ] Navigation: route API → 3D route visualization
- [ ] Vehicle: VH-001 route → 3D vehicle position
- [ ] Camera: CAM-01/CAM-02/CAM-03 visible, CAM-04..16 not rendered
- [ ] Access point: ACCESS_POINT_B2 with UNVERIFIED badge
- [ ] Forbidden regions: visible, vehicles don't route through

### 5.3 Docker Stack Validation
- [ ] `docker compose -f docker/compose/docker-compose.hotdev.yml up -d --build`
- [ ] Backend healthy on :8000
- [ ] Frontend on :3000
- [ ] Replay runs in container
- [ ] WebSocket works in container

### 5.4 Antigravity Browser Tests
- [ ] TEST 1: Open Digital Twin → 3D facility visible
- [ ] TEST 2: Orbit → spatial depth visible
- [ ] TEST 3: Zoom into bays → spatially understandable
- [ ] TEST 4: Switch 3D → 2D → same canonical facility
- [ ] TEST 5: Start Monday replay → 3D reflects replay state
- [ ] TEST 6: Occupied parking → vehicle in correct bay
- [ ] TEST 7: Vehicle movement → follows valid geometry
- [ ] TEST 8: Cameras → CAM-01 ENTRY, CAM-02..15 PATH, CAM-16 EXIT
- [ ] TEST 9: Access point → ACCESS_POINT_B2, UNVERIFIED
- [ ] TEST 10: Restricted areas → visible, no vehicle routing through
- [ ] TEST 11: Reset → runtime clears, physical remains
- [ ] TEST 12: Reload → 3D reconstructs from canonical state

---

## Phase 6 — Documentation & Handoff (Week 3)

### 6.1 Update Documentation
- [ ] `DIGITAL_TWIN_GEOMETRY.md` — note 3D implementation
- [ ] `DIGITAL_TWIN_INTEGRATION.md` — 3D integration details
- [ ] `DIGITAL_TWIN_VALIDATION.md` — 3D validation criteria

### 6.2 Final Report
| Category | Status |
|----------|--------|
| 3D Implementation | [ ] Complete |
| 3D Renderer | React Three Fiber + Drei |
| Canonical Geometry Source | `twinConfig.ts` (single source) |
| 58-space Reconciliation | [ ] Verified |
| Camera Model | 16 canonical, 3 rendered |
| Access Point | ACCESS_POINT_B2 UNVERIFIED |
| 2D/3D Shared Source | Zustand store |
| Replay Integration | WebSocket → Store → 3D |
| WebSocket Integration | Reused existing hook |
| Vehicle Movement | Canonical nav graph |
| Occupancy | 3D bay state updates |
| Navigation | 3D route visualization |
| Performance | [ ] 60fps on RTX 3050 |
| Tests | [ ] All pass |
| Docker | [ ] Stack healthy |
| Antigravity Handoff | [ ] Ready |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 3D performance on low-end GPU | InstancedMesh, LOD, texture atlasing, quality presets |
| Missing 6 physical spaces | Document as UNVERIFIED, don't invent |
| CAM-04..16 no 3D position | Registry only, no 3D mesh |
| ACCESS_POINT_B2 UNVERIFIED | Show candidates, don't invent |
| Test DB migration | Document as known limitation |
| WebGL context loss | Graceful fallback to 2D |

---

## Success Criteria

The implementation is successful when:
1. ✅ 3D canvas renders B2 facility with spatial depth
2. ✅ 52 physical spaces + 6 UNVERIFIED placeholders visible
3. ✅ 3 verified cameras + 13 registry entries displayed correctly
4. ✅ ACCESS_POINT_B2 shows UNVERIFIED with 2 candidates
5. ✅ Monday replay shows 7 vehicles in correct 3D bays
5. ✅ Vehicle VH-001 follows canonical nav graph in 3D
6. ✅ WebSocket updates 3D bay states in real-time
7. ✅ 3D ↔ 2D switch preserves canonical geometry
8. ✅ All 248 backend tests + 72 frontend tests pass
9. ✅ Docker stack healthy, replay works in container
10. ✅ Antigravity tests 1-12 all pass

---

## Anti-Goals (Explicitly NOT Doing)

- ❌ Inventing 6 missing physical spaces
- ❌ Inventing CAM-04..16 positions
- ❌ Inventing ACCESS_POINT_B2 coordinates
- ❌ Creating fake vehicle animation
- ❌ Labeling replay as LIVE CCTV
- ❌ Creating second physical gateway
- ❌ Changing CAM-03 to EXIT
- ❌ Creating separate 3D source of truth
- ❌ Replacing real telemetry with animation

---

## Dependencies

- Existing: `@react-three/fiber`, `@react-three/drei`, `three`, `zustand`
- Existing: `twinConfig.ts` (canonical geometry)
- Existing: `useDigitalTwinStore.ts` (state)
- Existing: `useDigitalTwinSocket.ts` (WebSocket)
- Existing: `navigation_service.py` (canonical nav graph)

---

## Timeline Summary

| Week | Focus |
|------|-------|
| 0 | Audit existing 3D assets |
| 1 | Core 3D infrastructure + geometry builders |
| 2 | State integration + 3D UI + controls |
| 3 | Visual polish + validation + documentation |

---

## Approval Gates

1. **Phase 1 Complete**: 3D scene renders facility with 52 bays, structural elements, cameras
2. **Phase 2 Complete**: Replay works in 3D, WebSocket updates 3D state
3. **Phase 3 Complete**: All Antigravity tests pass, Docker healthy
3. **Final**: All tests pass, documentation complete

---

*This plan respects the canonical Digital Twin architecture. The 3D Twin is a rendering layer over the existing authoritative geometry and state.*