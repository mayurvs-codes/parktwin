"""
ParkTwin AI — Vehicles Router (Module 1)
=========================================
CRUD for detected vehicles plus the two manual inference endpoints:
  - POST /recognize      : run plate OCR on a submitted image crop
  - POST /process-frame  : run the full ANPR pipeline on a submitted frame

Endpoints that belonged to later modules (owner lookup, parking status,
DB reset) are intentionally omitted. This module is inference-only: results
are persisted to SQLite via the CRUD layer and returned in the REST response.
"""

from __future__ import annotations

import base64
import binascii
import os
import tempfile
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, status, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, get_pipeline, get_integration_service, require_admin, require_viewer
from backend.core.config import get_settings
from modules.vehicle_recognition.storage import crud
from backend.schemas import RecognizeRequest, RecognizeResponse, VehicleResponse
from shared.logging import get_logger

logger = get_logger("vehicles_router")

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


from shared.helpers.frame_utils import decode_b64_image as _decode_b64_image, save_temp_video


@router.get("", response_model=List[VehicleResponse])
async def list_vehicles(
    skip: int = 0,
    limit: int = 100,
    plate: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
):
    """List detected vehicles, optionally filtered by a plate substring."""
    return await crud.get_all_vehicles(db, skip=skip, limit=limit, plate=plate)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
):
    """Retrieve a single vehicle by UUID, prototype ID (e.g. VH-001), or license plate."""
    from sqlalchemy import select, or_
    from backend.database.models import Vehicle

    # Try UUID lookup first if format matches
    vehicle = None
    try:
        parsed_uuid = UUID(vehicle_id)
        vehicle = (
            await db.execute(select(Vehicle).where(Vehicle.id == parsed_uuid))
        ).scalar_one_or_none()
    except (ValueError, AttributeError):
        pass

    # If not found by UUID, try prototype_id or license_plate
    if not vehicle:
        vehicle = (
            await db.execute(
                select(Vehicle).where(
                    or_(
                        Vehicle.prototype_id == vehicle_id.upper(),
                        Vehicle.license_plate == vehicle_id.upper(),
                    )
                )
            )
        ).scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{vehicle_id}' not found.",
        )
    return vehicle


@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_crop(
    req: RecognizeRequest,
    pipeline=Depends(get_pipeline),
    _user=Depends(require_admin),
):
    """
    Run plate detection + OCR on a base64 image.

    Accepts ``image_base64`` (optionally a data-URI), ``camera_id``, and ``enhance``.
    Returns the recognized plates with confidence and format.
    """
    t0 = time.perf_counter()
    try:
        image_b64 = req.image_base64
        enhance = bool(req.enhance)
        img = _decode_b64_image(image_b64)

        found = []
        plate_dets, _ = pipeline._plate_detector.detect(img)
        if plate_dets:
            for det in plate_dets:
                crop = det.crop_from_image(img)
                if crop.size == 0:
                    continue
                ocr_res = pipeline._ocr.read(crop, enhance=enhance)
                if ocr_res and ocr_res.raw_text:
                    formatted, fmt, conf_adj = pipeline._formatter.format(ocr_res.raw_text)
                    found.append({
                        "license_plate": formatted,
                        "raw_text": ocr_res.raw_text,
                        "confidence": ocr_res.confidence * conf_adj,
                        "format": fmt,
                        "bbox": det.bbox,
                        "ocr_engine": ocr_res.engine,
                    })
        else:
            # Assume the submitted image is already a plate crop.
            ocr_res = pipeline._ocr.read(img, enhance=enhance)
            if ocr_res and ocr_res.raw_text:
                formatted, fmt, conf_adj = pipeline._formatter.format(ocr_res.raw_text)
                found.append({
                    "license_plate": formatted,
                    "raw_text": ocr_res.raw_text,
                    "confidence": ocr_res.confidence * conf_adj,
                    "format": fmt,
                    "bbox": [0.0, 0.0, 1.0, 1.0],
                    "ocr_engine": ocr_res.engine,
                })

        return RecognizeResponse(
            success=len(found) > 0,
            vehicles=found,
            inference_time_ms=(time.perf_counter() - t0) * 1000,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR recognition error: {str(e)}",
        )


class ProcessFrameRequest(BaseModel):
    image_base64: str
    camera_id: str = "CAM_EVAL"
    frame_id: int = 0


@router.post("/process-frame")
async def process_frame(
    req: ProcessFrameRequest,
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    svc=Depends(get_integration_service),
    _user=Depends(require_admin),
):
    """
    Run one submitted frame through the full ANPR + classification pipeline and
    feed the result into Module 2 (D5 Phase 6).

    Slot ownership (``slot`` / ``occupied``) in the returned ``records`` is
    composed exclusively from Module 2's authoritative ``SlotAssignment`` — the
    Module 1 record's own slot is no longer a source of ownership here.
    """
    t0 = time.perf_counter()
    try:
        img = _decode_b64_image(req.image_base64)

        records = pipeline.process_frame(img, camera_id=req.camera_id)
        # Module 2 ingests the frame and composes Module-2-owned live vehicles
        # (slot/occupied sourced from SlotAssignment). The full unified payload
        # would duplicate the gateway, so we return just the M2-owned records.
        result = await svc.handle_frame(db, req.camera_id, records)

        return {
            "success": True,
            "records": result.get("vehicles", []),
            "inference_time_ms": (time.perf_counter() - t0) * 1000,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Frame processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Frame processing error: {str(e)}",
        )


@router.post("/process-video")
async def process_video(
    video: UploadFile = File(...),
    camera_id: str = Query("CAM_VIDEO", description="Camera identifier for the source video."),
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    svc=Depends(get_integration_service),
    _user=Depends(require_admin),
):
    """
    Drive the end-to-end Video -> ANPR service -> SQLite -> REST flow for Module 1.

    Delegates to backend.services.anpr_service.process_video_file for high-accuracy
    temporal plate voting, OCR formatting, and annotated video generation.
    """
    from backend.services.anpr_service import process_video_file

    try:
        async with save_temp_video(video) as tmp_path:
            file_size = os.path.getsize(tmp_path) if os.path.exists(tmp_path) else -1
            logger.info(f"Processing CCTV video upload: tmp_path={tmp_path}, size={file_size} bytes, filename={video.filename}")

            res = process_video_file(tmp_path, pipeline, camera_id=camera_id)
            if not res.success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=res.error or "Could not process video file.",
                )

            # Persist detected records into DB and Module 2
            records_serialized: List[Dict] = []
            for plate in res.detected_plates:
                vehicle_data = {
                    "license_plate": plate.get("license_plate", "NOT_DETECTED"),
                    "brand": plate.get("brand", "unknown"),
                    "model": "unknown",
                    "color": plate.get("color", "unknown"),
                    "vehicle_type": plate.get("vehicle_type", "Car"),
                    "tracking_id": plate.get("frame_id", 1),
                    "bounding_box": [0, 0, 100, 100],
                    "detection_confidence": plate.get("plate_confidence", 0.9),
                    "plate_confidence": plate.get("plate_confidence", 0.9),
                    "color_confidence": 0.8,
                }
                for attempt in range(3):
                    try:
                        vehicle = await crud.create_or_update_vehicle(db, vehicle_data)
                        log_data = {
                            "camera_id": camera_id,
                            "vehicle_id": vehicle.id,
                            "tracking_id": plate.get("frame_id", 1),
                            "frame_number": plate.get("frame_id", 0),
                            "timestamp": datetime.now(timezone.utc),
                            "detection_type": "plate" if plate.get("license_plate") else "vehicle",
                            "detected_class": plate.get("vehicle_type", "Car"),
                            "confidence": plate.get("plate_confidence", 0.9),
                            "bounding_box": [0, 0, 100, 100],
                            "license_plate_raw": plate.get("plate_raw"),
                            "license_plate_confidence": plate.get("plate_confidence", 0.9),
                            "ocr_engine": plate.get("ocr_engine", "EasyOCR"),
                            "inference_time_ms": res.processing_time_ms,
                            "meta": plate,
                        }
                        await crud.log_detection(db, log_data)
                        break
                    except Exception as db_err:
                        if attempt == 2:
                            logger.warning(f"Failed to log vehicle record: {db_err}")
                        else:
                            import asyncio
                            await asyncio.sleep(0.05 * (attempt + 1))

            for commit_attempt in range(3):
                try:
                    await db.commit()
                    break
                except Exception as commit_err:
                    if commit_attempt == 2:
                        logger.warning(f"Failed commit: {commit_err}")
                        await db.rollback()
                    else:
                        import asyncio
                        await asyncio.sleep(0.05 * (commit_attempt + 1))

            seen_plates: set = set()
            for p in res.detected_plates:
                lp = p.get("license_plate")
                if lp and lp != "NOT_DETECTED":
                    seen_plates.add(str(lp).strip().upper())
            unique_plates_list = sorted(seen_plates)

            return {
                "success": True,
                "run_id": res.run_id,
                "frames_processed": res.frames_processed,
                "vehicles_detected": res.vehicles_detected,
                "processing_time_ms": res.processing_time_ms,
                "records": res.detected_plates,
                "detected_plates": res.detected_plates,
                "unique_plates": unique_plates_list,
                "annotated_video_url": res.annotated_video_url,
                "csv_url": res.csv_url,
                "json_url": res.json_url,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video processing error: {str(e)}",
        )
