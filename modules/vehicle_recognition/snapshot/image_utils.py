"""
ParkTwin AI — Image Utilities
=============================
Provides image utilities including frame resizing, base64 encoding for
live WebSocket streaming, and cropped snapshot saving for database storage.
"""

import os
import uuid
import cv2
import numpy as np
import base64
from typing import Tuple, Optional
from shared.logging import get_logger

logger = get_logger("image_utils")

def resize_frame(frame: np.ndarray, target_width: int = 1280) -> np.ndarray:
    """Resize frame keeping aspect ratio."""
    h, w = frame.shape[:2]
    if w <= target_width:
        return frame
    aspect_ratio = h / w
    target_height = int(target_width * aspect_ratio)
    return cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)

def encode_to_jpeg_base64(frame: np.ndarray, quality: int = 80) -> str:
    """Encode OpenCV frame matrix to JPEG base64 string for WebSocket transfer."""
    try:
        success, encoded_img = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        if not success:
            return ""
        return base64.b64encode(encoded_img).decode("utf-8")
    except Exception as e:
        logger.error(f"Error encoding image to JPEG: {e}")
        return ""

def encode_frame_base64(frame: np.ndarray, quality: int = 80) -> str:
    """Alias for encode_to_jpeg_base64 to match pipeline expectation."""
    return encode_to_jpeg_base64(frame, quality)

def save_snapshot(image: np.ndarray, directory: str, prefix: str = "snap") -> Optional[str]:
    """Save an image crop to a directory with a unique filename and return its cross-platform path."""
    try:
        os.makedirs(directory, exist_ok=True)
        filename = f"{prefix}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(directory, filename)
        cv2.imwrite(filepath, image)
        return filepath.replace("\\", "/")
    except Exception as e:
        logger.error(f"Failed to save snapshot: {e}")
        return None

def crop_and_save(
    frame: np.ndarray,
    bbox: Tuple[float, float, float, float],
    output_dir: str,
    prefix: str = "crop"
) -> Optional[str]:
    """
    Crop bounding box from frame and save to output directory.
    bbox is in formats: (x1, y1, x2, y2)
    Returns the relative path of the saved file, or None if failed.
    """
    try:
        os.makedirs(output_dir, exist_ok=True)
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = [int(v) for v in bbox]

        # Clip coordinates to image borders
        x1 = max(0, min(x1, w - 1))
        y1 = max(0, min(y1, h - 1))
        x2 = max(0, min(x2, w - 1))
        y2 = max(0, min(y2, h - 1))

        if x2 <= x1 or y2 <= y1:
            return None

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        filename = f"{prefix}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = os.path.join(output_dir, filename)

        cv2.imwrite(filepath, crop)
        # Return path normalized with forward slashes for cross-platform compatibility
        return filepath.replace("\\", "/")
    except Exception as e:
        logger.error(f"Failed to crop and save image: {e}")
        return None

def draw_annotations(
    frame: np.ndarray,
    bbox: Tuple[float, float, float, float],
    label: str,
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2
) -> np.ndarray:
    """Draw a bounding box and text label onto a frame."""
    annotated = frame.copy()
    x1, y1, x2, y2 = [int(v) for v in bbox]
    cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)

    # Put background rect for text
    (w_text, h_text), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    cv2.rectangle(annotated, (x1, y1 - h_text - 10), (x1 + w_text, y1), color, -1)
    cv2.putText(
        annotated,
        label,
        (x1, y1 - 5),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (255, 255, 255),
        1,
        cv2.LINE_AA
    )
    return annotated
