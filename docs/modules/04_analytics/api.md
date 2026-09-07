# Analytics REST API Reference (`/analytics/dashboard`)

---

## `GET /analytics/dashboard`

Retrieves a unified analytics payload containing occupancy, traffic, utilization, and trend data.

### Request Headers
- `Authorization: Bearer <token>` (e.g. `dev_admin_token`)

### Query Parameters
- `start_time` *(optional, ISO-8601)*: Window start (defaults to $T - 24\text{h}$).
- `end_time` *(optional, ISO-8601)*: Window end (defaults to $T$).
- `camera_id` *(optional, string)*: Filter by specific camera ID.

---

### Sample Response Excerpt

```json
{
  "occupancy": {
    "current_occupancy": 1,
    "occupancy_percentage": 10.0,
    "free_slots": 9,
    "total_slots": 10
  },
  "traffic": {
    "vehicle_entries": 15,
    "vehicle_exits": 13,
    "active_vehicles": 2,
    "peak_hour": 9
  },
  "utilization": {
    "slot_utilization_percentage": 10.0,
    "average_parking_duration": "00:45:12",
    "turnover_rate": 1.3
  }
}
```

### Curl Example
```bash
curl -X GET "http://localhost:8000/analytics/dashboard"      -H "Authorization: Bearer dev_admin_token"
```
