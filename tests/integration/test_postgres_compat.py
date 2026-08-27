"""
Integration Tests — PostgreSQL Database Compatibility
=====================================================
Verifies that ParkTwin AI models, engine creation, and CRUD operations function
identically against PostgreSQL when PG_TEST_URL is supplied. Skips automatically
when PG_TEST_URL is not set.
"""

import os
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from sqlalchemy import text, select

from backend.database.session import create_app_engine
from backend.database.models import Base, Camera, CameraStatus


PG_TEST_URL = os.getenv("PG_TEST_URL")
pytestmark = pytest.mark.skipif(
    not PG_TEST_URL,
    reason="PG_TEST_URL not set; skipping live PostgreSQL compatibility tests.",
)


@pytest.mark.asyncio
async def test_postgres_engine_creation_and_ping():
    engine = create_app_engine(PG_TEST_URL, echo=False)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT 1"))
        assert res.scalar() == 1
    await engine.dispose()


@pytest.mark.asyncio
async def test_postgres_schema_creation_and_crud():
    engine = create_app_engine(PG_TEST_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        cam = Camera(
            camera_id="pg_test_cam_01",
            name="PG Test Camera",
            url="rtsp://localhost/test",
            zone="test_zone",
            status=CameraStatus.ONLINE,
            fps_target=25,
            is_enabled=True,
        )
        session.add(cam)
        await session.commit()

    async with Session() as session:
        res = await session.execute(select(Camera).where(Camera.camera_id == "pg_test_cam_01"))
        fetched = res.scalar_one_or_none()
        assert fetched is not None
        assert fetched.name == "PG Test Camera"
        await session.delete(fetched)
        await session.commit()

    await engine.dispose()
