"""
ParkTwin AI — Parking Intelligence Router (Module 2)
====================================================
REST surface for the Parking Intelligence Engine: slots, sessions, events,
live occupancy, and parking statistics.

It reuses Module 1's AI pipeline (``get_pipeline``) to turn submitted
frames into ``VehicleRecord`` outputs, then feeds those into
``ParkingIntelligenceEngine.ingest_frame`` — keeping the two modules
wired together without either one importing the other's business code.
"""

from __future__ import annotations

import base64
import binascii
import os
import tempfile
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, status, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from backend.api.dependencies import get_db, get_pipeline, require_admin, require_viewer
from modules.integration_layer.services.registry import get_integration_service
from modules.parking_intelligence import ParkingIntelligenceEngine
from modules.parking_intelligence.storage import crud
from modules.parking_intelligence.storage.models import SlotState
from shared.logging import get_logger

logger = get_logger("parking_router")


router = APIRouter(prefix="/parking", tags=["Parking Intelligence"])


# ─── Dependency: canonical engine (owned by IntegrationService) ──────────────
#
# D10 compatibility layer: every route keeps depending on ``get_parking_engine``
# with the identical signature and return type, but the returned instance is the
# single ``ParkingIntelligenceEngine`` owned by the Integration Service. The
# router-local duplicate engine has been removed; the Integration Service is now
# the sole owner of Module 2 runtime state. Bootstrapping flows through the
# Integration Service lifecycle so the engine is initialized exactly once
# against ``parktwin.db``.

async def get_parking_engine(
    db: AsyncSession = Depends(get_db),
) -> ParkingIntelligenceEngine:
    """Resolve the canonical Module 2 engine owned by ``IntegrationService``."""
    integration = get_integration_service()
    await integration.ensure_initialized(db)
    return integration.engine


# ─── Schemas (inline so Module 2 stays self-contained) ──────────────────────

class SlotResponse(BaseModel):
    id: UUID
    slot_id: str
    camera_id: str
    zone: str
    state: str
    is_reserved: bool
    reserved_for: Optional[str] = None
    position: Optional[Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SlotCreate(BaseModel):
    slot_id: str
    camera_id: str
    zone: str = "general"
    is_reserved: bool = False
    reserved_for: Optional[str] = None
    position: Optional[List[float]] = None
    state: str = SlotState.FREE.value


class SlotUpdate(BaseModel):
    state: Optional[str] = None
    is_reserved: Optional[bool] = None
    reserved_for: Optional[str] = None
    position: Optional[List[float]] = None
    zone: Optional[str] = None


class SessionResponse(BaseModel):
    id: UUID
    session_uid: str
    camera_id: str
    slot_id: Optional[str] = None
    license_plate: Optional[str] = None
    tracking_id: Optional[int] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None
    duration_seconds: float
    is_active: bool
    violation_flags: List[str] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    id: UUID
    event_uid: str
    event_type: str
    camera_id: Optional[str] = None
    slot_id: Optional[str] = None
    tracking_id: Optional[int] = None
    license_plate: Optional[str] = None
    timestamp: datetime
    meta: Dict[str, Any] = {}

    model_config = {"from_attributes": True}


class OccupancyResponse(BaseModel):
    total_slots: int
    free: int
    occupied: int
    reserved: int
    unknown: int
    occupancy_rate: float
    per_camera: Dict[str, Any] = {}


class StatisticsResponse(BaseModel):
    active_sessions: int
    total_sessions: int
    closed_sessions: int
    average_duration_seconds: float
    average_duration: str
    max_duration_seconds: float
    max_duration: str
    events: Dict[str, int]
    total_events: int
    top_plates: List[Dict[str, Any]] = []
    violations: Dict[str, int] = {}


class ProcessFrameRequest(BaseModel):
    image_base64: str
    camera_id: str = "camera_01"
    frame_id: int = 0


from shared.helpers.frame_utils import decode_b64_image as _decode_b64_image, save_temp_video


# ─── Slots ──────────────────────────────────────────────────────────────────

@router.get("/slots", response_model=List[SlotResponse])
async def list_slots(
    camera_id: Optional[str] = None,
    state: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    """List parking slots, optionally filtered by camera or state."""
    return await crud.get_slots(db, camera_id=camera_id, state=state)


@router.get("/slots/{slot_id}", response_model=SlotResponse)
async def get_slot(
    slot_id: str,
    camera_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    slot = await crud.get_slot(db, slot_id, camera_id=camera_id)
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot '{slot_id}' not found.",
        )
    return slot


@router.post("/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_slot(
    payload: SlotCreate,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_admin),
):
    """Register or update a parking slot."""
    data = payload.model_dump()
    # Validate state value if provided.
    if data.get("state") and data["state"] not in {s.value for s in SlotState}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid slot state: {data['state']}",
        )
    return await crud.upsert_slot(db, data)


@router.patch("/slots/{slot_id}", response_model=SlotResponse)
async def update_slot(
    slot_id: str,
    payload: SlotUpdate,
    camera_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_admin),
):
    """Patch a slot's state / reservation / geometry."""
    slot = await crud.get_slot(db, slot_id, camera_id=camera_id)
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot '{slot_id}' not found.",
        )
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "state" in updates and updates["state"] not in {s.value for s in SlotState}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid slot state: {updates['state']}",
        )
    # Reserving/unreserving a slot updates its live state when not explicitly set.
    if "is_reserved" in updates and "state" not in updates:
        if updates["is_reserved"]:
            updates["state"] = SlotState.RESERVED.value
        elif slot.state == SlotState.RESERVED:
            updates["state"] = SlotState.FREE.value
    return await crud.upsert_slot(db, {"slot_id": slot_id, "camera_id": slot.camera_id, **updates})


# ─── Sessions ───────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    active_only: bool = False,
    camera_id: Optional[str] = None,
    plate: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    """List parking sessions (active or historical)."""
    return await crud.list_sessions(
        db, active_only=active_only, camera_id=camera_id,
        plate=plate, skip=skip, limit=limit,
    )


@router.get("/sessions/{session_uid}", response_model=SessionResponse)
async def get_session(
    session_uid: str,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    sess = await crud.get_session(db, session_uid)
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_uid}' not found.",
        )
    return sess


# ─── Events ─────────────────────────────────────────────────────────────────

@router.get("/events", response_model=List[EventResponse])
async def list_events(
    event_type: Optional[str] = None,
    camera_id: Optional[str] = None,
    slot_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    """List parking lifecycle events."""
    return await crud.list_events(
        db, event_type=event_type, camera_id=camera_id,
        slot_id=slot_id, skip=skip, limit=limit,
    )


# ─── Occupancy & Statistics ───────────────────────────────────────────────────

@router.get("/occupancy", response_model=OccupancyResponse)
async def get_occupancy(
    camera_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    """Current occupancy snapshot across all slots (or one camera)."""
    return await engine.occupancy_summary(db, camera_id=camera_id)


@router.get("/statistics", response_model=StatisticsResponse)
async def get_statistics(
    db: AsyncSession = Depends(get_db),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_viewer),
):
    """Aggregate parking statistics."""
    return await engine.statistics(db)


# ─── Frame / Video ingestion (Module 1 → Module 2) ────────────────────────

@router.post("/process-frame")
async def process_frame(
    req: ProcessFrameRequest,
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_admin),
):
    """
    Run one submitted frame through Module 1 (ANPR) and feed the resulting
    detections into the Parking Intelligence Engine. Returns the live occupancy
    snapshot and the events emitted on this frame.
    """
    t0 = time.perf_counter()
    try:
        img = _decode_b64_image(req.image_base64)
        records = pipeline.process_frame(img, camera_id=req.camera_id)
        summary = await engine.ingest_frame(db, req.camera_id, records)
        occupancy = await engine.occupancy_summary(db, camera_id=req.camera_id)
        events = engine._events.recent(limit=50)
        return {
            "success": True,
            "camera_id": req.camera_id,
            "summary": summary,
            "occupancy": occupancy,
            "events": events,
            "inference_time_ms": (time.perf_counter() - t0) * 1000,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Parking frame processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parking frame processing error: {str(e)}",
        )


@router.post("/process-video")
async def process_video(
    video: UploadFile = File(...),
    camera_id: str = Query("camera_01"),
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    engine: ParkingIntelligenceEngine = Depends(get_parking_engine),
    _user=Depends(require_admin),
):
    """
    Drive the end-to-end flow: decode the uploaded video, run every Nth frame
    through Module 1, and feed each result into the Parking Intelligence
    Engine. Returns counts of processed frames, opened/closed sessions, and a
    final occupancy snapshot.
    """
    from backend.core.config import get_settings as _gs

    settings = _gs()
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
                    await engine.ingest_frame(db, camera_id, records)
                    frames_processed += 1
                frame_idx += 1

            cap.release()
            occupancy = await engine.occupancy_summary(db, camera_id=camera_id)
            stats = await engine.statistics(db)

            return {
                "success": True,
                "camera_id": camera_id,
                "frames_processed": frames_processed,
                "active_sessions": stats["active_sessions"],
                "total_events": stats["total_events"],
                "occupancy": occupancy,
                "processing_time_ms": (time.perf_counter() - t0) * 1000,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Parking video processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parking video processing error: {str(e)}",
        )


@router.post("/reset")
async def reset_parking_state(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_admin),
):
    """
    Reset Digital Twin state: set all parking slots to FREE (available),
    close all active sessions and journeys, reset in-memory trackers,
    and broadcast the clean state over WebSockets.
    """
    integration = get_integration_service()
    await integration.ensure_initialized(db)
    result = await integration.reset(db)
    return result
