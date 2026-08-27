"""
ParkTwin AI — Image Enhancer (v2 — Indian Plate Specialist)
=============================================================
Pre-processes license plate crops before OCR for maximum accuracy.

Pipeline:
  1. Detect plate type (white / yellow / green / black / HSRP)
  2. Resize to standard resolution
  3. Plate-type-aware inversion for dark/EV plates
  4. Perspective correction (deskew)
  5. CLAHE (contrast enhancement)
  6. Denoising
  7. Sharpening
  8. Multi-variant binarization (Otsu / Adaptive Gaussian / Sauvola)

Iteration 1 additions:
  - Indian plate background-color detection & masking
  - 3-pass binarization (Otsu, Adaptive Gaussian, Sauvola-style)
  - Plate-type aware preprocessing (green/black inversion)
Iteration 5 additions:
  - detect_plate_type() helper
"""

from __future__ import annotations

import cv2
import numpy as np

from backend.core.config import get_settings
from shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()
_enh = settings.ocr.enhancement


# ─── Plate Type Detection ─────────────────────────────────────────────────────

def detect_plate_type(crop: np.ndarray) -> str:
    """
    Auto-detect Indian plate type from background color.

    Returns one of: 'white', 'yellow', 'green', 'black'

    Indian plate types:
      - White  : Standard private vehicle (black text on white)
      - Yellow : Commercial/taxi (black text on yellow)
      - Green  : EV/electric (white text on green)
      - Black  : Dealer temp (yellow text on black)
    """
    if crop is None or crop.size == 0:
        return "white"
    try:
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        avg_hue = float(np.mean(hsv[:, :, 0]))
        avg_sat = float(np.mean(hsv[:, :, 1]))
        avg_val = float(np.mean(hsv[:, :, 2]))

        if avg_val < 60:
            return "black"                     # Dealer temp: very dark
        if 35 <= avg_hue <= 85 and avg_sat > 50:
            return "green"                     # EV: green background
        if 18 <= avg_hue <= 38 and avg_sat > 80:
            return "yellow"                    # Commercial/taxi
        return "white"                         # Standard private
    except Exception:
        return "white"


# ─── Multi-variant binarization ───────────────────────────────────────────────

def binarize_otsu(gray: np.ndarray) -> np.ndarray:
    """Otsu global threshold — best for high-contrast plates."""
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary


def binarize_adaptive(gray: np.ndarray) -> np.ndarray:
    """Adaptive Gaussian threshold — best for uneven illumination."""
    return cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15,
        C=4,
    )


def binarize_sauvola(gray: np.ndarray, window_size: int = 25, k: float = 0.2) -> np.ndarray:
    """
    Fast vectorized Sauvola-style local thresholding using OpenCV C++ SIMD box filtering.
    Eliminates slow Python loops while computing local mean and variance.
    """
    if gray is None or gray.size == 0:
        return gray
    gray_f = gray.astype(np.float32)
    # Fast local mean and mean-of-squares via OpenCV boxFilter / blur
    mean = cv2.blur(gray_f, (window_size, window_size), borderType=cv2.BORDER_REFLECT)
    mean_sq = cv2.blur(gray_f ** 2, (window_size, window_size), borderType=cv2.BORDER_REFLECT)
    variance = np.maximum(0.0, mean_sq - mean ** 2)
    std = np.sqrt(variance)
    threshold = mean * (1.0 + k * (std / 128.0 - 1.0))
    return np.where(gray_f >= threshold, np.uint8(255), np.uint8(0))


def binarize_niblack(gray: np.ndarray, window_size: int = 25, k: float = -0.2) -> np.ndarray:
    """
    Fast vectorized Niblack local thresholding using OpenCV box filtering.
    Excels at handling chrome reflection and gradient glare on HSRP plates.
    """
    if gray is None or gray.size == 0:
        return gray
    gray_f = gray.astype(np.float32)
    mean = cv2.blur(gray_f, (window_size, window_size), borderType=cv2.BORDER_REFLECT)
    mean_sq = cv2.blur(gray_f ** 2, (window_size, window_size), borderType=cv2.BORDER_REFLECT)
    variance = np.maximum(0.0, mean_sq - mean ** 2)
    std = np.sqrt(variance)
    threshold = mean + k * std
    return np.where(gray_f >= threshold, np.uint8(255), np.uint8(0))


def binarize_best(gray: np.ndarray) -> np.ndarray:
    """
    Run binarization modes (Otsu, Adaptive, Sauvola, Niblack) and pick the one with clearest text pixels.
    """
    b_otsu = binarize_otsu(gray)
    b_ada  = binarize_adaptive(gray)
    candidates = [b_otsu, b_ada]

    try:
        b_sauv = binarize_sauvola(gray)
        candidates.append(b_sauv)
    except Exception:
        pass

    try:
        b_nib = binarize_niblack(gray)
        candidates.append(b_nib)
    except Exception:
        pass

    # Pick the candidate with most "ink" pixels in a reasonable range (not all-black or all-white)
    best = b_otsu
    best_score = -1.0
    for cand in candidates:
        ink_ratio = float(np.count_nonzero(255 - cand)) / cand.size
        # Target: 10–50% ink (character pixels) — reject near-uniform binarizations
        score = ink_ratio if 0.08 <= ink_ratio <= 0.52 else 0.0
        if score > best_score:
            best_score = score
            best = cand
    return best


class ImageEnhancer:
    """
    Enhances license plate images before OCR.
    All methods can be used individually or via the process() pipeline.

    v2: Indian plate specialist — detects plate type and applies
    the right preprocessing for each plate color variant.
    """

    TARGET_MIN_WIDTH = 640
    TARGET_MIN_HEIGHT = 128

    def process(self, image: np.ndarray) -> np.ndarray:
        """Full enhancement pipeline."""
        if image is None or image.size == 0:
            raise ValueError("Empty image passed to enhancer")

        # Detect plate type before enhancement so we can apply color-aware steps
        plate_type = detect_plate_type(image)

        # 1. 4-Point Homography Perspective Rectification (un-skew extreme angles)
        img = self.detect_and_rectify_quadrilateral(image)

        # 2. Super-resolution & edge reconstruction for small/blurry crops
        img = self.super_resolve_edges(img)

        img = self.resize_standard(img)

        # Invert dark plates (green EV / black dealer) before all other steps
        # so white/yellow text becomes black text on white — optimal for PaddleOCR
        if plate_type in ("green", "black"):
            img = cv2.bitwise_not(img)

        # 3. Night-time headlight glare and harsh shadow gradient suppression
        img = self.suppress_glare_and_shadows(img)

        if _enh.clahe:
            img = self.apply_clahe(img)

        if _enh.denoising:
            img = self.denoise(img)

        if _enh.sharpening:
            img = self.sharpen(img)

        return img

    def detect_and_rectify_quadrilateral(
        self, image: np.ndarray, target_w: int = 280, target_h: int = 70
    ) -> np.ndarray:
        """
        Detect 4-point convex plate quadrilateral and rectify via homography perspective warp.
        Warp transforms severe perspective distortion (CCTV angles) into a flat canonical view.
        """
        if image is None or image.size == 0 or image.shape[0] < 12 or image.shape[1] < 24:
            return image
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edged = cv2.Canny(blurred, 50, 200)

            contours, _ = cv2.findContours(edged, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

            screen_cnt = None
            for c in contours:
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.04 * peri, True)
                if len(approx) == 4 and cv2.isContourConvex(approx):
                    area = cv2.contourArea(approx)
                    # Must cover at least 30% of crop area to avoid small inner noise
                    if area >= 0.30 * (image.shape[0] * image.shape[1]):
                        screen_cnt = approx
                        break

            if screen_cnt is None:
                # Fallback to standard perspective deskew
                return self.correct_perspective(image)

            # Order 4 points: top-left, top-right, bottom-right, bottom-left
            pts = screen_cnt.reshape(4, 2).astype(np.float32)
            rect = np.zeros((4, 2), dtype=np.float32)
            s = pts.sum(axis=1)
            rect[0] = pts[np.argmin(s)]  # TL
            rect[2] = pts[np.argmax(s)]  # BR
            diff = np.diff(pts, axis=1)
            rect[1] = pts[np.argmin(diff)]  # TR
            rect[3] = pts[np.argmax(diff)]  # BL

            dst = np.array([
                [0, 0],
                [target_w - 1, 0],
                [target_w - 1, target_h - 1],
                [0, target_h - 1]
            ], dtype=np.float32)

            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(image, M, (target_w, target_h), flags=cv2.INTER_CUBIC)
            return warped
        except Exception:
            return image

    def suppress_glare_and_shadows(self, image: np.ndarray) -> np.ndarray:
        """
        Suppresses specular reflection (headlight glare, direct sun) and deep shadow gradients.
        Uses adaptive multi-scale Retinex illumination decomposition in LAB color space.
        """
        try:
            if image is None or image.size == 0:
                return image
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            # Estimate illumination background via broad Gaussian
            bg = cv2.GaussianBlur(l, (31, 31), 0)
            # Subtract non-uniform illumination and re-center around 128
            l_norm = cv2.addWeighted(l, 1.2, bg, -0.6, 60)
            l_norm = np.clip(l_norm, 0, 255).astype(np.uint8)
            merged = cv2.merge([l_norm, a, b])
            return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
        except Exception:
            return image

    def super_resolve_edges(self, image: np.ndarray) -> np.ndarray:
        """
        Sub-pixel edge reconstruction and high-frequency stroke restoration for low-res CCTV crops.
        Scales up to high resolution (640x128) using Lanczos4 interpolation.
        """
        try:
            h, w = image.shape[:2]
            if h < self.TARGET_MIN_HEIGHT or w < self.TARGET_MIN_WIDTH:
                scale_y = max(1.0, float(self.TARGET_MIN_HEIGHT) / h)
                scale_x = max(1.0, float(self.TARGET_MIN_WIDTH) / w)
                scale = max(scale_x, scale_y)
                upscaled = cv2.resize(
                    image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4
                )
                # High-frequency stroke boost
                smooth = cv2.GaussianBlur(upscaled, (0, 0), 1.5)
                high_freq = cv2.addWeighted(upscaled, 1.8, smooth, -0.8, 0)
                return high_freq
            return image
        except Exception:
            return image

    def extract_strokes_morphology(self, image: np.ndarray) -> np.ndarray:
        """
        Extract dark text character strokes using Black-Hat morphological transformation.
        Isolates character strokes even under uneven lighting or noisy plate backgrounds.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            # Rectangular structuring element matching character stroke width/height
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 5))
            blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
            # Normalize and invert so strokes are black on white background
            norm = cv2.normalize(blackhat, None, 0, 255, cv2.NORM_MINMAX)
            inverted = cv2.bitwise_not(norm)
            return cv2.cvtColor(inverted, cv2.COLOR_GRAY2BGR)
        except Exception:
            return image

    def process_variants(self, image: np.ndarray) -> list[np.ndarray]:
        """
        Generate multiple enhanced variants of the plate crop.
        Used by OCREngine for multi-pass OCR.

        Returns:
            List of image variants, ordered by expected OCR quality.
        """
        if image is None or image.size == 0:
            return [image]

        plate_type = detect_plate_type(image)
        variants: list[np.ndarray] = []

        # V1: SOTA Full Pipeline (Homography + Retinex + CLAHE + Sharpening)
        try:
            v1 = self.process(image)
            variants.append(v1)
        except Exception:
            variants.append(image)

        # V2: De-glared Retinex variant with high-contrast
        try:
            v_deglare = self.suppress_glare_and_shadows(image)
            v_deglare_sharp = self.sharpen(self.resize_standard(v_deglare))
            variants.append(v_deglare_sharp)
        except Exception:
            pass

        # V3: Morphological stroke extraction (Black-Hat)
        try:
            v_morph = self.extract_strokes_morphology(variants[0])
            variants.append(v_morph)
        except Exception:
            pass

        # V4: Multi-variant binarization with stroke dilation
        try:
            gray = cv2.cvtColor(variants[0], cv2.COLOR_BGR2GRAY)
            binary = binarize_best(gray)
            # Reconnect thin stroke breaks with small 2x2 dilation
            kernel_dil = np.ones((2, 2), np.uint8)
            binary_dil = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_dil)
            binary_bgr = cv2.cvtColor(binary_dil, cv2.COLOR_GRAY2BGR)
            variants.append(binary_bgr)
        except Exception:
            pass

        # V5: Inverted raw if dark plate type
        if plate_type in ("green", "black"):
            try:
                variants.append(cv2.bitwise_not(image))
            except Exception:
                pass

        # V6: Raw normalized crop (Lanczos/Bicubic upscale without filter distortions)
        try:
            h, w = image.shape[:2]
            scale = max(self.TARGET_MIN_WIDTH / w, self.TARGET_MIN_HEIGHT / h, 1.0)
            if scale > 1.05:
                raw_up = cv2.resize(
                    image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4
                )
                variants.append(raw_up)
            else:
                variants.append(image)
        except Exception:
            pass

        return variants

    def process_for_plate(self, crop: np.ndarray) -> np.ndarray:
        """
        Single high-performance SOTA enhancement path for license plate regions.
        Combines perspective normalization, 640x128 Lanczos4 upscale, adaptive CLAHE,
        and unsharp mask edge enhancement.
        """
        if crop is None or crop.size == 0:
            return crop
        try:
            plate_type = detect_plate_type(crop)
            img = self.detect_and_rectify_quadrilateral(crop, target_w=640, target_h=128)
            img = self.super_resolve_edges(img)
            img = self.resize_standard(img)

            if plate_type in ("green", "black"):
                img = cv2.bitwise_not(img)

            img = self.suppress_glare_and_shadows(img)
            img = self.apply_clahe(img)
            img = self.denoise(img)
            img = self.sharpen(img)
            return img
        except Exception:
            return crop

    def segment_color_aware(self, image: np.ndarray) -> np.ndarray:
        """
        Handle special plate color contrasts (like EV green or dealer black plates).
        DEPRECATED: Use process() which now calls detect_plate_type() directly.
        """
        try:
            plate_type = detect_plate_type(image)
            if plate_type in ("green", "black"):
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                return cv2.cvtColor(cv2.bitwise_not(mask), cv2.COLOR_GRAY2BGR)
            return image
        except Exception as e:
            logger.debug(f"Color segmentation fallback: {e}")
            return image

    def resize_standard(self, image: np.ndarray) -> np.ndarray:
        """Resize to standard plate resolution (640x128) while preserving natural aspect ratio."""
        h, w = image.shape[:2]
        if w == 0 or h == 0:
            return image
        # Scale up so height meets target height and width meets minimum
        scale = max(self.TARGET_MIN_WIDTH / w, self.TARGET_MIN_HEIGHT / h, 1.0)
        new_w = max(int(w * scale), self.TARGET_MIN_WIDTH)
        new_h = max(int(h * scale), self.TARGET_MIN_HEIGHT)
        return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    def correct_perspective(self, image: np.ndarray) -> np.ndarray:
        """Correct slight horizontal tilt without flipping or distorting orientation."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            coords = np.column_stack(np.where(binary > 0))
            if len(coords) < 20:
                return image
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle += 90
            # Only correct small tilt angles (1° to 15°). Never rotate by large angles.
            if abs(angle) < 1.0 or abs(angle) > 15.0:
                return image
            h, w = image.shape[:2]
            M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE,
            )
            return rotated
        except Exception:
            return image

    def apply_clahe(self, image: np.ndarray) -> np.ndarray:
        """Apply adaptive CLAHE in LAB color space with luminance-tailored clip limit."""
        h, w = image.shape[:2]
        grid_y = max(2, min(8, h // 12))
        grid_x = max(2, min(8, w // 20))
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        
        # Adaptive clip limit based on mean luminance
        mean_l = float(np.mean(l_channel))
        base_clip = getattr(_enh, "clahe_clip_limit", 2.0)
        if mean_l < 75.0:
            clip = max(2.5, base_clip * 1.4)  # Boost dark plates
        elif mean_l > 175.0:
            clip = min(1.4, base_clip * 0.7)  # Prevent washout on overexposed plates
        else:
            clip = base_clip

        clahe = cv2.createCLAHE(
            clipLimit=clip,
            tileGridSize=(grid_x, grid_y),
        )
        l_channel = clahe.apply(l_channel)
        enhanced = cv2.merge([l_channel, a, b])
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    def denoise(self, image: np.ndarray) -> np.ndarray:
        """Edge-preserving bilateral filtering — sharpens stroke edges while removing compression noise."""
        return cv2.bilateralFilter(image, 7, 50, 50)

    def sharpen(self, image: np.ndarray) -> np.ndarray:
        """Laplacian-boosted unsharp mask sharpening to enhance character edges."""
        # Unsharp mask
        blurred = cv2.GaussianBlur(image, (0, 0), 2.0)
        unsharp = cv2.addWeighted(image, 1.6, blurred, -0.6, 0)
        # Targeted 3x3 Laplacian edge enhancement
        laplacian_kernel = np.array([[0, -0.5, 0], [-0.5, 3.0, -0.5], [0, -0.5, 0]], dtype=np.float32)
        sharpened = cv2.filter2D(unsharp, -1, laplacian_kernel)
        return sharpened

    def binarize(self, image: np.ndarray) -> np.ndarray:
        """Adaptive binarization — useful for very dark/bright plates."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11,
            C=2,
        )
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

