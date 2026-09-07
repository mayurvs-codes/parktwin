# Parking Events & Violations (`modules/parking_intelligence/events/`)

The `EventEngine` monitors the parking domain for critical business events and automated violation triggers.

---

## Domain Event Types

```mermaid
graph TD
    EV[EventEngine Ingests State Changes] --> E1[vehicle_entered]
    EV --> E2[vehicle_parked]
    EV --> E3[vehicle_exited]
    EV --> E4[slot_occupied]
    EV --> E5[slot_freed]
    EV --> V[Violation Detection Rules]
    
    V --> V1[overstay_violation<br>Stay > max_parking_hours]
    V --> V2[unauthorized_parking<br>Unregistered plate in reserved slot]
    V --> V3[wrong_bay_parking<br>Vehicle spans across 2 slot boundaries]
```

---

## Violation Detection Parameters

Configured via `configs/settings.yaml`:
- `violations.max_stay_hours`: `24` (triggers alert when exceeded).
- `violations.cross_bay_iou_threshold`: `0.25` on two adjacent slots simultaneously.
