"""
ParkTwin AI — Color Recognizer
================================
Detects the dominant color of a vehicle from its image crop.

Method:
  1. Convert to HSV color space
  2. Create a mask to exclude background pixels (dark regions)
  3. Sample the center region (likely the vehicle body)
  4. Compute histogram over the masked region
  5. Match to predefined HSV color ranges from config

Colors: White, Black, Silver, Grey, Red, Blue, Green, Yellow, Orange, Brown
"""

from __future__ import annotations

from typing import List, Optional

import cv2
import numpy as np

from backend.core.config import get_settings, ColorRange
from shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ColorResult:
    def __init__(self, color: str, confidence: float, hsv_values: Optional[tuple] = None):
        self.color = color
        self.confidence = confidence
        self.hsv_values = hsv_values

    def to_dict(self) -> dict:
        return {"color": self.color, "confidence": round(self.confidence, 4)}


class ColorRecognizer:
    """
    HSV-based dominant vehicle color recognizer.

    Uses predefined color ranges from settings.yaml.
    Falls back to "Unknown" if no range matches with sufficient confidence.
    """

    def __init__(self) -> None:
        self._colors: List[ColorRange] = settings.color_detection.colors
        logger.info(f"ColorRecognizer initialized | colors={len(self._colors)}")

    def recognize(self, vehicle_crop: np.ndarray) -> ColorResult:
        """Identify the dominant color of a vehicle. Returns ColorResult."""
        if vehicle_crop is None or vehicle_crop.size == 0:
            return ColorResult("Unknown", 0.0)

        # ── Step 1: Focus on vehicle body (center region of image) ─────────────
        h, w = vehicle_crop.shape[:2]
        cx1 = int(w * 0.1)
        cx2 = int(w * 0.9)
        cy1 = int(h * 0.15)
        cy2 = int(h * 0.85)
        body_crop = vehicle_crop[cy1:cy2, cx1:cx2]

        if body_crop.size == 0:
            body_crop = vehicle_crop

        # ── Step 2: Convert to HSV ──────────────────────────────────────────
        hsv = cv2.cvtColor(body_crop, cv2.COLOR_BGR2HSV)

        # ── Step 3: Exclude very dark background pixels ─────────────────────
        brightness_mask = hsv[:, :, 2] > 30
        if brightness_mask.sum() < 100:
            brightness_mask = np.ones(hsv.shape[:2], dtype=bool)

        # ── Step 4: Compute mean HSV on valid pixels ────────────────────────
        valid_h = hsv[:, :, 0][brightness_mask]
        valid_s = hsv[:, :, 1][brightness_mask]
        valid_v = hsv[:, :, 2][brightness_mask]

        if len(valid_h) == 0:
            return ColorResult("Unknown", 0.0)

        mean_h = float(np.median(valid_h))
        mean_s = float(np.median(valid_s))
        mean_v = float(np.median(valid_v))

        # ── Step 5: Match to color ranges ───────────────────────────────────
        best_color = "Unknown"
        best_score = 0.0

        for color_range in self._colors:
            lo = np.array(color_range.hsv_lower, dtype=np.float32)
            hi = np.array(color_range.hsv_upper, dtype=np.float32)

            # Normalize how well the mean HSV falls within the range
            in_range = all([
                lo[0] <= mean_h <= hi[0],
                lo[1] <= mean_s <= hi[1],
                lo[2] <= mean_v <= hi[2],
            ])
            if in_range:
                # Compute confidence as distance from center of range
                center = (lo + hi) / 2
                span = hi - lo + 1e-6
                dist = np.abs(np.array([mean_h, mean_s, mean_v]) - center) / span
                score = float(1.0 - dist.mean())
                if score > best_score:
                    best_score = score
                    best_color = color_range.name

        # Special case: Red wraps around in HSV (0-10 AND 170-180)
        if best_color == "Unknown":
            if (mean_h < 10 or mean_h > 170) and mean_s > 80:
                best_color = "Red"
                best_score = 0.70

        return ColorResult(
            color=best_color,
            confidence=best_score,
            hsv_values=(mean_h, mean_s, mean_v),
        )

    def get_color_histogram(self, vehicle_crop: np.ndarray) -> dict:
        """Return per-color pixel count percentages (for debugging/analytics)."""
        if vehicle_crop is None or vehicle_crop.size == 0:
            return {}

        hsv = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2HSV)
        total_pixels = hsv.shape[0] * hsv.shape[1]
        histogram = {}

        for color_range in self._colors:
            lo = np.array(color_range.hsv_lower, dtype=np.uint8)
            hi = np.array(color_range.hsv_upper, dtype=np.uint8)
            mask = cv2.inRange(hsv, lo, hi)
            count = int(np.sum(mask > 0))
            histogram[color_range.name] = round(count / total_pixels, 4)

        return histogram
