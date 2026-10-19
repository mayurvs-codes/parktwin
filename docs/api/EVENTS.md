# ParkTwin AI — Event Contract & WebSocket Specification
=========================================================

**Version:** 2.0.0 (Canonical 3D, Voice & Wrong-Bay Integration)  
**Author:** ParkTwin Engineering  
**Scope:** Event-driven architecture between Backend CV/AI Engines, WebSocket Gateway, and Next.js / 3D Digital Twin UI.

---

## 1. Provenance & Source Labeling Contract

Every event and data frame emitted by the backend carries an explicit, non-inferred `source` label:

| Label | Meaning | Visual UI Demarcation |
| :--- | :--- | :--- |
| `live` | Real-time CCTV video stream processing on campus hardware | Emerald badge: `LIVE` |
| `replay` | Ground-truth recorded CCTV video playback | Blue badge: `REPLAY` |
| `demo` | Deterministic scripted simulation scenario | Purple/Amber badge: `DEMO` |
| `unavailable` | Service/audio context disabled or offline | Slate badge: `UNAVAILABLE` |
| `unconfigured` | Surveyed hardware lacking camera-to-floor calibration | Gray badge: `UNCONFIGURED` |

---

## 2. Event Registry & Schemas

### 2.1 Bay Entry Detection Events (Module 2 · Kinematic State Machine)

Emitted by `BayEntryDetector` after homography projection and shapely footprint overlap analysis.

#### `BAY_ENTRY_CONFIRMED`
Emitted when a vehicle overlap $\ge 35\%$ is sustained for $\ge 800\text{ms}$ with velocity directed toward the bay.
```json
{
  "event_id": "101:SP-07:1",
  "event_type": "BAY_ENTRY_CONFIRMED",
  "track_id": 101,
  "bay_id": "SP-07",
  "episode_n": 1,
  "source": "live",
  "overlap_ratio": 0.42,
  "speed_mps": 0.85,
  "camera_id": "CAM-02",
  "timestamp": "2026-10-19T10:00:25.100Z"
}
```

#### `BAY_OCCUPIED`
Emitted when vehicle has settled inside the bay ($\ge 70\%$ overlap or speed $< 0.3\text{ m/s}$).
```json
{
  "event_id": "101:SP-07:1",
  "event_type": "BAY_OCCUPIED",
  "track_id": 101,
  "bay_id": "SP-07",
  "episode_n": 1,
  "source": "live",
  "overlap_ratio": 0.88,
  "speed_mps": 0.05,
  "camera_id": "CAM-02",
  "timestamp": "2026-10-19T10:00:30.400Z"
}
```

#### `BAY_EXIT_CONFIRMED`
Emitted when vehicle leaves bay ($\le 15\%$ overlap sustained for $\ge 800\text{ms}$).
```json
{
  "event_id": "101:SP-07:1",
  "event_type": "BAY_EXIT_CONFIRMED",
  "track_id": 101,
  "bay_id": "SP-07",
  "episode_n": 1,
  "source": "live",
  "overlap_ratio": 0.05,
  "speed_mps": 1.45,
  "camera_id": "CAM-02",
  "timestamp": "2026-10-19T10:15:00.000Z"
}
```

---

### 2.2 Wrong-Bay & Policy Violation Events (Module 2 · Violation Engine)

#### `WRONG_BAY_ENTRY_WARNING`
Emitted immediately upon confirmed entry into an unauthorized parking bay.
```json
{
  "event_type": "WRONG_BAY_ENTRY_WARNING",
  "episode_id": "VE-7a8b9c0d1e",
  "vehicle_id": "VEH-001",
  "license_plate": "KA01MJ5001",
  "assigned_bay": "SP-07",
  "actual_bay": "SP-11",
  "timestamp": "2026-10-19T10:00:25.500Z",
  "source": "demo",
  "message": "Wrong bay warning: Vehicle VEH-001 entered SP-11 instead of assigned SP-07."
}
```

#### `WRONG_BAY_ESCALATED`
Emitted if vehicle dwells in wrong bay $\ge 600\text{s}$ (10 minutes).
```json
{
  "event_type": "WRONG_BAY_ESCALATED",
  "episode_id": "VE-7a8b9c0d1e",
  "vehicle_id": "VEH-001",
  "license_plate": "KA01MJ5001",
  "assigned_bay": "SP-07",
  "actual_bay": "SP-11",
  "duration_seconds": 600.0,
  "timestamp": "2026-10-19T10:10:25.500Z",
  "source": "demo",
  "message": "Wrong bay escalated: Vehicle VEH-001 in unauthorized bay SP-11 exceeded 10 minutes."
}
```

#### `WRONG_BAY_RESOLVED`
Emitted when wrong-bay stay ends (departure, relocation, or facility exit).
```json
{
  "event_type": "WRONG_BAY_RESOLVED",
  "episode_id": "VE-7a8b9c0d1e",
  "vehicle_id": "VEH-001",
  "license_plate": "KA01MJ5001",
  "assigned_bay": "SP-07",
  "actual_bay": "SP-11",
  "reason": "left_bay",
  "duration_seconds": 312.4,
  "timestamp": "2026-10-19T10:05:37.900Z",
  "source": "demo",
  "message": "Wrong bay episode VE-7a8b9c0d1e resolved: left_bay."
}
```

#### `LONG_STAY_ALERT`
Emitted when an authorized vehicle in its assigned bay exceeds 10 minutes.
```json
{
  "event_type": "LONG_STAY_ALERT",
  "space_id": "SP-07",
  "duration_seconds": 600.0,
  "status": "LONG_STAY_ALERT",
  "source": "demo"
}
```

---

### 2.3 Voice Assistant Announcements (Phase 4)

#### `VOICE_ANNOUNCEMENT`
Dispatched to driver displays and operator dashboards for spoken audio playback.
```json
{
  "message_id": "VM-a1b2c3d4e5",
  "event_id": "EV-ANPR-001",
  "kind": "ASSIGNMENT",
  "text": "Vehicle recognised. Your designated parking space is SP-07. Follow the driving aisle past Upper West Junction.",
  "priority": 50,
  "lang": "en-US",
  "vehicle_id": "VEH-001",
  "source": "demo",
  "ts": "2026-10-19T10:00:10.000Z"
}
```

#### `VOICE_CANCEL`
Dispatched when in-flight announcements are pre-empted or invalidated.
```json
{
  "action": "CANCEL",
  "message_id": "VM-a1b2c3d4e5",
  "reason": "preempted_by_higher_priority",
  "timestamp": "2026-10-19T10:00:25.600Z"
}
```

---

## 3. WebSocket Channels & Subscription Endpoints

Connections are initiated via `/ws/{channel}?token={jwt_or_dev_token}`:

| Channel | Intended Consumer | Broadcast Events |
| :--- | :--- | :--- |
| `events` | Global event log & Voice Assistant | `VOICE_ANNOUNCEMENT`, `VOICE_CANCEL`, `WRONG_BAY_*`, `BAY_*` |
| `vehicles` | 2D/3D Digital Twin tracking | `VehicleDetected`, `VehicleTracked`, `VehicleParked`, `VehicleExited` |
| `slots` | Digital Twin parking bays | `SlotStateChanged`, `SlotOccupied`, `SlotReleased` |
| `sessions` | Active parking sessions | `SessionStarted`, `SessionEnded` |
| `occupancy` | Facility & Zone KPI meters | `OccupancySummary` |
