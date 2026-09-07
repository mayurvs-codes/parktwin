"""
ParkTwin AI — Main AI Pipeline Orchestrator
=============================================
ParkTwinPipeline ties together all AI components for a single frame:

  1. Vehicle Detection (YOLOv8)
  2. Vehicle Tracking (ByteTrack)
  3. For each detected vehicle:
     a. Vehicle Type Classification
     b. Brand Classification
     c. Color Recognition
     d. License Plate Detection
     e. Image Enhancement
     f. OCR + Plate Formatting
  4. Returns a structured VehicleRecord per detected vehicle

Usage:
    pipeline = ParkTwinPipeline()
    pipeline.initialize()
    records = pipeline.process_frame(frame, camera_id="camera_01")
"""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from backend.core.config import get_settings
from shared.logging import get_logger
from modules.vehicle_recognition.snapshot.image_utils import save_snapshot
from modules.vehicle_recognition.detection.vehicle_detector import VehicleDetector
from modules.vehicle_recognition.tracking.tracker import Track
from modules.vehicle_recognition.tracking.track_manager import TrackManager
from modules.vehicle_recognition.plate_detection.plate_detector import (
    PlateDetector,
    PlateDetection,
)
from modules.vehicle_recognition.ocr.enhancer import ImageEnhancer
from modules.vehicle_recognition.ocr.ocr_engine import OCREngine
from modules.vehicle_recognition.fusion.plate_formatter import PlateFormatter
from modules.vehicle_recognition.classification.type_classifier import VehicleTypeClassifier
from modules.vehicle_recognition.classification.brand_classifier import BrandClassifier
from modules.vehicle_recognition.classification.color_recognizer import ColorRecognizer

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class VehicleRecord:
    """
    Full AI output for a single detected vehicle in a single frame.
    This is the core data structure broadcast to the API and stored in the DB.
    """
    record_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tracking_id: Optional[int] = None
    camera_id: str = "unknown"
    frame_id: int = 0

    # Detection
    bbox: List[float] = field(default_factory=list)          # normalized [x1,y1,x2,y2]
    detection_confidence: float = 0.0
    vehicle_class_raw: str = "car"                            # YOLO raw class

    # Classification
    vehicle_type: str = "Car"
    type_confidence: float = 0.0
    brand: str = "Unknown"
    brand_confidence: float = 0.0
    color: str = "Unknown"
    color_confidence: float = 0.0

    # Plate / OCR
    license_plate: Optional[str] = None
    plate_raw: Optional[str] = None
    plate_confidence: float = 0.0
    plate_format: str = "unknown"
    ocr_engine: str = "none"

    # Parking
    slot: Optional[str] = None
    entry_time: Optional[str] = None
    duration: Optional[str] = None

    # Snapshots
    vehicle_snapshot_path: Optional[str] = None
    plate_snapshot_path: Optional[str] = None

    # Timing
    inference_time_ms: float = 0.0
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_api_dict(self) -> Dict:
        """Serialize for API response and WebSocket broadcast."""
        return {
            "record_id": self.record_id,
            "tracking_id": self.tracking_id,
            "camera": self.camera_id,
            "slot": self.slot,
            "occupied": self.slot is not None,
            "license_plate": self.license_plate,
            "vehicle_number": self.license_plate,
            "vehicle_type": self.vehicle_type,
            "brand": self.brand,
            "color": self.color,
            "entry_time": self.entry_time,
            "duration": self.duration,
            "confidence": round(self.detection_confidence, 4),
            "plate_confidence": round(self.plate_confidence, 4),
            "bbox": self.bbox,
            "inference_time_ms": round(self.inference_time_ms, 2),
            "timestamp": self.timestamp,
            "vehicle_snapshot": self.vehicle_snapshot_path,
            "plate_snapshot": self.plate_snapshot_path,
        }


class ParkTwinPipeline:
    """
    Main AI pipeline for ParkTwin AI.
    Thread-safe via per-camera TrackerManagers.
    """

    def __init__(self) -> None:
        self._detector = VehicleDetector()
        self._track_manager = TrackManager()
        self._plate_detector = PlateDetector()
        self._enhancer = ImageEnhancer()
        self._ocr = OCREngine()
        self._formatter = PlateFormatter()
        self._type_clf = VehicleTypeClassifier()
        self._brand_clf = BrandClassifier()
        self._color_clf = ColorRecognizer()
        self._type_classifier = self._type_clf
        self._brand_classifier = self._brand_clf
        self._color_recognizer = self._color_clf
        self._initialized = False
        self._frame_counters: Dict[str, int] = {}
        self._snapshots_dir = Path(settings.storage.snapshots_dir)
        self._track_cache: Dict[Any, Dict[str, Any]] = {}

    def initialize(self) -> None:
        """Load all models. Call once at startup."""
        if self._initialized:
            return
        logger.info("🚀 Initializing ParkTwin AI Pipeline...")
        t0 = time.perf_counter()

        self._detector.load()
        self._plate_detector.load()
        self._ocr.load()
        self._type_clf.load()
        self._brand_clf.load()
        # Color recognizer needs no loading (rule-based)

        elapsed = (time.perf_counter() - t0) * 1000
        self._initialized = True
        logger.info(f"✅ Pipeline ready in {elapsed:.0f}ms")

    def process_frame(
        self,
        frame: np.ndarray,
        camera_id: str = "camera_01",
    ) -> List[VehicleRecord]:
        """Process one video frame through the full AI pipeline."""
        if not self._initialized:
            raise RuntimeError("Call pipeline.initialize() before processing frames.")

        t_start = time.perf_counter()
        frame_id = self._frame_counters.get(camera_id, 0)
        self._frame_counters[camera_id] = frame_id + 1

        # ── Step 1: Vehicle Detection ────────────────────────────────────────
        detections, det_ms = self._detector.detect(frame, frame_id, camera_id)

        # ── Step 2: Vehicle Tracking ─────────────────────────────────────────
        tracks: List[Track] = self._track_manager.update(camera_id, detections, frame)

        records: List[VehicleRecord] = []

        for track in tracks:
            rec = VehicleRecord(
                tracking_id=track.track_id,
                camera_id=camera_id,
                frame_id=frame_id,
                bbox=track.bbox,
                detection_confidence=track.confidence,
                vehicle_class_raw=track.class_name,
            )

            # ── Track-level cache: skip full OCR pipeline for already-identified vehicles ───
            # On a crowded parking video with 13 vehicles, running OCR on all of them every
            # sampled frame costs 13 × 750ms = ~10s/frame. The cache must aggressively skip
            # re-processing vehicles that already have a plate OR have exceeded max attempts.
            # If a high-confidence plate (>= 0.75) is already recognized, reuse cached results
            t_cache = self._track_cache.get(track.track_id)
            if t_cache and ((t_cache.get("plate") and t_cache.get("plate_conf", 0.0) >= 0.75) or t_cache.get("attempts", 0) >= 2):
                rec.vehicle_type = t_cache.get("vtype", rec.vehicle_type)
                rec.type_confidence = t_cache.get("type_conf", 0.90)
                rec.brand = t_cache.get("brand", "Unknown")
                rec.brand_confidence = t_cache.get("brand_conf", 0.0)
                rec.color = t_cache.get("color", "Unknown")
                rec.color_confidence = t_cache.get("color_conf", 0.0)
                rec.license_plate = t_cache.get("plate")
                rec.plate_raw = t_cache.get("plate_raw")
                rec.plate_confidence = t_cache.get("plate_conf", 0.0)
                rec.plate_format = t_cache.get("plate_fmt", rec.plate_format)
                rec.ocr_engine = t_cache.get("ocr_engine", "none")
                records.append(rec)
                continue



            # Crop vehicle from frame (expanded by 15% vertical / 10% horizontal to include bumper plates)
            h, w = frame.shape[:2]
            x1_raw = int(track.bbox[0] * w)
            y1_raw = int(track.bbox[1] * h)
            x2_raw = int(track.bbox[2] * w)
            y2_raw = int(track.bbox[3] * h)

            pad_y = int((y2_raw - y1_raw) * 0.15)
            pad_x = int((x2_raw - x1_raw) * 0.10)

            vehicle_crop = frame[
                max(0, y1_raw - pad_y):min(h, y2_raw + pad_y),
                max(0, x1_raw - pad_x):min(w, x2_raw + pad_x),
            ]

            if vehicle_crop.size == 0:
                records.append(rec)
                continue

            # ── Step 3: Vehicle Classification ───────────────────────────────
            vtype, type_conf = self._type_clf.classify(
                vehicle_crop, track.class_name, track.bbox
            )
            brand, brand_conf = self._brand_clf.classify(vehicle_crop)
            color_res = self._color_clf.recognize(vehicle_crop)

            rec.vehicle_type = vtype
            rec.type_confidence = type_conf
            rec.brand = brand
            rec.brand_confidence = brand_conf
            rec.color = color_res.color
            rec.color_confidence = color_res.confidence

            # ── Step 4: License Plate Detection ──────────────────────────────
            plate_detections, plate_ms = self._plate_detector.detect(vehicle_crop)

            # Fallback: if no plate contour detected, crop lower region (lower 45%) of vehicle
            if not plate_detections and vehicle_crop.shape[0] > 20 and vehicle_crop.shape[1] > 20:
                plate_detections = [
                    PlateDetection(
                        bbox=[0.05, 0.40, 0.95, 0.95],
                        confidence=0.50,
                        plate_type="vehicle_lower_fallback",
                    )
                ]

            for plate_det in plate_detections:
                plate_crop = plate_det.crop_from_image(vehicle_crop)
                if plate_crop.size == 0 or plate_crop.shape[0] < 10 or plate_crop.shape[1] < 16:
                    continue

                ocr_result = self._ocr.read(plate_crop, enhance=True)
                min_ocr_conf = getattr(getattr(settings, "ocr", None), "confidence_threshold", 0.35)
                if (
                    ocr_result
                    and ocr_result.raw_text
                    and len(ocr_result.raw_text.strip()) >= 3
                    and ocr_result.confidence >= min_ocr_conf
                ):
                    formatted, fmt, conf_adj = self._formatter.format_with_partial_fallback(ocr_result.raw_text)
                    if formatted and fmt != "noise":
                        final_conf = min(ocr_result.confidence * conf_adj, 1.0)
                        rec.license_plate = formatted
                        rec.plate_raw = ocr_result.raw_text
                        rec.plate_confidence = final_conf
                        rec.plate_format = fmt
                        rec.ocr_engine = ocr_result.engine

                        # Save plate snapshot
                        snap_path = save_snapshot(
                            plate_crop,
                            directory=str(self._snapshots_dir / "plates"),
                            prefix=f"{camera_id}_{track.track_id}",
                        )
                        rec.plate_snapshot_path = snap_path
                        break  # use best plate

            # Secondary pass: if plate was not found, run direct OCR on vehicle lower half with SOTA enhancement
            if not rec.license_plate and vehicle_crop.shape[0] >= 30 and vehicle_crop.shape[1] >= 40:
                lower_roi = vehicle_crop[int(vehicle_crop.shape[0] * 0.35):, :]
                enhanced_roi = self._enhancer.process_for_plate(lower_roi)
                ocr_result_roi = self._ocr.read(enhanced_roi, enhance=False)
                if (
                    ocr_result_roi
                    and ocr_result_roi.raw_text
                    and len(ocr_result_roi.raw_text.strip()) >= 3
                    and ocr_result_roi.confidence >= min_ocr_conf
                ):
                    formatted_roi, fmt_roi, conf_adj_roi = self._formatter.format_with_partial_fallback(ocr_result_roi.raw_text)
                    if formatted_roi and fmt_roi != "noise":
                        mult = self._formatter.get_confidence_multiplier(fmt_roi)
                        rec.license_plate = formatted_roi
                        rec.plate_raw = ocr_result_roi.raw_text
                        rec.plate_confidence = min(ocr_result_roi.confidence * conf_adj_roi * mult, 1.0)
                        rec.plate_format = fmt_roi
                        rec.ocr_engine = ocr_result_roi.engine


            # ── Step 6: Parking Info ──────────────────────────────────────────
            rec.entry_time = datetime.fromtimestamp(
                self._track_manager._entry_times.get(camera_id, {}).get(
                    track.track_id, time.time()
                ),
                tz=timezone.utc,
            ).isoformat()
            rec.duration = self._track_manager.get_duration_str(camera_id, track.track_id)

            # Save vehicle snapshot (every 30 frames)
            if frame_id % 30 == 0:
                snap_path = save_snapshot(
                    vehicle_crop,
                    directory=str(self._snapshots_dir / "vehicles"),
                    prefix=f"{camera_id}_{track.track_id}",
                )
                rec.vehicle_snapshot_path = snap_path

            # ── Update track cache with accumulated multi-frame readings ──────
            prev = self._track_cache.get(track.track_id, {})
            readings = list(prev.get("plate_readings", []))

            if rec.license_plate:
                readings.append({
                    "plate": rec.license_plate,
                    "plate_raw": rec.plate_raw,
                    "conf": rec.plate_confidence,
                    "fmt": rec.plate_format,
                    "engine": rec.ocr_engine,
                })

            attempts = prev.get("attempts", 0) + 1
            best_plate_info = self._best_plate_from_readings(readings)

            if best_plate_info:
                rec.license_plate = best_plate_info["plate"]
                rec.plate_raw = best_plate_info.get("plate_raw", rec.plate_raw)
                rec.plate_confidence = best_plate_info["conf"]
                rec.plate_format = best_plate_info.get("fmt", rec.plate_format)
                rec.ocr_engine = best_plate_info.get("engine", rec.ocr_engine)
                best_plate = best_plate_info["plate"]
                best_conf = best_plate_info["conf"]
            else:
                best_plate = rec.license_plate
                best_conf = rec.plate_confidence

            self._track_cache[track.track_id] = {
                "vtype": rec.vehicle_type,
                "type_conf": rec.type_confidence,
                "brand": rec.brand,
                "brand_conf": rec.brand_confidence,
                "color": rec.color,
                "color_conf": rec.color_confidence,
                "plate": best_plate,
                "plate_raw": rec.plate_raw,
                "plate_conf": best_conf,
                "plate_fmt": rec.plate_format,
                "ocr_engine": rec.ocr_engine,
                "attempts": attempts,
                "plate_readings": readings,
            }

            rec.inference_time_ms = (time.perf_counter() - t_start) * 1000
            records.append(rec)


        # ── Step 2b: Fallback for dedicated ANPR / close-up plate cameras ───
        if not tracks and frame.shape[0] > 20 and frame.shape[1] > 20:
            plate_dets, _ = self._plate_detector.detect(frame)
            for p_idx, p_det in enumerate(plate_dets):
                plate_crop = p_det.crop_from_image(frame)
                if plate_crop.size == 0:
                    continue
                ocr_result = self._ocr.read(plate_crop, enhance=True)
                min_ocr_conf = getattr(getattr(settings, "ocr", None), "confidence_threshold", 0.45)
                if (
                    ocr_result
                    and ocr_result.raw_text
                    and len(ocr_result.raw_text.strip()) >= 3
                    and ocr_result.confidence >= min_ocr_conf
                ):
                    formatted, fmt, conf_adj = self._formatter.format_with_partial_fallback(ocr_result.raw_text)
                    rec = VehicleRecord(
                        tracking_id=p_idx + 1,
                        camera_id=camera_id,
                        frame_id=frame_id,
                        bbox=p_det.bbox,
                        detection_confidence=p_det.confidence,
                        vehicle_class_raw="car",
                        vehicle_type="Car",
                        color="White",
                        license_plate=formatted or ocr_result.raw_text,
                        plate_raw=ocr_result.raw_text,
                        plate_confidence=ocr_result.confidence * conf_adj,
                        plate_format=fmt,
                        ocr_engine=ocr_result.engine,
                        inference_time_ms=(time.perf_counter() - t_start) * 1000,
                    )
                    records.append(rec)


        total_ms = (time.perf_counter() - t_start) * 1000
        if records:
            logger.debug(
                f"[{camera_id}] frame={frame_id} | vehicles={len(records)} | "
                f"total_latency={total_ms:.1f}ms"
            )

        return records

    def _best_plate_from_readings(self, readings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Pick the best plate from accumulated OCR reads across frames.
        SOTA Consensus:
          1. Validated Indian / BH candidates: score = (count^0.4) * (max_conf^1.4) * (avg_conf^0.2)
          2. Multi-frame positional character alignment & probability voting (conf^2.2)
          3. Highest confidence single read fallback
        """
        from collections import Counter, defaultdict

        if not readings:
            return {}

        valid = [r for r in readings if r.get("fmt") in ("indian_standard", "indian_standard_unverified", "bh_series", "diplomatic", "temp", "partial_recovery", "international")]
        if valid:
            plate_stats = defaultdict(lambda: {"count": 0, "confs": [], "best_r": None})
            for r in valid:
                p = r.get("plate")
                if not p:
                    continue
                plate_stats[p]["count"] += 1
                plate_stats[p]["confs"].append(r.get("conf", 0.0))
                if plate_stats[p]["best_r"] is None or r.get("conf", 0.0) > plate_stats[p]["best_r"].get("conf", 0.0):
                    plate_stats[p]["best_r"] = r

            if plate_stats:
                # Rank candidates by frequency & confidence profile
                def score_plate(item):
                    p_info = item[1]
                    count = p_info["count"]
                    max_c = max(p_info["confs"])
                    avg_c = sum(p_info["confs"]) / len(p_info["confs"])
                    return (count ** 0.4) * (max_c ** 1.4) * (avg_c ** 0.2)

                best_plate, best_info = max(plate_stats.items(), key=score_plate)
                ret_r = dict(best_info["best_r"])
                max_c = max(best_info["confs"])
                avg_c = sum(best_info["confs"]) / len(best_info["confs"])
                count = best_info["count"]

                # Boost confidence to 95%+ when multiple frames agree or high single read is verified
                if count >= 2 and max_c >= 0.80:
                    ret_r["conf"] = min(0.98, max(round(max_c * 1.12, 4), 0.95))
                elif count >= 3:
                    ret_r["conf"] = min(0.96, max(round(max_c * 1.08, 4), 0.92))
                elif max_c >= 0.85:
                    ret_r["conf"] = min(0.97, round(max_c * 1.08, 4))
                else:
                    ret_r["conf"] = round(max(max_c, 0.7 * avg_c + 0.3 * max_c), 4)

                return ret_r

        # SOTA: Multi-frame positional character alignment & probability voting
        # Cluster readings by normalized character length (e.g. 9, 10, 11)
        length_clusters = defaultdict(list)
        for r in readings:
            raw = re.sub(r"[^A-Z0-9]", "", (r.get("plate_raw") or r.get("plate") or "").upper())
            if 8 <= len(raw) <= 12:
                length_clusters[len(raw)].append((raw, r.get("conf", 0.5)))

        if length_clusters:
            # Pick most frequent length cluster
            best_len, cluster_reads = max(length_clusters.items(), key=lambda x: len(x[1]))
            if len(cluster_reads) >= 2:
                pos_char_scores = defaultdict(lambda: defaultdict(float))
                for raw_str, conf in cluster_reads:
                    weight = conf ** 2.2
                    for idx, char in enumerate(raw_str):
                        pos_char_scores[idx][char] += weight

                consensus_chars = []
                for idx in range(best_len):
                    if pos_char_scores[idx]:
                        top_char = max(pos_char_scores[idx].items(), key=lambda x: x[1])[0]
                        consensus_chars.append(top_char)
                    else:
                        consensus_chars.append("?")

                consensus_str = "".join(consensus_chars)
                if "?" not in consensus_str:
                    formatted, fmt, conf_adj = self._formatter.format_with_partial_fallback(consensus_str)
                    if formatted and fmt in ("indian_standard", "bh_series", "diplomatic"):
                        mult = self._formatter.get_confidence_multiplier(fmt)
                        return {
                            "plate": formatted,
                            "plate_raw": consensus_str,
                            "conf": round(min(0.97, 0.90 * conf_adj * mult), 4),
                            "fmt": fmt,
                            "ocr_engine": "temporal_consensus",
                        }

        # Fallback to single highest confidence entry
        return max(readings, key=lambda r: r.get("conf", 0.0))



    def draw_annotations(
        self,
        frame: np.ndarray,
        records: List[VehicleRecord],
        assignment: Optional[Any] = None,
    ) -> np.ndarray:
        """Draw bounding boxes, labels, and plate text on a frame. Returns annotated copy.

        The slot label for each vehicle is taken from Module 2's authoritative
        ``SlotAssignment`` when ``assignment`` is supplied (D5 Phase 5); otherwise
        the record's own ``slot`` (Module 1) is used as a fallback. This keeps the
        snapshot annotation consistent with Module 2's ownership of slot assignment
        without coupling Module 1 to Module 2's internals — the caller passes the
        assignment through as plain data.
        """
        annotated = frame.copy()
        h, w = annotated.shape[:2]

        # Module 2's authoritative lookup, if provided by the caller.
        slot_for = getattr(assignment, "slot_for", None)

        for rec in records:
            if not rec.bbox:
                continue
            x1 = int(rec.bbox[0] * w)
            y1 = int(rec.bbox[1] * h)
            x2 = int(rec.bbox[2] * w)
            y2 = int(rec.bbox[3] * h)

            # Box color: green if plate found, yellow otherwise
            color = (0, 200, 0) if rec.license_plate else (0, 200, 255)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            # Slot ownership: Module 2 authoritative, Module 1 fallback.
            slot = None
            if slot_for is not None and rec.tracking_id is not None:
                try:
                    slot = slot_for(int(rec.tracking_id))
                except (TypeError, ValueError):
                    slot = None
            if not slot:
                slot = rec.slot

            # Label
            label_parts = [
                f"#{rec.tracking_id}",
                rec.vehicle_type,
                rec.color,
            ]
            if rec.license_plate:
                label_parts.append(rec.license_plate)
            if slot:
                label_parts.append(f"[{slot}]")

            label = " | ".join(label_parts)
            font_scale = 0.55
            thickness = 1
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)

            # Background rectangle for label
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
            cv2.putText(
                annotated, label,
                (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (0, 0, 0),
                thickness,
                cv2.LINE_AA,
            )

        return annotated

    def reset(self, camera_id: Optional[str] = None) -> None:
        """Reset tracking state and caches (e.g. before processing a new video)."""
        if camera_id:
            self._track_manager.reset_camera(camera_id)
            self._frame_counters[camera_id] = 0
        else:
            for cam in list(self._track_manager._trackers.keys()):
                self._track_manager.reset_camera(cam)
            self._frame_counters.clear()
        self._track_cache.clear()
        logger.info(f"Pipeline reset completed for camera={camera_id or 'all'}")

    @property
    def is_ready(self) -> bool:
        return self._initialized

    def get_stats(self) -> Dict:
        return {
            "initialized": self._initialized,
            "detector": repr(self._detector),
            "ocr_engine": self._ocr.engine_name,
            "tracker_stats": self._track_manager.stats,
        }

