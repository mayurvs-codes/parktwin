# Data Adapters (`modules/integration_layer/adapters/`)

Translates internal domain dataclasses into standardized external API response schemas (Pydantic DTOs).

- **`VehicleAdapter`**: Converts `VehicleRecord` into `VehicleDTO`.
- **`ParkingAdapter`**: Converts `SlotState` into `SlotOccupancyDTO`.
- **`EventAdapter`**: Converts domain event tuples into JSON serializable messages.
