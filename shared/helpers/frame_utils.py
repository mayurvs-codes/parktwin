"""
ParkTwin AI — Shared Frame and Video Processing Helpers
======================================================
Consolidated utilities for decoding base64 frames and handling temp video files.
"""

from __future__ import annotations

import base64
import binascii
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile, status


def decode_b64_image(image_b64: str) -> np.ndarray:
    """Decode a (possibly data-URI) base64 image into a BGR frame."""
    try:
        raw = base64.b64decode(image_b64.split(",")[-1])
        img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    except (binascii.Error, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image: {e}",
        )
    if img is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format or failed to decode base64.",
        )
    return img


# Alias for backward compatibility
_decode_b64_image = decode_b64_image


@asynccontextmanager
async def save_temp_video(video: UploadFile) -> AsyncGenerator[str, None]:
    """Save an uploaded video file to a temporary file and clean up on exit."""
    suffix = ".mp4"
    if video.filename and "." in video.filename:
        ext = os.path.splitext(video.filename)[-1].lower()
        if ext in {".mp4", ".avi", ".mov", ".mkv", ".webm"}:
            suffix = ext
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = tmp.name
    try:
        try:
            await video.seek(0)
        except Exception:
            pass
        CHUNK = 1024 * 1024
        while True:
            chunk = await video.read(CHUNK)
            if not chunk:
                break
            tmp.write(chunk)
        tmp.flush()
        tmp.close()
        yield tmp_path
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


__all__ = ["decode_b64_image", "_decode_b64_image", "save_temp_video"]
