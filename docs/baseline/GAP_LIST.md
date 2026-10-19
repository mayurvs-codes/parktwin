# ParkTwin AI — Phase 0 Gap List

**Date:** 2026-10-19

For each of the 3 new features, what is currently missing vs. what exists.

---

## Feature 1: Unified 2D/3D Digital Twin

### What exists

| Component | Status |
|-----------|--------|
| `TwinCanvas2D` reading live `useDigitalTwinStore` | ✅ |
| `TwinCanvas3D` reading live `useDigitalTwinStore` (P01–P10) | ✅ partial |
| `ParkingZone3D` — rich 3D scene with vehicles, routes, cameras | ✅ but isolated |
| `facilityGeometry.ts` / `twinConfig.ts` — canonical 2D geometry | ✅ |
| `SLOT_3D_POSITIONS` for P01–P10 in `twinConfig.ts` | ✅ |
| 2D/3D toggle in `DigitalTwinView` | ✅ |

### Gaps

| Gap | Severity | Phase |
|-----|----------|-------|
| `ParkingZone3D.tsx` uses hardcoded SP-01–SP-20 Three.js positions, not `twinConfig.ts` | 🔴 Critical | 1 |
| Two divergent 3D scenes (`TwinCanvas3D` vs `ParkingZone3D`) — no consolidation | 🔴 Critical | 1 |
| No mapping from SP-XX demo IDs → 3D world coordinates | 🔴 Critical | 1 |
| `ParkingZone3D` does not read `useDigitalTwinStore` (hardcoded demo data) | 🔴 Critical | 1 |
| No error boundary around 3D scene + WebGL fallback to 2D | 🟠 High | 1 |
| No `shared/facility_geometry.json` for Python/TS shared geometry | 🟡 Medium | 1 |
| No backend test asserting nav graph slot IDs match geometry slot IDs | 🟡 Medium | 1 |
| `TwinCanvas3D` lacks: route polyline, camera markers, zone labels, violation highlight | 🟡 Medium | 1 |
| `ParkingZone3D` lacks: instanced mesh performance, `useFrame` ref pattern | 🟡 Medium | 1 |
| Toggle does not preserve selected slot (selection state is renderer-local in ParkingZone3D) | 🟡 Medium | 1 |
| No `docs/baseline/GEOMETRY_RECONCILIATION.md` | 🟡 Medium | 1 |
| `/3d-zone` route still renders isolated hardcoded scene | 🟡 Medium | 1 |

---

## Feature 2: Bay Entry Detection

### What exists

| Component | Status |
|-----------|--------|
| ByteTrack tracker outputting per-frame bbox per camera | ✅ |
| Slot mapper assigning track IDs to slot IDs (image-space overlap) | ✅ |
| `VehicleParked` / `SlotOccupied` events on the event bus | ✅ |
| `run_demo.py` deterministic replay scenarios | ✅ |

### Gaps

| Gap | Severity | Phase |
|-----|----------|-------|
| No camera-to-floor homography / calibration data anywhere | 🔴 Critical (blocker for live) | 2 |
| No `configs/camera_calibration.yaml` | 🔴 Critical | 2 |
| No `modules/parking_intelligence/bay_entry/` module | 🔴 Critical | 2 |
| No state machine for `OUTSIDE→APPROACHING→ENTERING→INSIDE→LEAVING` | 🔴 Critical | 2 |
| No `BAY_ENTRY_CONFIRMED` / `BAY_OCCUPIED` / `BAY_EXIT_CONFIRMED` events | 🔴 Critical | 2 |
| No drive-past vs. entry discrimination (velocity + overlap threshold) | 🔴 Critical | 2 |
| No hysteresis to prevent jitter at threshold | 🟠 High | 2 |
| No hand-labelled clip data for precision/recall evaluation | 🟠 High | 2 |
| No `scripts/eval_bay_entry.py` offline evaluation script | 🟠 High | 2 |
| No unit tests for bay entry detector | 🟠 High | 2 |
| Without calibration: all cameras are `unconfigured`, no bay-entry events possible | 🟡 Medium | 2 |

**Note:** Without camera calibration, Phase 2 can only operate in `demo` mode using image-space bay polygons derived from the existing slot mapper. Real live bay-entry detection requires calibration data from the user (reference points/measurements).

---

## Feature 3: Immediate Wrong-Bay Warning

### What exists

| Component | Status |
|-----------|--------|
| Long-stay alert (10-min, same-space rule) | ✅ |
| `PARKING_DURATION_THRESHOLD_SECONDS = 600` | ✅ |
| `ViolationEngine` with overstay/reserved/unauthorized flags | ✅ |
| Session-based vehicle↔slot association | ✅ |
| Demo scenario with violation state (`monday` scenario) | ✅ |

### Gaps

| Gap | Severity | Phase |
|-----|----------|-------|
| No `WRONG_BAY_ENTRY_WARNING` event (immediate, on entry) | 🔴 Critical | 3 |
| No `WRONG_BAY_ESCALATED` event (10-min, reusing existing threshold) | 🔴 Critical | 3 |
| No `WRONG_BAY_RESOLVED` event with `reason` field | 🔴 Critical | 3 |
| No violation episode model `{episode_id, vehicle_id, assigned_bay, actual_bay, started_at, state}` | 🔴 Critical | 3 |
| Wrong-bay timer must be per-episode, resetting on relocation A→B | 🟠 High | 3 |
| Moving from wrong bay A → wrong bay B: close A, open B with fresh timer | 🟠 High | 3 |
| Wrong bay → correct bay: resolve, discard timer, no escalation | 🟠 High | 3 |
| Facility exit before threshold: no escalation | 🟠 High | 3 |
| Unassigned/unknown vehicle: emit `UNASSIGNED_VEHICLE_IN_BAY` info only | 🟠 High | 3 |
| No `GET /violations/episodes?active=true` API endpoint | 🟡 Medium | 3 |
| No Alembic migration for episode table (if persisting) | 🟡 Medium | 3 |
| `LONG_STAY_ALERT` must stay distinct from wrong-bay events | 🟡 Medium | 3 |
| No demo scenario `--scenario wrong-bay` in `run_demo.py` | 🟡 Medium | 3 |

---

## Feature 4: Voice Assistant

### What exists

Nothing. No TTS, speech synthesis, or voice service in the entire repo.

### Gaps

| Gap | Severity | Phase |
|-----|----------|-------|
| No `modules/integration_layer/voice/` or `backend/services/voice_service.py` | 🔴 Critical | 4 |
| No `VOICE_ANNOUNCEMENT` or `VOICE_CANCEL` WebSocket events | 🔴 Critical | 4 |
| No `VoiceMessage` model with dedup/cooldown | 🔴 Critical | 4 |
| No frontend `apps/web/services/voice/` TTS adapter | 🔴 Critical | 4 |
| No `useVoiceStore.ts` | 🔴 Critical | 4 |
| No "Enable voice" browser unlock button (browsers block autoplay) | 🔴 Critical | 4 |
| No voice settings (rate, volume, language, enable/disable) | 🟠 High | 4 |
| No announcement log panel (text + time + delivered/blocked) | 🟠 High | 4 |
| No `DigitalTwinStatusBar` voice chip | 🟠 High | 4 |

---

## Feature 5: Operator UI / Source Badges / Integration (Phase 5)

### Gaps

| Gap | Severity | Phase |
|-----|----------|-------|
| No `LIVE \| REPLAY \| DEMO \| UNAVAILABLE \| UNCONFIGURED` source badges on panels | 🟠 High | 5 |
| No `docs/api/EVENTS.md` listing all event names + payload schemas | 🟡 Medium | 5 |
| No single occupancy hook shared by Dashboard, Parking page, 2D, 3D | 🟡 Medium | 5 |
| No wrong-bay demo scenario in `run_demo.py` | 🟡 Medium | 5 |
| No per-role plate masking in vehicle drawers | 🟡 Medium | 5 |
| No confirmation dialog for admin reset action | 🟡 Medium | 5 |
| No configurable retention/cleanup job | 🟢 Low | 5 |

---

## Summary Table

| Phase | Feature | Ready | Critical Gaps |
|-------|---------|-------|---------------|
| 1 | Unified 2D/3D twin | 40% | Hardcoded geometry, two divergent scenes, no shared ID mapping |
| 2 | Bay entry detection | 10% | No calibration, no detector module, no events |
| 3 | Wrong-bay warning | 30% | No episode model, no new events, no relocation logic |
| 4 | Voice assistant | 0% | Everything is new |
| 5 | Operator UI / badges | 20% | No source labels, no event contract doc |
| 6 | E2E tests / evidence | 0% | No Playwright setup, no evidence captures |
