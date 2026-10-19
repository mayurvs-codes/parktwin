"""
ParkTwin AI — CCTV Video Track Extractor
=========================================
Runs ParkTwinPipeline (YOLOv8m + ByteTrack) over a real CCTV video clip
and saves per-frame tracking output for evaluation and replay.

Outputs: data/annotations/real_cctv_tracks_camera10.json
Command: python scripts/extract_cctv_tracks.py --video "videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4"
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import cv2

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine.pipeline import ParkTwinPipeline


def extract_tracks(video_path: Path, output_json: Path, camera_id: str = "CAM-10", max_frames: int = 300):
    print(f"[*] Extracting real CCTV tracks from: {video_path.name}")
    pipeline = ParkTwinPipeline()
    pipeline.initialize()

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[ERROR] Could not open video: {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[*] Video FPS: {fps:.1f}, Total frames: {total_frames}")

    records_by_frame = []
    frame_idx = 0
    t0 = time.time()

    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        timestamp_s = frame_idx / fps
        results = pipeline.process_frame(frame, camera_id=camera_id)

        frame_records = []
        if results:
            for r in results:
                # Bounding box is normalized [x1, y1, x2, y2]
                bx = r.bbox
                cx = (bx[0] + bx[2]) / 2.0
                cy = (bx[1] + bx[3]) / 2.0
                frame_records.append({
                    "frame_idx": frame_idx,
                    "timestamp": timestamp_s,
                    "track_id": r.tracking_id,
                    "camera_id": camera_id,
                    "bbox": bx,
                    "centroid_normalized": [cx, cy],
                    "confidence": float(r.detection_confidence),
                    "vehicle_type": r.vehicle_type,
                    "license_plate": r.license_plate,
                })

        records_by_frame.append({
            "frame_idx": frame_idx,
            "timestamp": timestamp_s,
            "detections": frame_records,
        })

        frame_idx += 1
        if frame_idx % 50 == 0:
            print(f"  Processed {frame_idx}/{min(total_frames, max_frames)} frames...")

    cap.release()
    elapsed = time.time() - t0
    print(f"[✓] Extracted {frame_idx} frames in {elapsed:.2f}s ({frame_idx/elapsed:.1f} fps)")

    output_json.parent.mkdir(parents=True, exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump({
            "video_file": video_path.name,
            "camera_id": camera_id,
            "fps": fps,
            "total_frames_extracted": frame_idx,
            "frames": records_by_frame,
        }, f, indent=2)

    print(f"[✓] Saved real tracks to: {output_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract tracks from real CCTV footage.")
    parser.add_argument(
        "--video",
        default="videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4",
        help="Path to video file",
    )
    parser.add_argument(
        "--output",
        default="data/annotations/real_cctv_tracks_camera10.json",
        help="Path to output JSON file",
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=300,
        help="Maximum frames to process",
    )
    args = parser.parse_args()

    v_path = Path(args.video)
    if not v_path.is_absolute():
        v_path = BASE_DIR / v_path

    o_path = Path(args.output)
    if not o_path.is_absolute():
        o_path = BASE_DIR / o_path

    extract_tracks(v_path, o_path, max_frames=args.max_frames)
