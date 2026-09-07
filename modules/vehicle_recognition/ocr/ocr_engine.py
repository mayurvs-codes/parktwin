"""
ParkTwin AI — OCR Engine (v2 — Indian Plate Specialist)
=========================================================
License plate text recognition with PaddleOCR (primary) and EasyOCR (fallback).

Features:
  - Automatic engine selection based on availability
  - Confidence filtering
  - Multi-line plate support
  - Result aggregation and deduplication

v2 additions (Iterations 1–5):
  Iteration 1: 3-pass binarization (Otsu/Adaptive/Sauvola) via ImageEnhancer.process_variants()
  Iteration 2: format_with_partial_fallback + format-validity confidence multiplier
  Iteration 3: Multi-crop OCR (3 crop padding variants + ±5° rotation for angled plates)
  Iteration 5: Plate-type detection → EV/black plates inverted before OCR
"""

from __future__ import annotations

import re
import time
from typing import List, Optional, Tuple

import numpy as np

from backend.core.config import get_settings
from shared.logging import get_logger
from .enhancer import ImageEnhancer, detect_plate_type
from modules.vehicle_recognition.fusion.plate_formatter import PlateFormatter

logger = get_logger(__name__)
settings = get_settings()

MIN_PLATE_CHARS = 5


class OCRResult:
    """Result from OCR on a single plate image."""

    def __init__(
        self,
        raw_text: str,
        confidence: float,
        engine: str,
        lines: Optional[List[str]] = None,
    ) -> None:
        self.raw_text = raw_text
        self.confidence = confidence
        self.engine = engine
        self.lines = lines or []

    def to_dict(self) -> dict:
        return {
            "raw_text": self.raw_text,
            "confidence": round(self.confidence, 4),
            "engine": self.engine,
        }


class OCREngine:
    """
    Unified OCR interface supporting PaddleOCR and EasyOCR.

    Usage:
        ocr = OCREngine()
        ocr.load()
        result = ocr.read(plate_image)
    """

    def __init__(self) -> None:
        self._cfg = settings.ocr
        self._engine_name = self._cfg.engine
        self._paddle = None
        self._easyocr = None
        self._enhancer = ImageEnhancer()
        self._formatter = PlateFormatter()
        self._active_engine: str = "none"
        logger.info(f"OCREngine initialized | preferred={self._engine_name}")

    def load(self) -> None:
        """Load the preferred OCR engine, with fallback."""
        if self._engine_name == "paddleocr":
            if self._load_paddle():
                # Attempt to preload easyocr as secondary cross-validation engine in background
                try:
                    self._load_easyocr()
                except Exception:
                    pass
            elif self._load_easyocr():
                logger.warning("PaddleOCR failed, using EasyOCR only")
            else:
                logger.error("All local OCR engines failed to load.")
                self._active_engine = "none"
        elif self._engine_name == "easyocr":
            if self._load_easyocr():
                pass
            elif self._load_paddle():
                logger.warning("EasyOCR failed, using PaddleOCR only")
            else:
                logger.error("All local OCR engines failed to load.")
                self._active_engine = "none"

    @staticmethod
    def _paddle_major_version() -> int:
        """Return the installed paddleocr major version (2 or 3+)."""
        try:
            import paddleocr as _po

            return int(str(_po.__version__).split(".")[0])
        except Exception:
            return 2

    def _load_paddle(self) -> bool:
        try:
            import sys
            import types
            if "imghdr" not in sys.modules:
                _imghdr = types.ModuleType("imghdr")
                _imghdr.what = lambda file, h=None: None
                sys.modules["imghdr"] = _imghdr

            if not hasattr(np, "sctypes"):
                np.sctypes = {
                    "int": [np.int8, np.int16, np.int32, np.int64],
                    "uint": [np.uint8, np.uint16, np.uint32, np.uint64],
                    "float": [np.float16, np.float32, np.float64],
                    "complex": [np.complex64, np.complex128],
                    "others": [bool, object, bytes, str, np.void],
                }

            from paddleocr import PaddleOCR

            # Initialize PaddleOCR with lower drop_score to capture low-contrast characters
            if self._paddle_major_version() >= 3:
                self._paddle = PaddleOCR(
                    lang=self._cfg.language,
                    use_textline_orientation=self._cfg.use_angle_cls,
                    text_det_thresh=self._cfg.det_db_thresh,
                    drop_score=0.1,
                    enable_mkldnn=False,
                )
            else:
                self._paddle = PaddleOCR(
                    use_angle_cls=self._cfg.use_angle_cls,
                    lang=self._cfg.language,
                    use_gpu=self._cfg.use_gpu,
                    det_db_thresh=self._cfg.det_db_thresh,
                    drop_score=0.1,
                    enable_mkldnn=False,
                    show_log=False,
                )
            self._active_engine = "paddleocr"
            logger.info("✅ PaddleOCR loaded (mkldnn=False)")
            return True
        except Exception as e:
            logger.warning(f"PaddleOCR load failed: {e}")
            return False

    def _load_easyocr(self) -> bool:
        try:
            import os
            import easyocr
            model_dir = os.path.expanduser("~/.EasyOCR/model")
            os.makedirs(model_dir, exist_ok=True)
            self._easyocr = easyocr.Reader(
                ["en"],
                gpu=self._cfg.use_gpu,
                model_storage_directory=model_dir,
                verbose=False,
            )
            if self._active_engine == "none":
                self._active_engine = "easyocr"
            logger.info("✅ EasyOCR loaded")
            return True
        except Exception as e:
            logger.warning(f"EasyOCR load failed: {e}")
            return False

    # ─── Public API ──────────────────────────────────────────────────────────

    def read(
        self,
        plate_image: np.ndarray,
        enhance: bool = True,
    ) -> Optional[OCRResult]:
        """
        Read text from a license plate image using a high-performance tiered strategy.

        Tier 1 (Fast Path): Primary enhanced crop. Exits immediately if valid plate found.
        Tier 2 (Fallback): Tight crop & raw normalized crop.
        Tier 3 (Edge Cases): Rotations and binarization for difficult plates.
        """
        if self._active_engine == "none":
            logger.error("No OCR engine loaded. Call ocr.load() first.")
            return None

        if plate_image is None or plate_image.size == 0:
            return None

        t0 = time.perf_counter()

        def _evaluate_candidate(img: np.ndarray) -> Tuple[Optional[OCRResult], str, float]:
            if img is None or img.size == 0:
                return None, "noise", 0.0

            res = None
            if self._active_engine == "paddleocr":
                res = self._read_paddle(img)
            elif self._active_engine == "easyocr":
                res = self._read_easyocr(img)

            if res is None or not res.raw_text:
                return None, "noise", 0.0

            formatted, fmt, conf_adj = self._formatter.format_with_partial_fallback(res.raw_text)
            if fmt == "noise" and getattr(res, "lines", None) and len(res.lines) > 1:
                formatted_st, fmt_st, conf_adj_st = self._formatter.format_stacked_lines(res.lines)
                if fmt_st != "noise":
                    formatted, fmt, conf_adj = formatted_st, fmt_st, conf_adj_st

            if fmt != "noise":
                multiplier = self._formatter.get_confidence_multiplier(fmt)
                res.confidence = min(1.0, res.confidence * conf_adj * multiplier)
                res.raw_text = formatted if formatted else res.raw_text
            else:
                res.confidence = res.confidence * 0.30

            return res, fmt, conf_adj

        best_result: Optional[OCRResult] = None
        best_fmt: str = "noise"

        # ── Tier 1: Primary Enhanced Crop (Fast Path) ──────────────────────────
        primary_candidates: List[np.ndarray] = []
        plate_type = detect_plate_type(plate_image)
        if plate_type in ("green", "black"):
            try:
                import cv2
                primary_candidates.append(cv2.bitwise_not(plate_image))
            except Exception:
                pass

        if enhance:
            try:
                primary_candidates.append(self._enhancer.process_for_plate(plate_image))
            except Exception:
                primary_candidates.append(plate_image)
        else:
            primary_candidates.append(plate_image)

        for cand in primary_candidates:
            res, fmt, _ = _evaluate_candidate(cand)
            if res and (best_result is None or res.confidence > best_result.confidence):
                best_result = res
                best_fmt = fmt

            # Fast-path early exit: Very confident and valid plate format
            if best_result and best_fmt != "noise" and best_result.confidence >= 0.85:
                elapsed = (time.perf_counter() - t0) * 1000
                logger.debug(
                    f"OCR[{best_result.engine}] (Tier 1 Fast-Path) text='{best_result.raw_text}' "
                    f"conf={best_result.confidence:.3f} time={elapsed:.1f}ms"
                )
                return self._cross_validate_and_boost(best_result, primary_candidates[0] if primary_candidates else plate_image)

        # ── Tier 2: Tight Crop & Raw Crop ────────────────────────────────────
        tier2_candidates: List[np.ndarray] = []
        h, w = plate_image.shape[:2]
        if h > 18 and w > 36:
            inner = plate_image[
                int(0.08 * h): int(0.92 * h),
                int(0.06 * w): int(0.94 * w)
            ]
            if inner.size > 0:
                tier2_candidates.append(inner)
        tier2_candidates.append(plate_image)

        for cand in tier2_candidates:
            res, fmt, _ = _evaluate_candidate(cand)
            if res and (best_result is None or res.confidence > best_result.confidence):
                best_result = res
                best_fmt = fmt

            if best_result and best_fmt != "noise" and best_result.confidence >= 0.85:
                elapsed = (time.perf_counter() - t0) * 1000
                logger.debug(
                    f"OCR[{best_result.engine}] (Tier 2 Fallback) text='{best_result.raw_text}' "
                    f"conf={best_result.confidence:.3f} time={elapsed:.1f}ms"
                )
                return self._cross_validate_and_boost(best_result, primary_candidates[0] if primary_candidates else plate_image)

        # ── Tier 3: Edge Cases (Small-angle rotations & Multi-Binarized) ─────
        if best_result is None or best_fmt == "noise" or best_result.confidence < 0.70:
            import cv2
            tier3_candidates: List[np.ndarray] = []
            if h >= 20 and w >= 40:
                for angle in (-4.0, 4.0):
                    try:
                        center = (w // 2, h // 2)
                        M = cv2.getRotationMatrix2D(center, angle, 1.0)
                        rotated = cv2.warpAffine(
                            plate_image, M, (w, h),
                            flags=cv2.INTER_CUBIC,
                            borderMode=cv2.BORDER_REPLICATE,
                        )
                        tier3_candidates.append(rotated)
                    except Exception:
                        pass

            try:
                base_img = primary_candidates[0] if primary_candidates else plate_image
                gray = cv2.cvtColor(base_img, cv2.COLOR_BGR2GRAY) if len(base_img.shape) == 3 else base_img
                from .enhancer import binarize_best
                binary = binarize_best(gray)
                binary_bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
                tier3_candidates.append(binary_bgr)
            except Exception:
                pass

            for cand in tier3_candidates:
                res, fmt, _ = _evaluate_candidate(cand)
                if res and (best_result is None or res.confidence > best_result.confidence):
                    best_result = res
                    best_fmt = fmt

                if best_result and best_fmt != "noise" and best_result.confidence >= 0.85:
                    break

        # ── Tier 4: EasyOCR Cross-Validation & Fallback ───────────────────────
        if (
            (best_result is None or best_fmt == "noise" or best_result.confidence < 0.50)
            and self._active_engine == "paddleocr"
            and self._easyocr is not None
        ):
            target_img = primary_candidates[0] if primary_candidates else plate_image
            easy_res = self._read_easyocr(target_img)
            if easy_res:
                formatted, fmt, conf_adj = self._formatter.format_with_partial_fallback(easy_res.raw_text)
                if fmt != "noise":
                    multiplier = self._formatter.get_confidence_multiplier(fmt)
                    easy_res.confidence = min(1.0, easy_res.confidence * conf_adj * multiplier)
                    easy_res.raw_text = formatted if formatted else easy_res.raw_text
                else:
                    easy_res.confidence = easy_res.confidence * 0.30

                if best_result is None or easy_res.confidence > best_result.confidence:
                    best_result = easy_res

        # Apply dual-engine cross-validation boost if applicable
        if best_result and best_result.confidence >= 0.60:
            target_img = primary_candidates[0] if primary_candidates else plate_image
            best_result = self._cross_validate_and_boost(best_result, target_img)

        elapsed = (time.perf_counter() - t0) * 1000
        if best_result:
            logger.debug(
                f"OCR[{best_result.engine}] text='{best_result.raw_text}' "
                f"conf={best_result.confidence:.3f} time={elapsed:.1f}ms"
            )

        return best_result

    def _cross_validate_and_boost(self, best_res: OCRResult, image: np.ndarray) -> OCRResult:
        """
        Cross-validate result with secondary engine (EasyOCR if primary is PaddleOCR).
        When both engines corroborate the character sequence, boost confidence by 15% (up to 1.0).
        """
        if self._easyocr is None or best_res is None or not best_res.raw_text:
            return best_res

        try:
            sec_res = self._read_easyocr(image)
            if sec_res and sec_res.raw_text:
                clean_primary = re.sub(r"[^A-Z0-9]", "", best_res.raw_text.upper())
                clean_sec = re.sub(r"[^A-Z0-9]", "", sec_res.raw_text.upper())
                
                # Check match or 1-char difference
                if clean_primary == clean_sec:
                    best_res.confidence = min(1.0, round(best_res.confidence * 1.15, 4))
                elif len(clean_primary) == len(clean_sec) and sum(c1 != c2 for c1, c2 in zip(clean_primary, clean_sec)) <= 1:
                    best_res.confidence = min(1.0, round(best_res.confidence * 1.08, 4))
        except Exception:
            pass

        return best_res

    # ─── Multi-Crop Strategy ──────────────────────────────────────────────────

    def _build_candidates(
        self, plate_image: np.ndarray, enhance: bool
    ) -> List[np.ndarray]:
        """
        Build candidate image crops. Kept for backward compatibility.
        """
        candidates: List[np.ndarray] = []
        if enhance:
            try:
                candidates.extend(self._enhancer.process_variants(plate_image))
            except Exception:
                candidates.append(plate_image)
        else:
            candidates.append(plate_image)
        return candidates

    def _run_engines_on(self, image: np.ndarray) -> Optional[OCRResult]:
        """Run the configured primary engine on a single candidate image."""
        if self._active_engine == "paddleocr":
            return self._read_paddle(image)
        return self._read_easyocr(image)

    def _read_paddle(self, image: np.ndarray) -> Optional[OCRResult]:
        """Run PaddleOCR and parse results with 640px high-resolution Lanczos normalization."""
        if image is None or image.size == 0 or image.shape[0] < 8 or image.shape[1] < 16:
            return None

        import cv2 as _cv2

        try:
            # Scale up image to high resolution with 32-pixel stride alignment for DBNet FPN
            h, w = image.shape[:2]
            if w < 640 or h < 128:
                scale = max(640.0 / w, 128.0 / h)
                target_w = max(640, int(round(w * scale)))
                target_h = max(128, int(round(h * scale)))
                # DBNet FPN strides require multiples of 32
                target_w = ((target_w + 31) // 32) * 32
                target_h = ((target_h + 31) // 32) * 32
                image = _cv2.resize(
                    image,
                    (target_w, target_h),
                    interpolation=_cv2.INTER_LANCZOS4,
                )

            image = np.ascontiguousarray(image)
            results = self._paddle.ocr(image, cls=False)
            if not results or not results[0]:
                return None

            texts, confs = [], []
            for line in results[0]:
                if line and len(line) >= 2:
                    text_info = line[1]
                    if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                        texts.append(str(text_info[0]))
                        confs.append(float(text_info[1]))

            if not texts:
                return None

            full_text = " ".join(texts)
            cleaned = re.sub(r"[^A-Z0-9]", "", full_text.upper())
            if len(cleaned) < MIN_PLATE_CHARS:
                return None

            avg_conf = sum(confs) / len(confs) if confs else 0.0
            min_conf = min(confs) if confs else 0.0
            # Weighted confidence balancing average and minimum character scores
            combined_conf = 0.25 * min_conf + 0.75 * avg_conf

            if combined_conf < self._cfg.confidence_threshold:
                return None

            return OCRResult(
                raw_text=full_text,
                confidence=combined_conf,
                engine="paddleocr",
                lines=texts,
            )
        except Exception as exc:
            logger.warning(f"PaddleOCR inference warning: {exc}")
            return None

    def _read_easyocr(self, image: np.ndarray) -> Optional[OCRResult]:
        """Run EasyOCR and parse results with 640px resolution normalization."""
        if self._easyocr is None:
            return None
        import cv2 as _cv2
        try:
            h, w = image.shape[:2]
            if w < 640 or h < 128:
                scale_x = 640.0 / w
                scale_y = 128.0 / h
                scale = max(scale_x, scale_y)
                image = _cv2.resize(
                    image,
                    (max(640, int(w * scale)), max(128, int(h * scale))),
                    interpolation=_cv2.INTER_LANCZOS4,
                )

            results = self._easyocr.readtext(image)
            if not results:
                return None

            texts, confs = [], []
            for item in results:
                if len(item) >= 2:
                    texts.append(str(item[1]))
                    if len(item) >= 3:
                        confs.append(float(item[2]))

            if not texts:
                return None

            combined = " ".join(texts).upper().strip()
            cleaned = re.sub(r"[^A-Z0-9]", "", combined)
            if len(cleaned) < MIN_PLATE_CHARS:
                return None

            avg_conf = sum(confs) / len(confs) if confs else 0.50
            min_conf = min(confs) if confs else 0.50
            combined_conf = 0.25 * min_conf + 0.75 * avg_conf

            min_floor = min(0.20, self._cfg.confidence_threshold)
            if combined_conf < min_floor:
                return None

            return OCRResult(
                raw_text=combined,
                confidence=combined_conf,
                engine="easyocr",
                lines=texts,
            )
        except Exception as e:
            logger.warning(f"EasyOCR read error: {e}")
            return None

    @property
    def engine_name(self) -> str:
        return self._active_engine

