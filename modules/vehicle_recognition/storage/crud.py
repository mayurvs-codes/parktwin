"""
ParkTwin AI — CRUD Operations (Module 1)
=========================================
Async database operations for cameras, vehicles, and detection logs.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import Camera, CameraStatus, Vehicle, DetectionLog


# ─── Camera CRUD ──────────────────────────────────────────────────────────────

async def get_camera(db: AsyncSession, camera_id: str) -> Optional[Camera]:
    result = await db.execute(select(Camera).where(Camera.camera_id == camera_id))
    return result.scalar_one_or_none()


async def get_all_cameras(db: AsyncSession) -> List[Camera]:
    result = await db.execute(select(Camera).order_by(Camera.created_at))
    return list(result.scalars().all())


async def create_camera(db: AsyncSession, data: dict) -> Camera:
    cam = Camera(**data)
    db.add(cam)
    await db.flush()
    return cam


async def update_camera_status(db: AsyncSession, camera_id: str, status: CameraStatus) -> None:
    await db.execute(
        update(Camera).where(Camera.camera_id == camera_id).values(status=status)
    )


# ─── Vehicle CRUD ─────────────────────────────────────────────────────────────

async def get_vehicle_by_plate(db: AsyncSession, plate: str) -> Optional[Vehicle]:
    result = await db.execute(
        select(Vehicle).where(Vehicle.license_plate == plate)
    )
    return result.scalars().first()


async def get_vehicle_by_tracking_id(db: AsyncSession, tracking_id: int) -> Optional[Vehicle]:
    result = await db.execute(
        select(Vehicle).where(Vehicle.tracking_id == tracking_id)
    )
    return result.scalars().first()


async def create_vehicle(db: AsyncSession, data: dict) -> Vehicle:
    vehicle = Vehicle(**data)
    db.add(vehicle)
    await db.flush()
    return vehicle


async def update_vehicle(db: AsyncSession, vehicle_id: UUID, data: dict) -> None:
    data["last_seen"] = datetime.now(timezone.utc)
    await db.execute(update(Vehicle).where(Vehicle.id == vehicle_id).values(**data))


async def create_or_update_vehicle(db: AsyncSession, data: dict) -> Vehicle:
    """Upsert a vehicle by license plate (falls back to tracking_id)."""
    plate = data.get("license_plate")
    vehicle = None
    if plate:
        vehicle = await get_vehicle_by_plate(db, plate)

    if not vehicle and data.get("tracking_id"):
        vehicle = await get_vehicle_by_tracking_id(db, data["tracking_id"])

    if vehicle:
        # Merge: only overwrite a field when the new value is non-null, so a
        # transient OCR/recognition miss on one frame cannot erase a previously
        # captured plate/brand/color (e.g. license_plate=None must not clobber a
        # real plate read on an earlier frame of the same track).
        data_to_update = {
            k: v for k, v in data.items() if k != "id" and v is not None
        }
        data_to_update["last_seen"] = datetime.now(timezone.utc)
        await db.execute(update(Vehicle).where(Vehicle.id == vehicle.id).values(**data_to_update))
        await db.flush()
        await db.refresh(vehicle)
    else:
        vehicle = Vehicle(**data)
        db.add(vehicle)
        await db.flush()
    return vehicle


async def get_all_vehicles(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    plate: Optional[str] = None,
) -> List[Vehicle]:
    query = select(Vehicle)
    if plate:
        query = query.where(Vehicle.license_plate.ilike(f"%{plate}%"))
    query = query.order_by(Vehicle.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


# ─── Detection Log CRUD ───────────────────────────────────────────────────────

async def log_detection(db: AsyncSession, data: dict) -> DetectionLog:
    log = DetectionLog(**data)
    db.add(log)
    await db.flush()
    return log
