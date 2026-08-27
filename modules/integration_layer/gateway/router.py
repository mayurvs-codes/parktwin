"""
ParkTwin AI — Unified Integration Gateway (Module 3)
=================================================
A **single** APIRouter that exposes one unified surface. It consumes the
business modules *only* through their public APIs:

  - Vehicle Recognition  → ``get_pipeline().process_frame`` + its storage CRUD
  - Parking Intelligence   → ``ParkingIntelligenceEngine`` + its storage CRUD

Clients that use this gateway never touch ``/vehicles`` or ``/parking``
internals directly. The gateway returns integration-vocabulary DTOs and
pushes the same data live over the ``/integration/ws`` WebSocket.

All business logic (detection, mapping, occupancy) stays inside Modules 1/2.
"""

import base64
import binascii
import os
import tempfile
import time
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.api.dependencies import get_db, get_pipeline, require_admin, require_viewer
from backend.core.config import get_settings
from .schemas import (
    EventListResponse,
    GatewayHealth,
    GatewayOccupancy,
    ProcessFrameRequest,
    SessionListResponse,
    SlotListResponse,
    StatisticsResponse,
    VehicleListResponse,
)

from ..services.registry import get_integration_service_dep
from ..websocket.router import router as _ws_router

import sys
is_testing = (
    os.environ.get("ENVIRONMENT") == "test"
    or os.getenv("PYTEST_CURRENT_TEST") is not None
    or "pytest" in sys.modules
)
limiter = Limiter(key_func=get_remote_address, enabled=not is_testing)

router = APIRouter(prefix="/integration", tags=["Integration Layer"])

# The WebSocket endpoint lives in its own router; include it so the path
# becomes ``/integration/ws`` while keeping transport code isolated.
router.include_router(_ws_router)


# ─── Helpers ────────────────────────────────────────────────────────────────

from shared.helpers.frame_utils import decode_b64_image as _decode_b64_image, save_temp_video


# ─── Unified health ──────────────────────────────────────────────────────────

@router.get(
    "/health",
    response_model=GatewayHealth,
    tags=["Integration Layer"],
    summary="Unified integration health",
)
async def gateway_health(
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
) -> GatewayHealth:
    """Unified integration-layer health (engines, bus, WS, occupancy)."""
    return await svc.health(db)


# ─── Vehicles (Module 1 facade) ──────────────────────────────────────────

@router.get(
    "/vehicles",
    response_model=VehicleListResponse,
    tags=["Integration Layer"],
    summary="List detected vehicles",
)
async def list_vehicles(
    skip: int = 0,
    limit: int = 100,
    plate: Optional[str] = None,
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
):
    """List detected vehicles (Module 1) through the unified gateway."""
    return await svc.list_vehicles(db, skip=skip, limit=limit, plate=plate)


# ─── Parking (Module 2 facade) ───────────────────────────────────────────

@router.get(
    "/slots",
    response_model=SlotListResponse,
    tags=["Integration Layer"],
    summary="List parking slots",
)
async def list_slots(
    camera_id: Optional[str] = None,
    state: Optional[str] = None,
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
):
    """List parking slots (Module 2) through the unified gateway."""
    return await svc.list_slots(db, camera_id=camera_id, state=state)


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    tags=["Integration Layer"],
    summary="List parking sessions",
)
async def list_sessions(
    active_only: bool = False,
    camera_id: Optional[str] = None,
    plate: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
):
    """List parking sessions (Module 2) through the unified gateway."""
    return await svc.list_sessions(
        db, active_only=active_only, camera_id=camera_id, plate=plate, skip=skip, limit=limit
    )


@router.get(
    "/occupancy",
    response_model=GatewayOccupancy,
    tags=["Integration Layer"],
    summary="Current occupancy snapshot",
)
async def get_occupancy(
    camera_id: Optional[str] = None,
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
):
    """Current occupancy snapshot (Module 2) through the unified gateway."""
    return await svc.occupancy(db, camera_id=camera_id)


@router.get(
    "/statistics",
    response_model=StatisticsResponse,
    tags=["Integration Layer"],
    summary="Aggregate parking statistics",
)
async def get_statistics(
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
):
    """Aggregate parking statistics (Module 2) through the unified gateway."""
    return await svc.statistics(db)


@router.get(
    "/events",
    response_model=EventListResponse,
    tags=["Integration Layer"],
    summary="List integration/module events",
)
async def list_events(
    source: str = Query("integration", description="integration | module"),
    event_type: Optional[str] = None,
    camera_id: Optional[str] = None,
    slot_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_viewer),
):
    """List events.

    - ``source=integration`` → the canonical integration event bus
      (VehicleDetected/VehicleParked/...).
    - ``source=module``      → raw Module 2 lifecycle events from the DB.
    """
    return await svc.list_events(
        db,
        source=source,
        event_type=event_type,
        camera_id=camera_id,
        slot_id=slot_id,
        skip=skip,
        limit=limit,
    )


# ─── Synchronization (on-demand) ─────────────────────────────────────────────

@router.post("/sync")
async def run_sync(
    camera_id: Optional[str] = None,
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_admin),
) -> Dict[str, Any]:
    """Force a cross-module consistency reconcile (Vehicle↔Session↔Slot↔Event)."""
    return await svc.synchronize(db, camera_id=camera_id)


# ─── Frame / Video ingestion (Module 1 → Module 2, unified) ─────────────

@router.post("/process-frame")
@limiter.limit("10/minute")
async def process_frame(
    request: Request,
    req: ProcessFrameRequest,
    db=Depends(get_db),
    pipeline=Depends(get_pipeline),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_admin),
):
    """Run one submitted frame through Module 1 and feed it into Module 2.

    Returns the unified integration payload: summary, occupancy, sessions,
    integration events emitted this frame, and the sync report. Also pushes
    live updates to every WebSocket subscriber.
    """
    t0 = time.perf_counter()
    try:
        img = _decode_b64_image(req.image_base64)
        records = pipeline.process_frame(img, camera_id=req.camera_id)
        result = await svc.handle_frame(db, req.camera_id, records)
        result["success"] = True
        result["inference_time_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        return result
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - defensive
        from shared.logging import get_logger

        get_logger("integration_gateway").error(f"Integration frame error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integration frame error: {str(e)}",
        )


@router.post("/process-video")
@limiter.limit("10/minute")
async def process_video(
    request: Request,
    video: UploadFile = File(...),
    camera_id: str = Query("camera_01"),
    db=Depends(get_db),
    pipeline=Depends(get_pipeline),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_admin),
):
    """Drive the end-to-end Module 1 → Module 2 flow over an uploaded video.

    Returns processed-frame counts, final occupancy, and the sync report.
    """
    settings = get_settings()
    frame_skip = max(1, int(settings.cameras.frame_skip))

    try:
        async with save_temp_video(video) as tmp_path:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not open the uploaded video file.",
                )

            frames_processed = 0
            t0 = time.perf_counter()
            frame_idx = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if frame_idx % frame_skip == 0:
                    records = pipeline.process_frame(frame, camera_id=camera_id)
                    await svc.handle_frame(db, camera_id, records)
                    frames_processed += 1
                frame_idx += 1

            cap.release()
            occupancy = await svc.occupancy(db, camera_id=camera_id)
            sync_report = await svc.synchronize(db, camera_id=camera_id)

            return {
                "success": True,
                "camera_id": camera_id,
                "frames_processed": frames_processed,
                "occupancy": occupancy,
                "sync": sync_report,
                "processing_time_ms": round((time.perf_counter() - t0) * 1000, 2),
            }
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - defensive
        from shared.logging import get_logger

        get_logger("integration_gateway").error(f"Integration video error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integration video error: {str(e)}",
        )


@router.post(
    "/reset",
    tags=["Integration Layer"],
    summary="Reset digital twin state",
)
async def reset_integration_state(
    db=Depends(get_db),
    svc=Depends(get_integration_service_dep),
    _user=Depends(require_admin),
):
    """Reset Digital Twin: all slots free, active sessions ended, trackers cleared."""
    return await svc.reset(db)
