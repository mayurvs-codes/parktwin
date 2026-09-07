# Multi-Camera Journey API (`backend/api/routers/journey.py`)

Coordinates end-to-end vehicle tracking across multiple discrete CCTV stations:
1. **Entry Station (`station_entry`)**: Captures arrival plate, assigns entry timestamp.
2. **Parking Lot (`station_parking`)**: Tracks bay occupancy and parking duration.
3. **Exit Station (`station_exit`)**: Captures departure plate, closes session, computes billing duration.

---

## Key Endpoints

- `POST /api/v1/journey/upload` — Upload video feeds from all 3 stations simultaneously.
- `GET /api/v1/journey/stats` — Summary of fleet status:
  ```json
  { "entering": 15, "parked": 13, "exited": 13, "total": 41 }
  ```
