# DTO Conventions

Data Transfer Objects (DTOs) in ParkTwin AI follow a layered pattern. The key
rule: **API-layer schemas are projections of the canonical ORM/DTO models. They
may exist per layer, but must be built by mapping from the canonical model — never
by re-declaring business fields with independent logic.**

## Pydantic vs dataclass

| Context | Use |
|---------|-----|
| API request/response boundary | **Pydantic** (`BaseModel`) |
| Internal value objects / report structures | **dataclass** |

## Response DTO naming by layer

| Layer | Pattern | Examples |
|-------|---------|----------|
| M1 / M2 (direct routers) | `<Entity>Response` | `VehicleResponse`, `SlotResponse`, `SessionResponse`, `EventResponse`, `OccupancyResponse`, `StatisticsResponse` |
| M3 (gateway) | `Gateway<Entity>` | `GatewayVehicle`, `GatewaySlot`, `GatewaySession`, `GatewayEvent`, `GatewayOccupancy`, `GatewayHealth` |
| M5 (reporting) | `<Entity>Summary` / `<Entity>Detail` | `ReportSummary`, `ReportDetail`, `GenerateRequest`, `GenerateResponse` |
| M1 base / health | `Camera*`, `HealthResponse`, `RecognizeRequest/Response`, `DetectionLogResponse` | — |

## Request DTO naming

`<Action>Request` or `<Entity>Create`/`Update`:

- `RecognizeRequest`, `ProcessFrameRequest`, `GenerateRequest`
- `SlotCreate`, `SlotUpdate`, `CameraCreate`

## Canonical models (single source of truth)

| Concept | Canonical definition |
|---------|----------------------|
| ORM `Base` | `backend/database/models.py` |
| Camera | `backend.database.models.Camera` + `schemas.Camera*` |
| Vehicle | `backend.database.models.Vehicle` + `schemas.VehicleResponse` |
| DetectionLog | `backend.database.models.DetectionLog` |
| ParkingSlot / SlotState | `parking_intelligence/storage/models.py` (imports the canonical `Base`) |
| ParkingSession | `parking_intelligence/storage/models.py` |
| ParkingEvent | `parking_intelligence/storage/models.py` |
| VehicleRecord | `engine/pipeline.py` (pipeline output DTO) |
| IntegrationEvent | `integration_layer/events/bus.py` |
| ReportData / View / Record | `reporting/models.py` (reporting-internal) |

## Mapping rules

- API-layer schemas (`*Response`, `Gateway*`) are projections of the canonical
  ORM/DTO. Build them by mapping from the canonical model.
- The gateway read endpoints declare DTOs (`Gateway*`) but currently return raw
  dicts. Prefer returning the typed DTO for new endpoints.
- Analytics endpoints return bare `Dict[str, Any]` today. New analytics endpoints
  should return typed Pydantic models.
- The frontend `types/*` are projections of the backend responses — reuse them,
  don't re-declare backend business fields in components.

## Example

```python
# Canonical ORM (backend/database/models.py)
class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[UUID]
    license_plate: Mapped[Optional[str]]
    ...

# API projection (backend/schemas/__init__.py) — maps from the ORM
class VehicleResponse(VehicleBase):
    id: UUID
    plate_confidence: float
    ...
    model_config = {"from_attributes": True}
```

See the [API docs](../../docs/api/) for per-endpoint request/response shapes.
