"""
ParkTwin AI — Cameras Router (Module 1)
=========================================
Register, list, retrieve, and delete camera sources. These are benign config
endpoints for the camera registry; real-time preview/streaming endpoints
(WebSocket/MJPEG/Integration Layer) are out of scope for Module 1.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.dependencies import get_db, get_frame_processor, require_admin, require_viewer
from backend.core.config import CameraSource
from modules.vehicle_recognition.storage import crud
from backend.schemas import CameraCreate, CameraResponse, CameraDesignationUpdate
from shared.logging import get_logger


logger = get_logger("cameras_router")

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraResponse], summary="List cameras", tags=["Cameras"])
async def list_cameras(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
):
    """List all registered cameras."""
    return await crud.get_all_cameras(db)


@router.post("/add", response_model=CameraResponse, status_code=status.HTTP_201_CREATED, summary="Add camera", tags=["Cameras"])
async def add_camera(
    camera_in: CameraCreate,
    db: AsyncSession = Depends(get_db),
    fp=Depends(get_frame_processor),
    _user=Depends(require_admin),
):
    """Register a new camera and start its ingestion thread."""
    existing = await crud.get_camera(db, camera_in.camera_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CAMERA_ALREADY_EXISTS",
        )

    db_camera = await crud.create_camera(db, camera_in.model_dump())

    source = CameraSource(
        id=db_camera.camera_id,
        name=db_camera.name,
        url=str(db_camera.url),
        enabled=db_camera.is_enabled,
        fps_target=db_camera.fps_target,
        zone=db_camera.zone,
    )
    fp.add_camera(source)

    await crud.update_camera_status(
        db,
        db_camera.camera_id,
        "online" if fp.get_frame(db_camera.camera_id) is not None else "offline",
    )

    return await crud.get_camera(db, db_camera.camera_id)


@router.get("/{camera_id}", response_model=CameraResponse, summary="Get camera", tags=["Cameras"])
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
):
    """Retrieve a single camera by its ID."""
    cam = await crud.get_camera(db, camera_id)
    if not cam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NOT_FOUND",
        )
    return cam


@router.delete("/{camera_id}", status_code=status.HTTP_200_OK, summary="Delete camera", tags=["Cameras"])
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    fp=Depends(get_frame_processor),
    _user=Depends(require_admin),
):
    """Remove a camera from the DB and stop its capture thread."""
    cam = await crud.get_camera(db, camera_id)
    if not cam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera '{camera_id}' not found.",
        )
    fp.remove_camera(camera_id)
    await db.delete(cam)
    await db.commit()
    return {"detail": f"Camera '{camera_id}' deleted successfully."}


@router.post("/{camera_id}/designation", summary="Save camera role designation")
async def save_camera_designation(
    camera_id: str,
    designation: CameraDesignationUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
):
    """
    Designate camera role (ENTRY, PARKING_LOT, EXIT, UNKNOWN) and associated coverage.
    Persisted in database and broadcasts CAMERA_DESIGNATED event to Digital Twin.
    """
    from backend.database.models import Camera, CameraDesignation
    from backend.services.video_processing_service import emit_digital_twin_event

    cam = (await db.execute(select(Camera).where(Camera.camera_id == camera_id.upper()))).scalars().first()
    if not cam:
        # Create camera entry if newly introduced
        cam = Camera(
            camera_id=camera_id.upper(),
            name=f"Camera {camera_id.upper()}",
            url=f"/videos/{camera_id.lower()}.mp4",
            role=designation.role.upper(),
            parking_area=designation.parking_area,
            slot_group=designation.slot_group,
            meta=designation.coverage_meta or {},
        )
        db.add(cam)
    else:
        cam.role = designation.role.upper()
        if designation.parking_area:
            cam.parking_area = designation.parking_area
        if designation.slot_group:
            cam.slot_group = designation.slot_group
        if designation.coverage_meta:
            cam.meta = {**(cam.meta or {}), **designation.coverage_meta}

    # Record audit log
    audit = CameraDesignation(
        camera_id=cam.camera_id,
        role=cam.role,
        parking_area=cam.parking_area,
        slot_group=cam.slot_group,
        coverage_meta=designation.coverage_meta or {},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(cam)

    # Broadcast event
    await emit_digital_twin_event(
        event_type="CAMERA_DESIGNATED",
        camera_id=cam.camera_id,
        status=cam.role,
        payload={
            "role": cam.role,
            "parking_area": cam.parking_area,
            "slot_group": cam.slot_group,
        },
        db=db,
    )
    await db.commit()

    return {
        "status": "success",
        "camera_id": cam.camera_id,
        "role": cam.role,
        "parking_area": cam.parking_area,
        "slot_group": cam.slot_group,
        "updated_at": cam.updated_at.isoformat() if cam.updated_at else None,
    }

