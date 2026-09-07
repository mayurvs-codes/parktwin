"""
Unit tests for Video Library Service (indexing, hierarchy, retrieval).
"""

import uuid
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.database.models import Base, Video, Camera
from backend.services.video_library_service import (
    get_video_hierarchy,
    get_video_by_id,
    update_video_status,
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
async def test_video_hierarchy_and_retrieval(async_db: AsyncSession):
    # Setup test cameras
    cam1 = Camera(
        id=uuid.uuid4(),
        camera_id="CAM-01",
        name="Entry Camera",
        url="rtsp://localhost/cam01",
        role="ENTRY",
        parking_area="Level B2",
        slot_group="GATE-01",
    )
    cam2 = Camera(
        id=uuid.uuid4(),
        camera_id="CAM-02",
        name="Lot Camera",
        url="rtsp://localhost/cam02",
        role="PARKING_LOT",
        parking_area="Level B2",
        slot_group="P01-P05",
    )
    async_db.add_all([cam1, cam2])
    await async_db.flush()

    # Setup test videos
    vid1 = Video(
        id="vid-1",
        filename="CAM-01_15-30-00.mp4",
        file_path="videos/CAM-01_15-30-00.mp4",
        date="2026-08-27",
        camera_id="CAM-01",
        duration_seconds=30.0,
        fps=30.0,
        resolution="1280x720",
        file_size_bytes=1048576,
        processing_status="IDLE",
    )
    vid2 = Video(
        id="vid-2",
        filename="CAM-02_15-30-00.mp4",
        file_path="videos/CAM-02_15-30-00.mp4",
        date="2026-08-27",
        camera_id="CAM-02",
        duration_seconds=45.0,
        fps=30.0,
        resolution="1280x720",
        file_size_bytes=2097152,
        processing_status="COMPLETED",
    )
    async_db.add_all([vid1, vid2])
    await async_db.commit()

    # Test hierarchy
    hierarchy = await get_video_hierarchy(async_db)
    assert hierarchy["total_count"] >= 2
    assert "2026-08-27" in hierarchy["dates"]
    assert "CAM-01" in hierarchy["dates"]["2026-08-27"]
    assert "CAM-02" in hierarchy["dates"]["2026-08-27"]
    cam1_files = [v["filename"] for v in hierarchy["dates"]["2026-08-27"]["CAM-01"]]
    assert "CAM-01_15-30-00.mp4" in cam1_files

    # Test get_video_by_id
    detail = await get_video_by_id(async_db, "vid-1")
    assert detail is not None
    assert detail["id"] == "vid-1"
    assert detail["camera_id"] == "CAM-01"
    assert detail["camera"]["role"] == "ENTRY"

    # Test update status
    updated = await update_video_status(async_db, "vid-1", "PROCESSING")
    assert updated is not None
    assert updated.processing_status == "PROCESSING"

    detail_after = await get_video_by_id(async_db, "vid-1")
    assert detail_after["processing_status"] == "PROCESSING"
