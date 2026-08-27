"""
Unit tests for Vehicle Journey model and service logic.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.database.models import Base, VehicleJourney
from modules.parking_intelligence.storage.models import ParkingSlot, ParkingSession, SlotState
from backend.services.journey_service import (
    get_all_journeys,
    get_journey_by_plate,
    get_journey_stats,
    _get_or_create_slot,
    _find_free_slot,
    _serialize_journey,
)


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
async def test_journey_lifecycle_crud(async_db: AsyncSession):
    # 1. Entry stage
    now = datetime.now(timezone.utc)
    j = VehicleJourney(
        license_plate="KA01AB1234",
        vehicle_type="Sedan",
        color="White",
        brand="Hyundai",
        entry_time=now,
        entry_camera_id="CAM_ENTRY",
        entry_confidence=0.98,
        status="entering",
    )
    async_db.add(j)
    await async_db.commit()

    journeys = await get_all_journeys(async_db)
    assert len(journeys) == 1
    assert journeys[0]["license_plate"] == "KA01AB1234"
    assert journeys[0]["status"] == "entering"

    # 2. Parking stage
    slot = await _find_free_slot(async_db, preferred_slot="A-01")
    assert slot == "A-01"
    j.parking_slot = slot
    j.parked_at = datetime.now(timezone.utc)
    j.status = "parked"
    await async_db.commit()

    stats = await get_journey_stats(async_db)
    assert stats["parked"] == 1
    assert stats["entering"] == 0

    # 3. Exit stage
    j.exit_time = datetime.now(timezone.utc)
    j.duration_seconds = 120.0
    j.status = "exited"
    await async_db.commit()

    by_plate = await get_journey_by_plate(async_db, "KA01AB1234")
    assert by_plate is not None
    assert by_plate["status"] == "exited"
    assert by_plate["parking_slot"] == "A-01"
    assert by_plate["duration_seconds"] == 120.0
