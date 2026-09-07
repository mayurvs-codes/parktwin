"""
Unit tests for Individual Vehicle Route computation using canonical Digital Twin geometry.
"""

from datetime import datetime, timezone
import pytest
import pytest_asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.database.models import Base, Vehicle
from modules.parking_intelligence.storage.models import ParkingSlot, ParkingSession, SlotState
from backend.services.navigation_service import compute_vehicle_route


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_compute_vehicle_route_for_parked_vehicle(async_db: AsyncSession):
    # Setup vehicle
    veh_id = uuid.uuid4()
    veh = Vehicle(
        id=veh_id,
        license_plate="KA03MY0035",
        vehicle_type="SUV",
        color="White",
        brand="Hyundai",
        model="Venue",
        status="PARKED",
    )
    async_db.add(veh)

    # Setup parking slot P01
    slot = ParkingSlot(
        slot_id="P01",
        camera_id="CAM-02",
        zone="A",
        state=SlotState.OCCUPIED,
    )
    async_db.add(slot)

    # Setup active parking session linking vehicle and slot
    sess = ParkingSession(
        session_uid=str(uuid.uuid4()),
        camera_id="CAM-02",
        slot_id="P01",
        vehicle_id=veh_id,
        license_plate="KA03MY0035",
        entry_time=datetime.now(timezone.utc),
        is_active=True,
    )
    async_db.add(sess)
    await async_db.commit()

    # Compute route by vehicle license plate (using canonical access point)
    route = await compute_vehicle_route(async_db, "KA03MY0035", source="ACCESS_POINT_B2")
    assert route is not None
    assert route["vehicle_id"] == str(veh_id)
    assert route["license_plate"] == "KA03MY0035"
    assert route["destination_slot"] == "P01"
    assert route["destination"] == "P01"
    assert route["distance_meters"] == 431.0
    assert route["path"] == ["ACCESS_POINT_B2", "NORTH_JUNCTION", "UPPER_WEST_JUNCTION", "P01"]
    assert len(route["waypoints"]) == 4
    assert len(route["directions"]) == 4

    # Compute route by vehicle UUID
    route_uuid = await compute_vehicle_route(async_db, str(veh_id), source="ACCESS_POINT_B2")
    assert route_uuid is not None
    assert route_uuid["destination_slot"] == "P01"


@pytest.mark.asyncio
async def test_compute_vehicle_route_nonexistent_vehicle(async_db: AsyncSession):
    route = await compute_vehicle_route(async_db, "NON_EXISTENT_PLATE")
    assert route is None
