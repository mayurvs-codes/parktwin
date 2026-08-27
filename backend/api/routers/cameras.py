"""
ParkTwin AI — Cameras Router (Module 1)
=========================================
Register, list, retrieve, and delete camera sources. These are benign config
endpoints for the camera registry; real-time preview/streaming endpoints
(WebSocket/MJPEG/Integration Layer) are out of scope for Module 1.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.dependencies import get_db, get_frame_processor, require_admin, require_viewer
from backend.core.config import CameraSource
from modules.vehicle_recognition.storage import crud
from backend.schemas import CameraCreate, CameraResponse
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
