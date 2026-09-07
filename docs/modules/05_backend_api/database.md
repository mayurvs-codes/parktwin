# Database & SQLAlchemy Schema (`backend/database/`)

ParkTwin AI uses **SQLAlchemy 2.0** ORM supporting SQLite with Write-Ahead Logging (WAL) in development and PostgreSQL in production.

---

## Database Tables Entity Relationship Diagram

```mermaid
erDiagram
    VEHICLES ||--o{ PARKING_SESSIONS : "associated with"
    PARKING_SLOTS ||--o{ PARKING_SESSIONS : "hosts"
    CAMERA_STREAMS ||--o{ VEHICLES : "captures"
    
    VEHICLES {
        string record_id PK
        int tracking_id
        string camera_id FK
        string license_plate
        string vehicle_type
        string brand
        string color
        float confidence
        datetime timestamp
    }

    PARKING_SLOTS {
        string slot_id PK
        string camera_id FK
        string state
        string polygon_json
    }

    PARKING_SESSIONS {
        string session_id PK
        string license_plate FK
        string slot_id FK
        datetime entry_time
        datetime exit_time
        float duration_seconds
        string status
    }
```

---

## SQLite Performance Tuning
For high-concurrency event ingestion:
- `journal_mode = WAL` (Write-Ahead Logging allows concurrent reads while writing).
- `synchronous = NORMAL`.
- `busy_timeout = 5000` ms.
