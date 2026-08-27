"""
ParkTwin AI — Vehicle Journey Router
=====================================
REST endpoints for multi-camera vehicle tracking across Entry, Parking, and Exit stations.
Correlates uploaded videos by license plate to construct real-time journeys in Digital Twin.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, get_pipeline, require_viewer
from backend.services.journey_service import (
    process_journey_video,
    get_all_journeys,
    get_journey_by_plate,
    get_journey_stats,
)
from backend.services.anpr_service import _UPLOADS_DIR
from shared.logging import get_logger

logger = get_logger("journey_router")

router = APIRouter(prefix="/api/v1/journey", tags=["Vehicle Journey (Multi-Camera)"])

_ACCEPTED_EXTENSIONS = {".mp4", ".avi", ".mov"}
_MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB


def _validate_video_extension(filename: str | None) -> str:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="No filename provided. Upload a .mp4, .avi, or .mov video.",
        )
    ext = Path(filename).suffix.lower()
    if ext not in _ACCEPTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ext}'. Accepted formats: .mp4, .avi, .mov",
        )
    return ext


@router.post(
    "/upload",
    summary="Upload a camera station video (entry / parking / exit) and update Digital Twin journey",
)
async def upload_camera_station_video(
    video: UploadFile = File(..., description="CCTV footage from Entry, Parking, or Exit camera"),
    camera_role: str = Form("entry", description="Camera role: 'entry' | 'parking' | 'exit'"),
    preferred_slot: Optional[str] = Form(None, description="Optional slot ID for parking camera"),
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
):
    """
    Process video footage from a specific camera station and update vehicle journey lifecycle:
      - **entry**: vehicle is logged entering the facility (status: 'entering')
      - **parking**: vehicle is mapped to parking slot (status: 'parked')
      - **exit**: vehicle exits the facility, duration is computed, and slot is freed (status: 'exited')
    """
    role = camera_role.strip().lower()
    if role not in {"entry", "parking", "exit"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="camera_role must be one of: 'entry', 'parking', 'exit'",
        )

    ext = _validate_video_extension(video.filename)
    safe_stem = Path(video.filename or "video").stem[:64]
    ts = int(time.time() * 1000)
    saved_filename = f"journey_{role}_{ts}_{safe_stem}{ext}"
    saved_path = _UPLOADS_DIR / saved_filename

    # Stream file to disk in 1MB chunks
    CHUNK = 1024 * 1024
    total_bytes = 0
    try:
        with saved_path.open("wb") as fh:
            while True:
                chunk = await video.read(CHUNK)
                if not chunk:
                    break
                fh.write(chunk)
                total_bytes += len(chunk)
                if total_bytes > _MAX_FILE_BYTES:
                    fh.close()
                    saved_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File exceeds 2 GB limit.",
                    )
    except HTTPException:
        raise
    except Exception as exc:
        saved_path.unlink(missing_ok=True)
        logger.error(f"Failed to save journey upload: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read/save uploaded video: {exc}",
        )

    if total_bytes == 0:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    result = await process_journey_video(
        db=db,
        video_path=saved_path,
        camera_role=role,
        pipeline=pipeline,
        preferred_slot=preferred_slot,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("error", "Failed to process journey video."),
        )

    return result


@router.get("/all", summary="Get all tracked vehicle journeys")
async def list_all_journeys(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status: 'entering', 'parked', 'exited'"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> List[Dict[str, Any]]:
    """Retrieve list of vehicle journeys with timeline history."""
    return await get_all_journeys(db, skip=skip, limit=limit, status=status)


@router.get("/stats", summary="Get journey status summary statistics")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Summary counts for active entering, parked, and exited vehicles."""
    return await get_journey_stats(db)


@router.get("/{plate}", summary="Get vehicle journey details by license plate")
async def get_by_plate(
    plate: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Retrieve complete 3-camera journey timeline for a given vehicle plate."""
    journey = await get_journey_by_plate(db, plate)
    if not journey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No journey found for plate '{plate}'",
        )
    return journey
