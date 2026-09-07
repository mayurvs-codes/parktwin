# Parking API (`backend/api/routers/parking.py`)

Provides control and monitoring for physical parking bays.

---

## Endpoints

- `GET /api/v1/parking/slots` — List all configured slots (`P01`–`P10`) with current states (`free`, `occupied`, `reserved`).
- `GET /api/v1/parking/occupancy` — Real-time lot capacity summary.
- `POST /api/v1/parking/slots/{slot_id}/reserve` — Manually mark a slot as reserved.
- `POST /api/v1/parking/slots/{slot_id}/release` — Release a reserved slot.
- `GET /api/v1/parking/sessions` — Query active and completed parking session logs.
