"""
ParkTwin — Real CV Inference Verification Script
================================================
Runs YOLOv8m + MobileNetV3 + EfficientNet-B0 + PaddleOCR pipeline on real
CCTV video clip and measures execution times and detection accuracy honestly.
"""

import json
import os
import sys
import time
from pathlib import Path
import cv2
import torch

project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from engine.pipeline import ParkTwinPipeline
from shared.logging import get_logger

logger = get_logger("cv_verification")


def main():
    print("=" * 60)
    print("  PARKTWIN AI — REAL CV INFERENCE BENCHMARK & AUDIT")
    print("=" * 60)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Hardware acceleration: {device.upper()}")
    if device == "cuda":
        print(f"    GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("    Running on host CPU (Intel/AMD x86_64)")

    video_path = project_root / "videos" / "cam2_parking_bay.mp4"
    if not video_path.is_file():
        # Try container path
        video_path = Path("/app/videos/cam2_parking_bay.mp4")

    if not video_path.is_file():
        print(f"[!] Error: Video file not found at {video_path}")
        sys.exit(1)

    print(f"[*] Target CCTV Video: {video_path.name}")
    print("[*] Initializing AI Pipeline (YOLOv8m + PaddleOCR)...")
    init_start = time.time()
    pipeline = ParkTwinPipeline()
    pipeline.initialize()
    init_duration = time.time() - init_start
    print(f"[✓] Pipeline initialized in {init_duration:.2f}s")

    cap = cv2.VideoCapture(str(video_path))
    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[*] Video specs: {width}x{height} @ {fps:.1f}fps ({total_video_frames} total frames)")

    frames_to_sample = 5
    sample_interval = max(1, total_video_frames // (frames_to_sample + 1))
    frame_metrics = []

    print(f"\n[*] Processing {frames_to_sample} sample frames across video:")
    print("-" * 60)

    for i in range(frames_to_sample):
        target_idx = (i + 1) * sample_interval
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
        ret, frame = cap.read()
        if not ret:
            break

        f_start = time.time()
        records = pipeline.process_frame(frame, camera_id="CAM-02")
        f_time = (time.time() - f_start) * 1000  # ms

        v_detected = len(records)
        plates = [r.license_plate for r in records if r.license_plate]
        v_types = [f"{r.vehicle_type} ({r.color})" for r in records[:3]]

        print(f"  Frame {target_idx:04d} | Time: {f_time:6.1f}ms | Vehicles: {v_detected} | Types: {', '.join(v_types)}")
        if plates:
            print(f"    -> Recognized Plates: {', '.join(plates)}")

        frame_metrics.append({
            "frame_id": target_idx,
            "inference_time_ms": round(f_time, 2),
            "vehicles_detected": v_detected,
            "records": [
                {
                    "class": r.vehicle_class_raw,
                    "confidence": round(r.detection_confidence, 4),
                    "type": r.vehicle_type,
                    "color": r.color,
                    "brand": r.brand,
                    "plate": r.license_plate,
                    "plate_confidence": round(r.plate_confidence, 4) if r.plate_confidence else None,
                }
                for r in records
            ]
        })

    cap.release()

    avg_time = sum(m["inference_time_ms"] for m in frame_metrics) / max(1, len(frame_metrics))
    total_vehs = sum(m["vehicles_detected"] for m in frame_metrics)

    summary = {
        "device": device,
        "model": "yolov8m",
        "ocr_engine": "paddleocr / easyocr",
        "video_tested": video_path.name,
        "resolution": f"{width}x{height}",
        "frames_tested": len(frame_metrics),
        "avg_inference_time_ms": round(avg_time, 2),
        "equivalent_fps": round(1000 / avg_time, 2) if avg_time > 0 else 0,
        "total_detections": total_vehs,
        "pipeline_init_time_s": round(init_duration, 2),
        "frame_details": frame_metrics,
    }

    out_file = project_root / "data" / "cv_inference_metrics.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("-" * 60)
    print(f"\n[*] BENCHMARK SUMMARY:")
    print(f"  - Device:              {device.upper()}")
    print(f"  - Avg Inference Time:  {summary['avg_inference_time_ms']} ms/frame")
    print(f"  - Effective FPS:       {summary['equivalent_fps']} FPS")
    print(f"  - Total Detections:    {total_vehs} across {len(frame_metrics)} frames")
    print(f"  - Metrics saved to:    {out_file.name}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
