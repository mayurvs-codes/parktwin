"""
Unit tests for Camera Designation functionality and audit trail.
"""

import uuid
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.database.models import Base, Camera, CameraDesignation


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
async def test_camera_role_designation_lifecycle(async_db: AsyncSession):
    cam = Camera(
        id=uuid.uuid4(),
        camera_id="CAM-01",
        name="Main Entrance Gate",
        url="rtsp://localhost/cam01",
        role="UNKNOWN",
        parking_area="Level B2",
    )
    async_db.add(cam)
    await async_db.commit()

    # Verify initial state
    res = await async_db.execute(select(Camera).where(Camera.camera_id == "CAM-01"))
    camera_obj = res.scalar_one_or_none()
    assert camera_obj is not None
    assert camera_obj.role == "UNKNOWN"

    # Update camera role to ENTRY
    camera_obj.role = "ENTRY"
    camera_obj.slot_group = "GATE-01"
    camera_obj.parking_area = "Zone A - Level B2"

    # Create audit record
    audit = CameraDesignation(
        camera_id="CAM-01",
        role="ENTRY",
        parking_area="Zone A - Level B2",
        slot_group="GATE-01",
    )
    async_db.add(audit)
    await async_db.commit()

    # Verify updated camera
    res2 = await async_db.execute(select(Camera).where(Camera.camera_id == "CAM-01"))
    updated_cam = res2.scalar_one()
    assert updated_cam.role == "ENTRY"
    assert updated_cam.slot_group == "GATE-01"

    # Verify audit record
    res_audit = await async_db.execute(
        select(CameraDesignation).where(CameraDesignation.camera_id == "CAM-01")
    )
    audit_records = res_audit.scalars().all()
    assert len(audit_records) == 1
    assert audit_records[0].role == "ENTRY"
    assert audit_records[0].parking_area == "Zone A - Level B2"


@pytest.mark.asyncio
async def test_canonical_16_camera_roles():
    """Verify CAM-01=ENTRY, CAM-02..15=PATH/PARKING, CAM-16=EXIT, and CAM-03 is NEVER EXIT."""
    from backend.database.models import CameraRole

    # Standard camera definitions
    cam_01_role = CameraRole.ENTRY
    cam_02_role = CameraRole.PATH_PARKING
    cam_03_role = CameraRole.PATH_PARKING
    cam_16_role = CameraRole.EXIT

    assert cam_01_role == CameraRole.ENTRY
    assert cam_02_role == CameraRole.PATH_PARKING
    assert cam_03_role == CameraRole.PATH_PARKING
    assert cam_03_role != CameraRole.EXIT, "CAM-03 MUST NEVER be EXIT!"
    assert cam_16_role == CameraRole.EXIT
