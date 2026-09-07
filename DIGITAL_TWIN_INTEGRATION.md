# ParkTwin AI — Digital Twin Frontend & Backend Integration Specification

## 1. Overview & Architectural Boundaries

The ParkTwin AI Digital Twin (`apps/web/app/digital-twin/page.tsx`) provides an interactive, live 2D vector replica of the Carparking-01 B2 facility (Level 78.75). It strictly mirrors real-time physical telemetry from the backend intelligence layer without hardcoded mock states.

### Architectural Separation
* **Backend Intelligence Layer**: Video Library, Camera Designation, Multi-Camera CV Processing (YOLOv8 + ByteTrack + PaddleOCR), Parking Intelligence (Slot Detector, Occupancy Manager, Session Engine), Dijkstra Navigation Engine, and WebSocket Bus.
* **Frontend Digital Twin Layer** (`apps/web/components/digital-twin/`): SVG Facility Map, Status Polling Fallbacks, Real-time WebSocket Ingestion, Dijkstra Route Animation, Dynamic Camera Role Badging, Vehicle & Slot Slide-Over Drawers, and Live CCTV Snippet Players.

```
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Backend (:8000)                     │
│  - CV Engine (YOLOv8 + ByteTrack + PaddleOCR)              │
│  - Parking Intelligence (SlotManager, SessionManager)       │
│  - Dijkstra Navigation Service                             │
│  - WebSocket Bus (/ws/parking, /ws/digital-twin)           │
└──────────────┬───────────────────────────────▲──────────────┘
               │ REST Data & WS Push           │ User Actions
               ▼                               │ (Reset / Replay)
┌──────────────────────────────────────────────┴──────────────┐
│                Next.js Web Frontend (:3000)                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ DigitalTwinView (Orchestrator)                        │  │
│  │   ├── TwinKPIs (Total, Free, Occupied, CCTV Status)    │  │
│  │   ├── FacilityMap (1000x750 L-Shaped SVG Canvas)     │  │
│  │   │     ├── L-Shape Concrete Facility Boundary        │  │
│  │   │     ├── Road Network, Bumpers, Gates             │  │
│  │   │     ├── ParkingSlotMarker (P01–P10)              │  │
│  │   │     ├── CameraMarker (CAM-01, CAM-02, CAM-03)     │  │
│  │   │     ├── VehicleMarker (Active tracked vehicles)  │  │
│  │   │     └── NavigationRoute (Dijkstra polyline)       │  │
│  │   ├── VehicleDetailDrawer (Telemetry + CCTV video)    │  │
│  │   ├── SlotDetailDrawer (Timer + Navigation trigger)   │  │
│  │   ├── CameraDetailModal (Full-res live CCTV player)   │  │
│  │   └── MultiCameraControlCenter (3-station stream hub) │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. REST API Integration Contracts

The frontend interacts with the backend via `@/services/digitalTwin.ts` and `@/services/parking.ts`.

### 2.1 Slots Endpoint
* **Endpoint**: `GET /api/v1/parking/slots` (or `/slots`)
* **Response Model**: `SlotDTO[]`
```json
[
  {
    "slot_id": "P01",
    "zone": "A",
    "status": "occupied",
    "occupied": true,
    "confidence": 0.94,
    "vehicle_plate": "MH12AB1234",
    "camera_id": "CAM-02",
    "updated_at": "2026-09-04T12:00:00Z"
  }
]
```
* **Frontend Handling**: Synchronized into `useDigitalTwinStore.initializeSlots()`, mapping backend statuses (`free`, `occupied`, `reserved`, `violation`) to calibrated SVG coordinates and color palettes.

### 2.2 Active Sessions Endpoint
* **Endpoint**: `GET /api/v1/parking/sessions?is_active=true&limit=200`
* **Response Model**: `SessionDTO[]`
```json
[
  {
    "session_id": "sess-4821",
    "license_plate": "MH12AB1234",
    "slot_id": "P01",
    "entry_time": "2026-09-04T10:15:00Z",
    "exit_time": null,
    "duration_minutes": 105,
    "is_active": true,
    "camera_id": "CAM-01",
    "confidence": 0.95
  }
]
```
* **Frontend Handling**: Correlated with `selectedSlotId` and `selectedVehicleId` in drawers to calculate live elapsed billing timers and entrance timestamps.

### 2.3 Tracked Vehicles Endpoint
* **Endpoint**: `GET /api/v1/vehicles?limit=50`
* **Response Model**: `TwinVehicleState[]`
```json
[
  {
    "vehicle_id": "veh-01",
    "license_plate": "MH12AB1234",
    "status": "parked",
    "slot_id": "P01",
    "x": 605,
    "y": 140,
    "heading": 180,
    "color": "#e2e8f0",
    "vehicle_type": "sedan",
    "brand": "Toyota",
    "confidence": 0.95,
    "camera_id": "CAM-02"
  }
]
```
* **Frontend Handling**: Directly placed on the SVG road lanes or bay markers via `VehicleMarker.tsx` with smooth transition animations.

### 2.4 Cameras & Dynamic Role Designation
* **Endpoint**: `GET /api/v1/cameras`
* **Update Endpoint**: `PUT /api/v1/cameras/{camera_id}`
* **Response Model**: `TwinCameraState[]`
```json
[
  {
    "camera_id": "CAM-01",
    "name": "B2 Entry Gate",
    "role": "ENTRY",
    "designated_role": "ENTRY",
    "status": "online",
    "stream_url": "/videos/cam1_entry_gate.mp4",
    "coverage_slots": [],
    "x": 80,
    "y": 205,
    "angle": 0,
    "fov": 65
  },
  {
    "camera_id": "CAM-02",
    "name": "B2 Parking Bays (Zone A)",
    "role": "PARKING_LOT",
    "designated_role": "PARKING_LOT",
    "status": "online",
    "stream_url": "/videos/cam2_parking_bay.mp4",
    "coverage_slots": ["P01", "P02", "P03", "P04", "P05"],
    "x": 395,
    "y": 205,
    "angle": -90,
    "fov": 75
  },
  {
    "camera_id": "CAM-03",
    "name": "B2 Exit Ramp (Zone B)",
    "role": "EXIT",
    "designated_role": "EXIT",
    "status": "online",
    "stream_url": "/videos/cam3_exit_ramp.mp4",
    "coverage_slots": ["P06", "P07", "P08", "P09", "P10"],
    "x": 825,
    "y": 510,
    "angle": 180,
    "fov": 70
  }
]
```

### 2.5 Dijkstra Navigation Pathfinding
* **Endpoint**: `GET /api/v1/navigation/route?from_node={fromNode}&to_node={toNode}`
* **Response Model**: `RouteData`
```json
{
  "from_node": "ENTRY_GATE",
  "to_node": "P01",
  "path": ["ENTRY_GATE", "LANE_NORTH_1", "LANE_NORTH_2", "P01"],
  "total_distance": 42.0,
  "estimated_time_seconds": 15,
  "turn_by_turn": [
    "Proceed straight past the Entry Boom Barrier",
    "Continue East along North Main Drive Aisle (30m)",
    "Turn left into Parking Stall P01 (Zone A)"
  ]
}
```
* **Frontend Handling**: Transformed into calibrated SVG coordinates via `FACILITY_WAYPOINTS` and rendered with `NavigationRoute.tsx` (animated dash stroke, junction dots, and distance pill).

### 2.6 Scenario Replay & Reset
* **Replay**: `POST /api/v1/replay?scenario=monday`
* **Reset**: `POST /api/v1/reset`
* Triggers deterministic scenario simulation or clears memory states, immediately followed by TanStack Query invalidation across all frontend caches.

---

## 3. Real-Time WebSocket Event Bus

The frontend connects to the WebSocket stream at `ws://localhost:8000/ws/digital-twin` (or `/ws/parking`) via `useDigitalTwinSocket.ts`.

### 3.1 Event Contracts

#### 1. `slot_update`
Dispatched whenever a vehicle enters, parks, or vacates a slot:
```json
{
  "type": "slot_update",
  "timestamp": "2026-09-04T12:05:30Z",
  "data": {
    "slot_id": "P04",
    "status": "occupied",
    "occupied": true,
    "confidence": 0.96,
    "vehicle_plate": "DL01XY9999",
    "camera_id": "CAM-02"
  }
}
```
* **Store Action**: Updates `slots[slot_id]` in `useDigitalTwinStore` with zero page re-renders.

#### 2. `vehicle_detected`
Dispatched when ANPR or ByteTrack identifies a vehicle in transit:
```json
{
  "type": "vehicle_detected",
  "timestamp": "2026-09-04T12:05:32Z",
  "data": {
    "vehicle_id": "veh-04",
    "license_plate": "DL01XY9999",
    "status": "moving",
    "x": 520,
    "y": 205,
    "heading": 90,
    "color": "#3b82f6",
    "camera_id": "CAM-01"
  }
}
```
* **Store Action**: Upserts `vehicles[vehicle_id]` in `useDigitalTwinStore`.

#### 3. `camera_status`
Dispatched when a CCTV stream health changes or role is reassigned:
```json
{
  "type": "camera_status",
  "timestamp": "2026-09-04T12:05:35Z",
  "data": {
    "camera_id": "CAM-03",
    "status": "online",
    "role": "EXIT"
  }
}
```

---

## 4. State Management (Zustand Store Architecture)

All digital twin state is centralized in `apps/web/store/useDigitalTwinStore.ts`:

```typescript
interface DigitalTwinStore {
  slots: Record<string, TwinSlotState>;
  vehicles: Record<string, TwinVehicleState>;
  cameras: Record<string, TwinCameraState>;
  selectedSlotId: string | null;
  selectedVehicleId: string | null;
  selectedCameraId: string | null;
  activeRoute: RouteData | null;
  displayMode: "2d" | "3d";
  showHeatmap: boolean;
  
  // Actions
  initializeSlots: (slots: SlotDTO[], sessions: SessionDTO[]) => void;
  initializeVehicles: (vehicles: TwinVehicleState[]) => void;
  initializeCameras: (cameras: TwinCameraState[]) => void;
  updateSlot: (slotId: string, partial: Partial<TwinSlotState>) => void;
  updateVehicle: (vehicleId: string, partial: Partial<TwinVehicleState>) => void;
  selectSlot: (slotId: string | null) => void;
  selectVehicle: (vehicleId: string | null) => void;
  selectCamera: (cameraId: string | null) => void;
  resetDigitalTwin: () => void;
}
```

---

## 5. Physical Geometry Calibration

The coordinate space is calibrated to the official architectural drawing:
* **Source**: `Floor Plans 03.06.2022.pdf`, Level 78.75 B2
* **Canvas Dimensions**: `1000 × 750` px
* **Scale Ratio**: 1 SVG unit = 0.075 meters (7.5 cm)
* **Orientation**:
  * **Arm 1 (Horizontal / North)**: Extends `(80, 205)` to `(770, 205)` containing Entry Gate, Speed Bumps, Boom Barrier, and Slots `P01`–`P05`.
  * **L-Junction**: Smooth transition curve connecting Arm 1 to Arm 2 at `(770, 205)` -> `(825, 290)`.
  * **Arm 2 (Vertical / East)**: Extends `(825, 290)` to `(825, 640)` containing Slots `P06`–`P10` and Exit Ramp.
  * **Tech Park Obstruction**: Inner reflex void bounded from `(0, 310)` to `(720, 750)`.

This guarantees 1:1 physical accuracy with the real facility while providing high-performance 60 FPS vector rendering on standard desktop and mobile browsers.
