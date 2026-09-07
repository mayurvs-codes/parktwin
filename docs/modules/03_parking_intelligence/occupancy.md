# Real-Time Occupancy Management (`modules/parking_intelligence/occupancy/`)

The `OccupancyManager` maintains an in-memory real-time registry of all slot states across all registered cameras.

---

## State Transition Rules

```mermaid
stateDiagram-v2
    [*] --> Free: System Startup
    Free --> Occupied: Vehicle IoU >= 0.35 for >= 3 frames
    Occupied --> Occupied: Vehicle stationary
    Occupied --> Free: Vehicle leaves bay (IoU < 0.10 for >= 5 frames)
    Free --> Reserved: API Reservation Call
    Reserved --> Occupied: Authorized vehicle arrives
    Reserved --> Free: Reservation cancelled / expired
```

---

## Aggregate Occupancy REST Response (`/integration/occupancy`)

```json
{
  "total_slots": 10,
  "free": 9,
  "occupied": 1,
  "reserved": 0,
  "unknown": 0,
  "occupancy_rate": 0.10,
  "per_camera": {
    "camera_01": {
      "total": 10,
      "free": 9,
      "occupied": 1,
      "reserved": 0,
      "unknown": 0
    }
  }
}
```
