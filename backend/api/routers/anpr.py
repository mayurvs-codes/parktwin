"""
ParkTwin AI — ANPR Upload Router (Module 1 extension)
======================================================
Provides a dedicated ``POST /api/v1/anpr/upload`` endpoint for user-uploaded
video processing.  Accepts `.mp4`, `.avi`, and `.mov` files.

Processing delegation
---------------------
All pipeline execution is handled by ``backend.services.anpr_service``.
This router owns only:
  * file validation and persistence (saved to ``backend/uploads/``)
  * dependency injection (pipeline singleton via ``get_pipeline()``)
  * HTTP response shaping

No pipeline code is duplicated here.

Backward compatibility
----------------------
This router sits on ``/api/v1/anpr`` — completely separate from the existing
``/vehicles/process-video`` endpoint, which is left untouched.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.api.dependencies import get_pipeline, require_admin
from backend.core.config import get_settings
from backend.services.anpr_service import (
    ProcessingResult,
    _UPLOADS_DIR,
    process_video_file,
)
from shared.logging import get_logger

logger = get_logger("anpr_router")

router = APIRouter(prefix="/api/v1/anpr", tags=["ANPR Upload"])

# Accepted video extensions (lower-case, with dot prefix)
_ACCEPTED_EXTENSIONS = {".mp4", ".avi", ".mov"}
# Hard cap: 2 GB — guard against exhausting disk in Docker
_MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024


def _validate_extension(filename: str | None) -> str:
    """Return the lower-case extension or raise HTTPException(415)."""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="No filename provided.  Upload a .mp4, .avi, or .mov file.",
        )
    ext = Path(filename).suffix.lower()
    if ext not in _ACCEPTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{ext}'.  "
                "Accepted formats: .mp4, .avi, .mov"
            ),
        )
    return ext


@router.post(
    "/upload",
    summary="Upload a parking video and run the full ANPR pipeline",
    response_description=(
        "Processing result including annotated video URL, CSV URL, JSON URL, "
        "and detected plate list with confidence values."
    ),
)
async def upload_and_process(
    video: UploadFile = File(
        ...,
        description="Parking lot video to process (.mp4, .avi, or .mov).",
    ),
    pipeline=Depends(get_pipeline),
    _user=Depends(require_admin),
):
    """
    Upload a video file and process it through the Vehicle Recognition & ANPR
    pipeline.

    **Pipeline** (identical to Demo Mode and /vehicles/process-video):

    1. Vehicle Detection — YOLOv8
    2. Vehicle Tracking — ByteTrack
    3. Number Plate Detection
    4. OCR (PaddleOCR / EasyOCR)
    5. Temporal Fusion / Plate Formatting
    6. Annotation — bounding boxes + labels written onto each frame

    **Returns** a JSON object with:
    - ``success`` — processing outcome
    - ``run_id`` — unique identifier for this processing run
    - ``frames_processed`` / ``vehicles_detected``
    - ``annotated_video_url`` — URL to stream / download the annotated video
    - ``csv_url`` — URL to download per-detection CSV
    - ``json_url`` — URL to download full JSON result
    - ``detected_plates`` — list of unique plates with confidence and metadata
    """
    ext = _validate_extension(video.filename)
    t_upload = time.perf_counter()

    # ── Save upload to disk (chunked stream — never loads 100MB into RAM) ──────
    # Reading the entire file with video.read() blocks the async event loop
    # for the full duration of the upload. Chunked writes are non-blocking and
    # handle large files (100MB+) without memory pressure.
    safe_stem = Path(video.filename or "video").stem[:64]
    ts = int(time.time() * 1000)
    saved_filename = f"{ts}_{safe_stem}{ext}"
    saved_path = _UPLOADS_DIR / saved_filename

    CHUNK = 1024 * 1024  # 1 MB chunks
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
                        detail="File exceeds the 2 GB limit.",
                    )
    except HTTPException:
        raise
    except Exception as exc:
        saved_path.unlink(missing_ok=True)
        logger.error("Failed to save upload to %s: %s", saved_path, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read/save uploaded file: {exc}",
        )

    if total_bytes == 0:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    upload_ms = (time.perf_counter() - t_upload) * 1000
    logger.info(
        "Video saved | file=%s | size=%.1fMB | upload_ms=%.0f",
        saved_filename,
        total_bytes / 1024 / 1024,
        upload_ms,
    )

    # ── Delegate processing to worker thread (non-blocking) ─────────────────
    import asyncio

    result: ProcessingResult = await asyncio.to_thread(
        process_video_file,
        video_path=saved_path,
        pipeline=pipeline,
        camera_id="CAM_UPLOAD",
    )

    if not result.success:
        # Processing failed after the file was saved — report 422 so the
        # frontend gets the backend error message rather than a 500.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.error or "Video processing failed.",
        )

    return result.to_dict()


__all__ = ["router"]
