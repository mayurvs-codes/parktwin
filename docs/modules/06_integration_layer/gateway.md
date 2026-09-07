# Integration Gateway (`modules/integration_layer/gateway/`)

Exposes high-speed, cached REST endpoints used by the dashboard and digital twin frontend.

---

## Key Endpoints

- `GET /integration/slots` — Current status of all 10 slots.
- `GET /integration/occupancy` — Instantaneous capacity utilization.
- `GET /integration/sessions` — Active parking session records.
