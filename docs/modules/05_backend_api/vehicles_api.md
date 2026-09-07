# Vehicles API (`backend/api/routers/vehicles.py`)

Provides CRUD and search access to observed vehicle records.

---

## Endpoints

- `GET /api/v1/vehicles` — Paginated list of detected vehicles (filter by plate, brand, color, type, camera, date).
- `GET /api/v1/vehicles/{record_id}` — Single vehicle record details.
- `GET /api/v1/vehicles/plate/{license_plate}` — Query all observations of a specific plate number across all cameras.
- `GET /api/v1/vehicles/{record_id}/snapshot` — Download cropped vehicle snapshot JPEG.
- `GET /api/v1/vehicles/{record_id}/plate-snapshot` — Download cropped license plate snapshot JPEG.
