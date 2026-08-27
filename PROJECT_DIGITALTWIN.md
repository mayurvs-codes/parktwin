# PROJECT_DIGITALTWIN.md — ParkTwin AI Digital Twin Module

> **Read this file before creating any Digital Twin code.**
> This document is the single source of truth for the Digital Twin (M7) implementation plan.
> It is a companion to `PROJECT_MEMORY.md` and must be updated when any module, file,
> endpoint, or phase is added, changed, or completed.
> Last updated: 2026-07-30

---

## Canonical Definition

> **The Digital Twin is the real-time virtual representation of the parking facility. It mirrors
> the current state of the physical parking lot by consuming events from the Parking Intelligence
> Engine and visualizing parking slots, vehicles, occupancy, and movement in an interactive 2D or
> 3D environment. It does not perform AI inference; instead, it presents the AI-generated state
> in a way that operators can monitor, analyze, and interact with.**

---

## 1. Architecture Alignment with PROJECT_MEMORY.md

### 1.1 Module Designation

The Digital Twin is **Module 7 (M7)** in the ParkTwin AI module hierarchy.

It is a **frontend-only module**. It adds:
- NO backend Python code
- NO new database tables
- NO new FastAPI endpoints
- NO new Python packages

It lives exclusively inside `apps/web/` as a sibling feature to the existing pages (Dashboard,
Live Parking, Vehicles, Analytics, Reports, CCTV Control Center, Demo Mode).

**Dependency rule (PROJECT_MEMORY.md §10):**

```
shared → backend → engine → M1 → M2 → M3 → M4 → M5 → M6 (apps/web) → M7 (Digital Twin)
```

M7 consumes M3 (Integration Gateway) via the **existing** WebSocket and REST endpoints.
It never imports backend Python, never calls raw M1/M2 endpoints directly, and never
duplicates occupancy, slot, or session business logic.

---

### 1.2 Existing APIs Consumed by the Digital Twin (No New Endpoints)

All data comes from the existing **Integration Gateway** (`/integration` prefix).

| Data Need | Existing Endpoint | Shape Used |
|-----------|------------------|-----------|
| Initial slot layout | `GET /integration/slots` | `GatewaySlot[]` (`slot_id`, `zone`, `camera_id`, `state`, `is_reserved`) |
| Active sessions (vehicle↔slot) | `GET /integration/sessions?active_only=true` | `GatewaySession[]` (`slot_id`, `license_plate`, `entry_time`, `duration_seconds`) |
| Occupancy summary | `GET /integration/occupancy` | `GatewayOccupancy` (`total_slots`, `free`, `occupied`, `reserved`, `occupancy_rate`) |
| Utilization analytics (Phase 4) | `GET /analytics/utilization` | `UtilizationAnalyticsDTO` (`most_used_slots`, `least_used_slots`, `slot_utilization_percentage`) |
| Live events stream | `WS /integration/ws?channel=occupancy&channel=sessions` | JSON payloads (`VEHICLE_PARKED`, `VEHICLE_DEPARTED`, `VIOLATION_DETECTED`) |

> **Rule:** The Digital Twin MUST NEVER add a new backend endpoint. All data comes from
> the routes above. If a need is unmet, file a backend change entry in PROJECT_MEMORY.md §13 first.

---

### 1.3 Full System Architecture Position

```
     Camera / RTSP / Uploaded Video
                   |
                   v
      M1 — Vehicle Recognition & ANPR
      (YOLOv8 + ByteTrack + PaddleOCR)
                   |
                   v
      M2 — Parking Intelligence Engine
      (Slot Mapping, Occupancy, Sessions, Violations)
                   |
                   v
      M3 — Integration Gateway / Event Bus
      (FastAPI WebSocket /integration/ws + REST /integration/*)
                   |
         <-- Digital Twin listens here -->
                   v
      M7 — Digital Twin (Frontend Module, apps/web/)
      +------------------------------------------+
      |  useDigitalTwinSocket (WS listener)       |
      |             |                             |
      |  Zustand Store (slots: Record<id, state>) |
      |             |                             |
      |  TwinCanvas2D (React Konva) OR            |
      |  TwinCanvas3D (React Three Fiber)         |
      +------------------------------------------+
                   |
                   v
      M6 — Next.js 15 Dashboard (apps/web/)
      New route: /digital-twin
```

---

## 2. Target Parking Lot (Small Lot — Single Floor)

The Digital Twin models a **single-floor, 12-slot parking lot** (2 rows of 6 slots),
matching a typical small parking lot captured by a single CCTV camera.

```
+------------------ PARKING LOT — TOP-DOWN VIEW ------------------+
|                                                                   |
|  [A01]  [A02]  [A03]  [A04]  [A05]  [A06]      <- Row A        |
|                                                                   |
|         DRIVING LANE (centre)                                     |
|                                                                   |
|  [B01]  [B02]  [B03]  [B04]  [B05]  [B06]      <- Row B        |
|                                                                   |
|   [ENTRY >>>]                    [<<< EXIT]                       |
+-------------------------------------------------------------------+
```

- **Total Slots:** 12 (expandable by backend config — layout is data-driven)
- **Zones:** "A" (Row A), "B" (Row B) — from backend `zone` field in `GatewaySlot`
- **Scale:** Matches a single camera's ROI
- **Flexibility:** The layout reads slot_ids and zones directly from the backend.
  No slot IDs are hardcoded in the twin — it adapts to any lot configuration.

---

## 3. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Phase 1: 2D Canvas** | `konva` + `react-konva` | Fast pixel-perfect 2D, no heavy WebGL overhead for MVP |
| **Phase 2: State Store** | `zustand` | O(1) per-slot updates, React + WebGL compatible, zero boilerplate |
| **Phase 3: 3D Engine** | `three` + `@react-three/fiber` + `@react-three/drei` | Native Next.js 15 / React 19 WebGL; GLTF loader; OrbitControls built-in |
| **3D Models** | GLTF/GLB from Poly Pizza (CC-0) | Free, web-optimized, loaded with `useGLTF` from drei |
| **Backend Comms** | Existing `services/parking.ts` + WebSocket pattern from `useParkingWebSocket` | Reuse — do not duplicate |
| **Analytics (Phase 4)** | Existing `services/analytics.ts` + `hooks/useAnalytics.ts` | Reuse — do not duplicate |
| **Stats UI (Phase 4)** | Existing `MetricCard` from `components/analytics/` | Reuse — do not duplicate |

> **Phase 1 rule:** Do NOT add Zustand in Phase 1. Use local React state (same pattern
> as existing parking components). Zustand is introduced in Phase 2 when state must be
> shared across 2D and 3D views simultaneously.

---

## 4. File Structure (All New Files, apps/web/ Only)

```
apps/web/
├── app/
│   └── digital-twin/
│       └── page.tsx                         [NEW Phase 1] Route — /digital-twin
│
├── components/
│   └── digital-twin/
│       ├── twinConfig.ts                    [NEW Phase 1] Canvas size, slot sizes, zone layout constants
│       ├── DigitalTwinView.tsx              [NEW Phase 1] Orchestrator component
│       ├── TwinSummaryBar.tsx               [NEW Phase 1] KPI row (Total/Occupied/Free/Rate)
│       ├── TwinLegend.tsx                   [NEW Phase 1] Color legend strip
│       ├── TwinSlotPopover.tsx              [NEW Phase 1] Click-to-inspect slot card
│       ├── TwinSlot2D.tsx                   [NEW Phase 1] Individual 2D Konva slot shape
│       ├── TwinCanvas2D.tsx                 [NEW Phase 1] React Konva Stage + full lot layout
│       ├── TwinControls.tsx                 [NEW Phase 3] 2D/3D/Heatmap toggle toolbar
│       ├── TwinSlot3DMesh.tsx               [NEW Phase 3] Individual R3F slot Box mesh
│       ├── TwinVehicle3DMesh.tsx            [NEW Phase 3] Low-poly car model spawner
│       ├── TwinCanvas3D.tsx                 [NEW Phase 3] React Three Fiber Canvas
│       ├── TwinHeatmap.tsx                  [NEW Phase 4] Heat map overlay (2D + 3D)
│       └── TwinStatisticsPanel.tsx          [NEW Phase 4] Utilization stats side panel
│
├── hooks/
│   └── useDigitalTwinSocket.ts              [NEW Phase 2] WS listener → Zustand store dispatcher
│
├── store/
│   └── useDigitalTwinStore.ts               [NEW Phase 2] Zustand store (slots, viewMode, heatmap)
│
├── types/
│   └── digitalTwin.ts                       [NEW Phase 2] TwinSlotState, DigitalTwinStore types
│
└── utils/
    └── routes.ts                            [MODIFY Phase 1] Add ROUTES.digitalTwin + NAV_ITEMS entry

apps/web/public/
└── models/
    ├── car_low_poly.glb                     [NEW Phase 3] Free CC-0 low-poly car (Poly Pizza)
    └── parking_lot_ground.glb               [NEW Phase 3] Optional: flat lot GLTF (or use R3F Plane)
```

**Rules:**
- Do NOT create files outside `apps/web/`
- Do NOT create a second `useParking*` hook — reuse `useParkingWebSocket` and `useLiveParking`
- Do NOT create new `SlotDTO` / `SessionDTO` / `OccupancyDTO` — reuse from `types/parking.ts`
- Do NOT create a second `fetchSlots` or `fetchSessions` — reuse `services/parking.ts`

---

## 5. Zustand State Store Model (Phase 2+)

```typescript
// types/digitalTwin.ts

export interface TwinSlotState {
  slot_id: string;
  zone: string;
  camera_id: string;
  status: "free" | "occupied" | "reserved" | "violation" | "unknown";
  license_plate: string | null;
  vehicle_type: string | null;
  occupied_since: string | null;
  duration_seconds: number;
  last_updated: string;
}

export interface DigitalTwinStore {
  // O(1) lookup indexed by slot_id — NEVER replace entire object on event
  slots: Record<string, TwinSlotState>;
  selectedSlotId: string | null;
  viewMode: "2d" | "3d";
  showHeatmap: boolean;
  isConnected: boolean;

  // Actions
  initializeSlots: (slots: TwinSlotState[]) => void;
  updateSlot: (slotId: string, delta: Partial<TwinSlotState>) => void;
  selectSlot: (slotId: string | null) => void;
  setViewMode: (mode: "2d" | "3d") => void;
  toggleHeatmap: () => void;
  setConnected: (connected: boolean) => void;
}
```

**Delta update principle:**

```
WebSocket Event: VEHICLE_PARKED { slot_id: "A04", plate: "KA01AB1234" }
    |
    v
store.updateSlot("A04", { status: "occupied", license_plate: "KA01AB1234" })
    |
    v
Only slots["A04"] is mutated — Zustand shallow comparison
    |
    v
Only <TwinSlot2D slot_id="A04" /> (or TwinSlot3DMesh) re-renders
    |
    v
Remaining 11 slots: NO re-render, NO canvas repaint
```

---

## 6. WebSocket Event Mapping (Phase 2+)

```
WS /integration/ws?channel=occupancy&channel=sessions
    |
    v (raw message)
useDigitalTwinSocket hook

VEHICLE_PARKED event:
  store.updateSlot(payload.slot_id, {
    status: "occupied",
    license_plate: payload.plate,
    occupied_since: payload.time,
    last_updated: new Date().toISOString()
  })

VEHICLE_DEPARTED event:
  store.updateSlot(payload.slot_id, {
    status: "free",
    license_plate: null,
    occupied_since: null,
    duration_seconds: payload.session_duration_seconds,
    last_updated: new Date().toISOString()
  })

VIOLATION_DETECTED event:
  store.updateSlot(payload.slot_id, {
    status: "violation",
    last_updated: new Date().toISOString()
  })
```

---

## 7. Phase Roadmap

---

### PHASE 1 — 2D Interactive Digital Twin (MVP)

**Goal:** A top-down 2D canvas floor plan of the parking lot with live slot status colors,
click-to-inspect, and live WebSocket nudges.

**Scope:**
- New `/digital-twin` route in the sidebar
- React Konva canvas rendering accurate parking lot floor plan (2 rows, 6 slots each)
- Slot color states: Green (free), Red (occupied), Amber (reserved/violation), Grey (unknown)
- Slot label (id) + vehicle plate overlaid when occupied
- Click slot → popover with slot_id, status, plate, entry time, duration
- KPI summary bar above canvas (Total / Occupied / Free / Occupancy %)
- Color legend strip
- Live: uses existing `useLiveParking()` polling + `useParkingWebSocket()` nudges

**New dependencies:** `konva`, `react-konva`

**New files:** 7 (all in `components/digital-twin/` + `app/digital-twin/page.tsx`)

**Modified files:** `utils/routes.ts` (add nav item)

---

### PHASE 2 — Zustand State Engine + Delta Rendering

**Goal:** Replace per-component local state with a centralized Zustand store for O(1)
per-slot delta updates. Prepare architecture for 3D view.

**Scope:**
- `store/useDigitalTwinStore.ts` — Zustand store
- `types/digitalTwin.ts` — state types
- `hooks/useDigitalTwinSocket.ts` — WS listener dispatching delta updates
- Refactor `TwinCanvas2D` and `TwinSlot2D` to subscribe slot-by-slot via Zustand selectors
- Only the changed slot re-renders on each WebSocket event

**New dependencies:** `zustand`

**New files:** 3 (`store/`, `hooks/`, `types/`)

**Modified files:** `TwinCanvas2D.tsx`, `TwinSlot2D.tsx`, `DigitalTwinView.tsx`

---

### PHASE 3 — 3D WebGL View (React Three Fiber)

**Goal:** Add an interactive 3D parking lot view, switchable from 2D via a toolbar toggle.
The 3D view reads from the same Zustand store — no data duplication.

**Scope:**
- `TwinCanvas3D.tsx` — R3F Canvas (`frameloop="demand"` mandatory)
- `TwinSlot3DMesh.tsx` — individual `<Box>` geometry per slot (color from store)
- `TwinVehicle3DMesh.tsx` — low-poly car model (`.glb` or `<Box>` fallback) above occupied slots
- `TwinControls.tsx` — 2D/3D toggle toolbar
- GLTF parking lot ground mesh (`public/models/`)
- OrbitControls (rotate, zoom, pan)
- 2D/3D toggle in `DigitalTwinView`
- TwinCanvas3D wrapped in `React.lazy` + `Suspense` (code-split Three.js ~1MB bundle)

**New dependencies:** `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`

**New files:** 4 (canvas + 2 meshes + controls)

**Modified files:** `DigitalTwinView.tsx`, `twinConfig.ts`, `useDigitalTwinStore.ts`

---

### PHASE 4 — Heat Map + Utilization Statistics Panel

**Goal:** Overlay an occupancy heat map on the 2D/3D view and show a utilization
statistics panel, both sourced from the existing `/analytics/utilization` endpoint.

**Scope:**
- `TwinHeatmap.tsx` — per-slot color gradient overlay (blue→green→yellow→red by utilization %)
- Heat map works in both 2D (Konva layer) and 3D (transparent R3F mesh)
- Toggle button in `TwinControls`
- `TwinStatisticsPanel.tsx` — side panel using existing `MetricCard` component
  (Average Occupancy, Peak Hour, Most/Least Used Slot, Average Duration)
- All data from existing `useAnalyticsDashboard()` hook — no new endpoints

**New dependencies:** None

**New files:** 2

**Modified files:** `DigitalTwinView.tsx`, `TwinControls.tsx`, `useDigitalTwinStore.ts`

---

## 8. Navigation Integration

Add to `utils/routes.ts`:

```typescript
// ROUTES
digitalTwin: "/digital-twin",

// NAV_ITEMS (add after Live Parking)
{
  href: ROUTES.digitalTwin,
  label: "Digital Twin",
  icon: Layers3,          // from lucide-react
}
```

**Full nav order after integration:**
Dashboard · Live Parking · **Digital Twin** · Vehicles · CCTV Control Center · Analytics · Reports · Demo Mode · Settings

---

## 9. Architecture Rules (Binding)

These rules are binding for all M7 Digital Twin development:

1. **No new backend endpoints** — all data from existing `/integration/*` and `/analytics/*` routes.
2. **No occupancy math** — status comes verbatim from backend; the twin never computes it.
3. **No duplicate DTOs** — reuse `SlotDTO`, `SessionDTO`, `OccupancyDTO` from `types/parking.ts`.
4. **No duplicate WebSocket** — `useDigitalTwinSocket` is the only new WS hook for M7; it follows the pattern from `useParkingWebSocket` but owns its own lifecycle.
5. **No duplicate services** — reuse `services/parking.ts` fetchers (`fetchSlots`, `fetchSessions`, `fetchOccupancy`).
6. **No duplicate analytics** — reuse `services/analytics.ts` and `hooks/useAnalytics.ts`.
7. **No duplicate UI components** — reuse `MetricCard`, `Card`, `Badge`, `Button`, `LoadingSpinner` from `components/ui/` and `components/analytics/`.
8. **One state store** — `useDigitalTwinStore` is the single source of truth for M7 state from Phase 2 onwards.
9. **Delta updates only** — `updateSlot` mutates only `slots[slotId]`; never replaces full `slots` record.
10. **No business logic** — the twin renders what the backend says. Never infer or compute slot ownership.
11. **3D canvas on demand** — `<Canvas frameloop="demand">` is mandatory. Never use `frameloop="always"`.
12. **3D bundle code-split** — `TwinCanvas3D` must be wrapped in `React.lazy + Suspense` (Three.js is ~1MB).
13. **Update PROJECT_MEMORY.md §13** — add a change log entry when each phase is completed.

---

## 10. Phase-by-Phase Claude Implementation Prompts

> Paste each prompt in full into a new Claude conversation.
> Read the context files listed in each prompt before Claude begins writing code.

---

### PHASE 1 PROMPT — 2D Interactive Digital Twin

```
You are implementing Phase 1 of the Digital Twin module (M7) for ParkTwin AI.

MANDATORY: Read these files in full before writing a single line of code:
- c:\Users\ASUS\Desktop\parktwin\PROJECT_MEMORY.md  (architecture rules)
- c:\Users\ASUS\Desktop\parktwin\PROJECT_DIGITALTWIN.md  (this module's plan)
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\parking\LiveParkingView.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\parking\ParkingLayout.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\parking\ParkingSlot.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\parking\slotStatus.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\hooks\useLiveParking.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\hooks\useParkingWebSocket.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\services\parking.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\types\parking.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\utils\routes.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\package.json

TASK: Build Phase 1 of the Digital Twin — a 2D interactive canvas view of a small parking lot.

WHAT TO BUILD (exactly, in this order):

1. Install konva and react-konva into apps/web/package.json dependencies.

2. Create apps/web/components/digital-twin/twinConfig.ts:
   - Export: TWIN_CANVAS_WIDTH = 820, TWIN_CANVAS_HEIGHT = 380
   - Export: SLOT_W = 90, SLOT_H = 60, SLOT_GAP = 12
   - Export: ROW_A_Y = 60, ROW_B_Y = 240 (top-left Y coords of each row)
   - Export: ROW_START_X = 60 (left margin)
   - Export: LANE_Y_MID = 160 (y centre of driving lane label)
   - Export: ENTRY_X = 80, EXIT_X = 680 (entry/exit label x positions, bottom of canvas)
   - Export: ZONES = ["A", "B"] and SLOTS_PER_ROW = 6
   - Export: getSlotPosition(slotId: string): { x: number; y: number } — derives x,y from
     the slot_id suffix (A01..A06 → row A, B01..B06 → row B). Position = (ROW_START_X + (index * (SLOT_W + SLOT_GAP)), ROW_A_Y or ROW_B_Y).
     If slot_id does not match the pattern, return { x: 0, y: 0 }.

3. Create apps/web/app/digital-twin/page.tsx:
   - Server component. export const metadata = { title: "Digital Twin — ParkTwin AI" }.
   - import dynamic from "next/dynamic"; const DigitalTwinView = dynamic(() => import("@/components/digital-twin/DigitalTwinView"), { ssr: false });
   - Renders <DigitalTwinView /> (Konva requires no-SSR).

4. Create apps/web/components/digital-twin/TwinLegend.tsx:
   - A horizontal strip of 5 color swatches with labels:
     Green (#22c55e) = Free, Red (#ef4444) = Occupied, Amber (#f59e0b) = Reserved,
     Yellow (#eab308) = Violation, Slate (#64748b) = Unknown.
   - Uses only standard HTML/Tailwind — no Konva.

5. Create apps/web/components/digital-twin/TwinSummaryBar.tsx:
   - Props: occupancy: GatewayOccupancy | null, isLoading: boolean.
   - Reuse Card + Skeleton from components/ui/.
   - Shows 4 tiles: Total Slots, Occupied, Free, Occupancy %.
   - Skeleton loading state when isLoading.

6. Create apps/web/components/digital-twin/TwinSlotPopover.tsx:
   - Props: slotView: ParkingSlotView | null, onClose: () => void.
   - Renders a Card overlay (absolute position) showing:
     slot_id, status badge (matching SLOT_STATUS_CONFIG colors from components/parking/slotStatus.ts),
     license_plate (or "—"), entry_time formatted (formatDateTime from lib/format.ts),
     duration (formatDuration), vehicle_type (or "—"), a Close button.
   - Returns null when slotView is null.

7. Create apps/web/components/digital-twin/TwinSlot2D.tsx:
   - Uses react-konva. "use client" is NOT needed (Canvas2D parent handles it).
   - Props: slotView: ParkingSlotView, x: number, y: number, isSelected: boolean, onSelect: () => void.
   - Renders a Konva <Group> containing:
     * <Rect> (width=SLOT_W, height=SLOT_H, cornerRadius=6, stroke, fill based on status):
       free → fill "#bbf7d0" stroke "#22c55e", occupied → fill "#fecaca" stroke "#ef4444",
       reserved → fill "#fde68a" stroke "#f59e0b", violation → fill "#fef08a" stroke "#eab308",
       unknown → fill "#e2e8f0" stroke "#94a3b8". Selected: strokeWidth=3, else strokeWidth=1.5.
     * <Text> slot_id (top-left, bold, small font, color matching stroke).
     * <Text> license_plate truncated to 10 chars (center, if occupied/reserved).
   - onClick calls onSelect. cursor="pointer". React.memo.

8. Create apps/web/components/digital-twin/TwinCanvas2D.tsx:
   - "use client". Imports Stage, Layer from "react-konva".
   - Props: views: ParkingSlotView[], selectedSlotId: string | null, onSlotSelect: (id: string | null) => void.
   - Renders a <div style={{ overflowX: "auto" }}> containing a Konva <Stage width={TWIN_CANVAS_WIDTH} height={TWIN_CANVAS_HEIGHT}>.
   - Inside one <Layer>:
     * Background <Rect> (full canvas, fill "#0f172a" — dark parking lot ground).
     * Driving lane <Rect> (x=0, y=130, width=TWIN_CANVAS_WIDTH, height=70, fill="#1e293b").
     * <Text> "DRIVING LANE" centered in lane (fill="#475569", fontStyle="italic").
     * Row labels: <Text> "Row A" at (ROW_START_X - 45, ROW_A_Y + 20) and "Row B" at same x, ROW_B_Y + 20 (fill="#94a3b8").
     * Entry/Exit labels: <Text> "ENTRY >>>" at bottom-left, "<<< EXIT" at bottom-right (fill="#4ade80").
     * One <TwinSlot2D> per view, using getSlotPosition(view.slot.slot_id) for x,y. Pass isSelected and onSelect.
   - Background click (on Stage) calls onSlotSelect(null) to deselect.

9. Create apps/web/components/digital-twin/DigitalTwinView.tsx:
   - "use client". Orchestrator.
   - Uses useLiveParking(undefined, 5000) from hooks/useLiveParking.ts (existing hook).
   - Uses useParkingWebSocket({ channels: ["occupancy", "sessions"], enabled: true }) (existing hook).
   - Local state: selectedSlotId (string | null).
   - Renders:
     * <header> with h1 "Digital Twin", description "Real-time virtual replica of the parking facility", Refresh button.
     * <TwinSummaryBar occupancy={occupancy} isLoading={isLoading} />.
     * <Card> containing: loading skeleton | error state | empty state | <TwinCanvas2D> + <TwinLegend>.
     * <TwinSlotPopover view={selectedView} onClose={() => setSelectedSlotId(null)} />.
   - selectedView = views.find(v => v.slot.slot_id === selectedSlotId) ?? null.

10. Modify apps/web/utils/routes.ts:
    - Add ROUTES.digitalTwin = "/digital-twin".
    - Add NAV_ITEMS entry: { href: ROUTES.digitalTwin, label: "Digital Twin", icon: Layers3 }
      (import Layers3 from "lucide-react"). Place it after the Live Parking nav item.

ARCHITECTURE CONSTRAINTS (from PROJECT_MEMORY.md and PROJECT_DIGITALTWIN.md):
- Do NOT create any new WebSocket hook — reuse useParkingWebSocket.
- Do NOT create any new parking service or type — reuse services/parking.ts and types/parking.ts.
- Do NOT duplicate slot status colors — use the same semantic palette as SLOT_STATUS_CONFIG.
- Do NOT add any business logic — all slot status comes from the backend verbatim.
- Do NOT create any backend files, Python files, or new API endpoints.
- ALL new components go in apps/web/components/digital-twin/ (new subfolder).

VERIFICATION (run these after completing all files):
cd c:\Users\ASUS\Desktop\parktwin\apps\web
npm run build       -> must pass with 0 errors, /digital-twin route in output
npm run typecheck   -> must pass with 0 errors
npm run lint        -> must pass with 0 warnings/errors
```

---

### PHASE 2 PROMPT — Zustand State Engine + Delta Rendering

```
You are implementing Phase 2 of the Digital Twin module (M7) for ParkTwin AI.

MANDATORY: Read these files in full before writing a single line of code:
- c:\Users\ASUS\Desktop\parktwin\PROJECT_MEMORY.md
- c:\Users\ASUS\Desktop\parktwin\PROJECT_DIGITALTWIN.md
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\DigitalTwinView.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\TwinCanvas2D.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\TwinSlot2D.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\hooks\useParkingWebSocket.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\services\parking.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\types\parking.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\package.json

TASK: Introduce Zustand state store and delta rendering into the Digital Twin (Phase 2).

WHAT TO BUILD (exactly, in this order):

1. Install zustand into apps/web/package.json dependencies.

2. Create apps/web/types/digitalTwin.ts:
   Export TwinSlotState interface: { slot_id: string; zone: string; camera_id: string;
   status: "free" | "occupied" | "reserved" | "violation" | "unknown";
   license_plate: string | null; vehicle_type: string | null;
   occupied_since: string | null; duration_seconds: number; last_updated: string; }
   Export DigitalTwinStore interface with all fields and action signatures from
   PROJECT_DIGITALTWIN.md §5.

3. Create apps/web/store/useDigitalTwinStore.ts:
   - Zustand store implementing DigitalTwinStore.
   - initializeSlots: accepts (slots: SlotDTO[], sessions: SessionDTO[]) — joins on slot_id
     (session where is_active=true), builds Record<string, TwinSlotState>.
   - updateSlot: does state.slots[slotId] = { ...state.slots[slotId], ...delta } — never
     replaces the full slots object.
   - selectSlot, setViewMode, toggleHeatmap, setConnected: straightforward setters.
   - Import SlotDTO, SessionDTO from "@/types/parking" — DO NOT re-declare them.

4. Create apps/web/hooks/useDigitalTwinSocket.ts:
   - Opens WebSocket to process.env.NEXT_PUBLIC_API_BASE.replace("http", "ws") +
     "/integration/ws?channel=occupancy&channel=sessions".
   - On message: parse JSON. Match event_type:
     "VEHICLE_PARKED"    → updateSlot(payload.slot_id, { status:"occupied", license_plate:payload.plate, occupied_since:payload.time, last_updated: new Date().toISOString() })
     "VEHICLE_DEPARTED"  → updateSlot(payload.slot_id, { status:"free", license_plate:null, occupied_since:null, duration_seconds:payload.session_duration_seconds, last_updated: new Date().toISOString() })
     "VIOLATION_DETECTED"→ updateSlot(payload.slot_id, { status:"violation", last_updated: new Date().toISOString() })
   - On open: setConnected(true). On close/error: setConnected(false). Auto-reconnect
     with 3s delay (max 5 retries). Cleanup on unmount. Returns void.

5. Refactor apps/web/components/digital-twin/TwinSlot2D.tsx:
   - Remove the slotView prop from parent.
   - Subscribe individually: const slotState = useDigitalTwinStore(state => state.slots[slot_id]).
   - Props become: slot_id: string, x: number, y: number (position only — state from store).
   - Derive label, color, plate from slotState (or "unknown" defaults if undefined).
   - Keep React.memo.

6. Refactor apps/web/components/digital-twin/TwinCanvas2D.tsx:
   - Remove views prop from parent.
   - Read slot_ids from store: const slotIds = useDigitalTwinStore(state => Object.keys(state.slots)).
   - Pass only slot_id to each TwinSlot2D (position derived from twinConfig.getSlotPosition).
   - Canvas re-renders only when slot_ids list changes (shallow compare via zustand).

7. Refactor apps/web/components/digital-twin/DigitalTwinView.tsx:
   - On mount (useEffect): call fetchSlots() and fetchSessions() from services/parking.ts,
     then store.initializeSlots(slots, sessions).
   - Replace useLiveParking() with: const slots = useDigitalTwinStore(state => state.slots).
   - Start useDigitalTwinSocket() in the component body.
   - Keep fetchOccupancy() via a separate useQuery for TwinSummaryBar.
   - Remove useLiveParking import (no longer used).
   - Keep useParkingWebSocket for live nudges (it invalidates REST queries).

ARCHITECTURE RULES:
- updateSlot MUST only mutate slots[slotId] — never spread or replace full slots object.
- Do NOT re-declare fetchSlots, fetchSessions — import from "@/services/parking".
- Do NOT re-declare SlotDTO, SessionDTO — import from "@/types/parking".
- useDigitalTwinSocket is the ONLY place that dispatches WS events to the store.
- No backend changes, no new API endpoints.

VERIFICATION:
cd c:\Users\ASUS\Desktop\parktwin\apps\web
npm run build       -> must pass ✓
npm run typecheck   -> must pass ✓
npm run lint        -> must pass ✓
Manual check: In React DevTools, confirm only 1 TwinSlot2D re-renders when a single
slot's state changes in the store (not all 12).
```

---

### PHASE 3 PROMPT — 3D WebGL View (React Three Fiber)

```
You are implementing Phase 3 of the Digital Twin module (M7) for ParkTwin AI.

MANDATORY: Read these files in full before writing a single line of code:
- c:\Users\ASUS\Desktop\parktwin\PROJECT_MEMORY.md
- c:\Users\ASUS\Desktop\parktwin\PROJECT_DIGITALTWIN.md
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\DigitalTwinView.tsx  (Phase 2)
- c:\Users\ASUS\Desktop\parktwin\apps\web\store\useDigitalTwinStore.ts                 (Phase 2)
- c:\Users\ASUS\Desktop\parktwin\apps\web\types\digitalTwin.ts                         (Phase 2)
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\twinConfig.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\package.json

TASK: Add the 3D WebGL view of the parking lot (React Three Fiber), switchable from 2D.

WHAT TO BUILD (exactly, in this order):

1. Install packages into apps/web:
   Dependencies: three @react-three/fiber @react-three/drei
   DevDependencies: @types/three

2. Update apps/web/components/digital-twin/twinConfig.ts:
   Add SLOT_3D_POSITIONS: Record<string, { x: number; z: number }>
   A 6x2 grid of 12 slots mapped as follows (world units, spacing 1.2):
   A01→{x:-3.0, z:-1.5}, A02→{x:-1.8, z:-1.5}, A03→{x:-0.6, z:-1.5},
   A04→{x:0.6,  z:-1.5}, A05→{x:1.8,  z:-1.5}, A06→{x:3.0,  z:-1.5},
   B01→{x:-3.0, z:1.5},  B02→{x:-1.8, z:1.5},  B03→{x:-0.6, z:1.5},
   B04→{x:0.6,  z:1.5},  B05→{x:1.8,  z:1.5},  B06→{x:3.0,  z:1.5}
   Export STATUS_3D_COLORS: Record<TwinSlotState["status"], string> mapping:
   free→"#22c55e", occupied→"#ef4444", reserved→"#f59e0b", violation→"#eab308", unknown→"#64748b"

3. Create apps/web/components/digital-twin/TwinSlot3DMesh.tsx:
   - "use client". React.memo.
   - Props: slot_id: string (position and state from store + twinConfig).
   - Subscribes: const slotState = useDigitalTwinStore(state => state.slots[slot_id]).
   - const pos = SLOT_3D_POSITIONS[slot_id] ?? { x: 0, z: 0 }.
   - Renders a <mesh position={[pos.x, 0.05, pos.z]} onClick={() => store.selectSlot(slot_id)}>
       <boxGeometry args={[1.0, 0.1, 0.65]} />
       <meshStandardMaterial color={STATUS_3D_COLORS[slotState?.status ?? "unknown"]} />
     </mesh>
   - Shows a white <Text> (from @react-three/drei) above the slot with slot_id label.
   - If selected (selectedSlotId === slot_id): add an emissive glow (emissive: same color, emissiveIntensity: 0.4).

4. Create apps/web/components/digital-twin/TwinVehicle3DMesh.tsx:
   - "use client". React.memo.
   - Props: slot_id: string.
   - Subscribes to store: renders only if slotState.status === "occupied".
   - Uses a <mesh position={[pos.x, 0.35, pos.z]}>
       <boxGeometry args={[0.7, 0.3, 0.45]} />
       <meshStandardMaterial color="#1d4ed8" />
     </mesh>
   - (Simplified car shape: use a box for MVP; a GLB model can be swapped in later)
   - Returns null if not occupied.

5. Create apps/web/components/digital-twin/TwinCanvas3D.tsx:
   - "use client".
   - Renders an R3F <Canvas style={{ width: "100%", height: "500px" }}
       camera={{ position: [0, 8, 7], fov: 50 }}
       frameloop="demand"   <- MANDATORY
       shadows>
     Inside the Canvas:
     * <ambientLight intensity={0.5} />
     * <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
     * <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2.4} />
     * Ground plane: <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
         <planeGeometry args={[9, 5.5]} />
         <meshStandardMaterial color="#1e293b" />
       </mesh>
     * Lane marker: <mesh position={[0, 0.01, 0]}>
         <planeGeometry args={[9, 0.06]} />
         <meshStandardMaterial color="#334155" />
       </mesh>
     * {Object.keys(store.slots).map(id => <TwinSlot3DMesh key={id} slot_id={id} />)}
     * {occupiedSlotIds.map(id => <TwinVehicle3DMesh key={id} slot_id={id} />)}
     * Selected slot HTML popover: use <Html> from @react-three/drei if selectedSlotId != null,
       positioned above the selected slot, showing plate + duration.
   - Reads slot list from useDigitalTwinStore(state => Object.keys(state.slots)).

6. Create apps/web/components/digital-twin/TwinControls.tsx:
   - "use client". Reads viewMode from store.
   - Renders two toggle buttons: "2D" (Grid2x2 icon) and "3D" (Box icon) from lucide-react.
   - Active button gets bg-primary text-primary-foreground. Inactive gets variant="outline".
   - Calls store.setViewMode("2d") or store.setViewMode("3d") on click.
   - Reuse Button from @/components/ui/button.

7. Update apps/web/store/useDigitalTwinStore.ts:
   - Add viewMode: "2d" | "3d" field (default: "2d").
   - Add setViewMode action.

8. Update apps/web/components/digital-twin/DigitalTwinView.tsx:
   - Add import for TwinControls.
   - Add lazy loading: const TwinCanvas3D = dynamic(() => import("./TwinCanvas3D"), { ssr: false }).
   - Render TwinControls above the card containing the canvas.
   - Conditionally render: viewMode === "2d" ? <TwinCanvas2D /> : <TwinCanvas3D />.
   - Wrap TwinCanvas3D render in <Suspense fallback={<LoadingSpinner />}>.

CRITICAL RULES:
- frameloop="demand" is MANDATORY on <Canvas> — never use "always".
- TwinSlot3DMesh MUST subscribe individually via useDigitalTwinStore selector — NOT receive
  a full slots prop. This ensures O(1) delta rendering in WebGL.
- TwinCanvas3D MUST be loaded with next/dynamic ssr:false (R3F requires browser).
- No new API endpoints. No backend changes. No duplicate state.

VERIFICATION:
cd c:\Users\ASUS\Desktop\parktwin\apps\web
npm run build       -> must pass ✓, Three.js in a separate async chunk (not in main bundle)
npm run typecheck   -> must pass ✓
npm run lint        -> must pass ✓
Manual: Toggle 2D → 3D, both views show same slot states. Click a 3D slot: popover appears.
Manual: A slot color changes in 3D when a WebSocket event arrives (no full scene repaint).
```

---

### PHASE 4 PROMPT — Heat Map + Utilization Statistics

```
You are implementing Phase 4 of the Digital Twin module (M7) for ParkTwin AI.

MANDATORY: Read these files in full before writing a single line of code:
- c:\Users\ASUS\Desktop\parktwin\PROJECT_MEMORY.md
- c:\Users\ASUS\Desktop\parktwin\PROJECT_DIGITALTWIN.md
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\DigitalTwinView.tsx  (Phase 3)
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\digital-twin\TwinControls.tsx     (Phase 3)
- c:\Users\ASUS\Desktop\parktwin\apps\web\store\useDigitalTwinStore.ts                 (Phase 3)
- c:\Users\ASUS\Desktop\parktwin\apps\web\services\analytics.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\hooks\useAnalytics.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\types\analytics.ts
- c:\Users\ASUS\Desktop\parktwin\apps\web\components\analytics\MetricCard.tsx
- c:\Users\ASUS\Desktop\parktwin\apps\web\package.json

TASK: Add a heat map overlay and utilization statistics panel to the Digital Twin (Phase 4).

WHAT TO BUILD (exactly, in this order):

1. Update apps/web/store/useDigitalTwinStore.ts:
   - Add showHeatmap: boolean field (default: false).
   - Add toggleHeatmap(): void action (toggle showHeatmap).

2. Create apps/web/components/digital-twin/TwinHeatmap.tsx:
   - "use client".
   - Fetches utilization data using the EXISTING useAnalyticsDashboard() from hooks/useAnalytics.ts.
     DO NOT create a new hook or fetcher.
   - Builds a utilizationMap: Record<string, number> from UtilizationAnalyticsDTO:
     * most_used_slots and least_used_slots are arrays of { slot_id, count, utilization_percentage }.
     * Merge them into a single map of slot_id → utilization_percentage (0–100).
   - Exports a helper heatColor(pct: number): string that maps:
     0–20 → "#3b82f6" (blue, low), 20–40 → "#22c55e" (green), 40–60 → "#eab308" (yellow),
     60–80 → "#f97316" (orange), 80–100 → "#ef4444" (red, high).
   - For 2D (Konva): exports a <TwinHeatmap2DLayer> component that renders a Konva <Layer>
     with one semi-transparent <Rect> per slot (same position as TwinSlot2D, fill=heatColor,
     opacity=0.55). Only renders when showHeatmap === true.
   - For 3D (R3F): exports a <TwinHeatmap3DOverlay> component that renders one <mesh> per slot
     (same position as TwinSlot3DMesh but slightly elevated y=0.12, fill=heatColor, transparent
     with opacity=0.5). Only renders when showHeatmap === true.

3. Update apps/web/components/digital-twin/TwinCanvas2D.tsx:
   - Add <TwinHeatmap2DLayer utilizationMap={utilizationMap} /> inside the Konva <Stage>
     after the slot layer. The heatmap layer renders on top of the slots.
   - Reads showHeatmap from store to pass to the layer.

4. Update apps/web/components/digital-twin/TwinCanvas3D.tsx:
   - Add <TwinHeatmap3DOverlay utilizationMap={utilizationMap} /> inside the R3F <Canvas>.

5. Update apps/web/components/digital-twin/TwinControls.tsx:
   - Add a third toggle button: "Heat Map" (Flame icon from lucide-react).
   - Active state when store.showHeatmap === true.
   - Calls store.toggleHeatmap() on click.

6. Create apps/web/components/digital-twin/TwinStatisticsPanel.tsx:
   - "use client".
   - Uses existing useAnalyticsDashboard() — DO NOT create a new hook.
   - Renders 5 MetricCard components (import from "@/components/analytics/MetricCard"):
     * Average Occupancy: from OccupancyAnalyticsDTO.average_occupancy_percentage + "%"
     * Peak Hour: from TrafficAnalyticsDTO.peak_hour
     * Most Used Slot: from UtilizationAnalyticsDTO.most_used_slots[0].slot_id + " (" + pct + "%)"
     * Least Used Slot: from UtilizationAnalyticsDTO.least_used_slots[0].slot_id + " (" + pct + "%)"
     * Avg Session Duration: from TrendsAnalyticsDTO.session_statistics.avg_duration formatted by formatDuration
   - Shows Skeleton loading placeholders when isLoading.
   - Shows EmptyState when no data.

7. Update apps/web/components/digital-twin/DigitalTwinView.tsx:
   - Add TwinStatisticsPanel.
   - Layout: <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="lg:col-span-2"> {canvas card} </div>
       <div> <TwinStatisticsPanel /> </div>
     </div>
   - The heat map toggle in TwinControls is already wired to the store.

ARCHITECTURE RULES:
- DO NOT create any new analytics fetcher or hook — reuse useAnalyticsDashboard() exactly.
- DO NOT create a new MetricCard — import from "@/components/analytics/MetricCard".
- DO NOT invent utilization numbers — render "—" when a slot has no analytics data.
- If a slot_id from the twin is absent in utilizationMap, render it with "#3b82f6" (blue = no data).
- No new API endpoints, no backend changes.

VERIFICATION:
cd c:\Users\ASUS\Desktop\parktwin\apps\web
npm run build       -> must pass ✓
npm run typecheck   -> must pass ✓
npm run lint        -> must pass ✓
Manual: Toggle "Heat Map" on → slots show gradient colors. Toggle off → live status colors return.
Manual: Statistics panel shows real values from /analytics/utilization (or graceful "—" if empty).
Manual: Heat map works in both 2D and 3D view mode.
```

---

## 11. Dependency Install Commands

Run these in order, one phase at a time:

```powershell
# Phase 1
cd c:\Users\ASUS\Desktop\parktwin\apps\web
npm install konva react-konva

# Phase 2
npm install zustand

# Phase 3
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three

# Phase 4 — no new packages
```

---

## 12. Change Log (M7 Digital Twin)

Record every phase completion here. Update PROJECT_MEMORY.md §13 simultaneously.

| 2026-07-30 | Phase 1: 2D Canvas MVP | app/digital-twin/page.tsx, components/digital-twin/ (twinConfig.ts, TwinLegend.tsx, TwinSummaryBar.tsx, TwinSlotPopover.tsx, TwinSlot2D.tsx, TwinCanvas2D.tsx, DigitalTwinView.tsx, DigitalTwinClientWrapper.tsx) | utils/routes.ts, package.json | Complete |
| 2026-07-30 | Phase 2: Zustand + Delta | store/useDigitalTwinStore.ts, hooks/useDigitalTwinSocket.ts, types/digitalTwin.ts | TwinCanvas2D, TwinSlot2D, DigitalTwinView, package.json | Complete |
| 2026-07-30 | Phase 3: 3D WebGL | components/digital-twin/ (TwinSlot3DMesh.tsx, TwinVehicle3DMesh.tsx, TwinCanvas3D.tsx, TwinControls.tsx) | DigitalTwinView.tsx, twinConfig.ts, package.json | Complete |
| 2026-07-30 | Phase 4: Heatmap + Stats | TwinHeatmap.tsx, TwinStatisticsPanel.tsx | TwinControls, TwinCanvas2D, TwinCanvas3D, DigitalTwinView | Complete |

---

## 13. Professor Presentation Statement

> "In ParkTwin AI, the Digital Twin (Module 7) is a live virtual model of the parking lot
> that mirrors the real parking area in real time. Vehicle detection and number plate
> recognition are performed by the ANPR module (M1). The Parking Intelligence Engine (M2)
> determines slot occupancy and vehicle-to-slot mapping. The Integration Gateway (M3)
> broadcasts these state changes over WebSocket. The Digital Twin (M7) subscribes to these
> events and updates a 2D canvas or 3D WebGL scene — showing each parking slot's live status
> (green = free, red = occupied, amber = reserved), vehicle positions, and utilization heat
> maps — without performing any AI inference itself. This allows operators to monitor parking
> occupancy, vehicle movement, and analytics through a single interactive real-time dashboard."

