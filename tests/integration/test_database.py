"""
Database-layer test (Module 1)
==============================
Exercises the trimmed SQLAlchemy schema + CRUD against an in-memory SQLite
database. Validates that Module 1 models persist and round-trip correctly
without a PostgreSQL instance.
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from backend.database.models import Base
from modules.vehicle_recognition.storage import crud


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        yield s
    await engine.dispose()


async def test_camera_crud_roundtrip(session):
    cam = await crud.create_camera(session, {
        "camera_id": "cam_test", "name": "Test Cam", "url": "0",
    })
    await session.commit()

    fetched = await crud.get_camera(session, "cam_test")
    assert fetched is not None
    assert fetched.camera_id == "cam_test"
    assert fetched.name == "Test Cam"

    all_cams = await crud.get_all_cameras(session)
    assert len(all_cams) == 1


async def test_vehicle_upsert_by_plate(session):
    v1 = await crud.create_or_update_vehicle(session, {
        "license_plate": "KA01AB1234", "brand": "Toyota", "color": "White",
        "vehicle_type": "sedan", "tracking_id": 7,
    })
    await session.commit()
    assert v1.id is not None

    # Second upsert with same plate should update, not duplicate.
    v2 = await crud.create_or_update_vehicle(session, {
        "license_plate": "KA01AB1234", "brand": "Toyota", "color": "Black",
        "vehicle_type": "sedan", "tracking_id": 7,
    })
    await session.commit()
    assert v2.id == v1.id
    assert v2.color == "Black"

    all_vehicles = await crud.get_all_vehicles(session)
    assert len(all_vehicles) == 1


async def test_detection_log_insert(session):
    log = await crud.log_detection(session, {
        "tracking_id": 7, "detection_type": "plate", "detected_class": "sedan",
        "confidence": 0.9, "bounding_box": [0.1, 0.1, 0.5, 0.5],
        "license_plate_raw": "KA01AB1234", "ocr_engine": "paddleocr",
        "inference_time_ms": 42.0,
    })
    await session.commit()
    assert log.id is not None


async def test_vehicle_upsert_preserves_plate_across_none_frames(session):
    """
    A transient OCR miss (license_plate=None) on a later frame must NOT clobber
    a real plate that was captured on an earlier frame of the same track.
    """
    v1 = await crud.create_or_update_vehicle(session, {
        "license_plate": "KA01AB1234", "brand": "Toyota", "color": "White",
        "vehicle_type": "sedan", "tracking_id": 7,
    })
    await session.commit()
    assert v1.license_plate == "KA01AB1234"

    # Same track id, but OCR missed this frame (plate is None).
    v2 = await crud.create_or_update_vehicle(session, {
        "license_plate": None, "brand": "Toyota", "color": "Black",
        "vehicle_type": "sedan", "tracking_id": 7,
    })
    await session.commit()
    assert v2.id == v1.id
    assert v2.license_plate == "KA01AB1234"   # preserved, not wiped to NULL
    assert v2.color == "Black"                # non-null update still applied


async def test_log_detection_uses_raw_plate(session):
    """log_detection should store the raw OCR text in license_plate_raw."""
    from datetime import datetime, timezone
    log = await crud.log_detection(session, {
        "tracking_id": 9, "detection_type": "plate", "detected_class": "suv",
        "confidence": 0.88, "bounding_box": [0.2, 0.2, 0.6, 0.6],
        "license_plate_raw": "MH12CD5678", "license_plate_confidence": 0.88,
        "ocr_engine": "easyocr", "inference_time_ms": 30.0,
        "timestamp": datetime.now(timezone.utc),
    })
    await session.commit()
    assert log.license_plate_raw == "MH12CD5678"
