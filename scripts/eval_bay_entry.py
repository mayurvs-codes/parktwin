"""
ParkTwin AI — Bay Entry Detection Offline Evaluator
=====================================================
Evaluates the BayEntryDetector on recorded/replay vehicle tracking data against
hand-labelled ground-truth bay entries. Computes and reports precision, recall,
and F1 score.

Separates synthetic benchmarks from real CCTV footage evaluations.

Usage:
  # Synthetic benchmark (clearly named synthetic):
  python scripts/eval_bay_entry.py --mode synthetic

  # Real CCTV footage evaluation (requires real tracker output & hand-labelled ground truth):
  python scripts/eval_bay_entry.py --mode real --tracker-output data/annotations/real_cctv_tracks_camera10.json --ground-truth data/annotations/cctv_bay_entry_ground_truth.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Add repo root to python path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from shapely.geometry import box, Polygon

from modules.parking_intelligence.bay_entry.config import BayEntryConfig
from modules.parking_intelligence.bay_entry.detector import BayEntryDetector
from modules.parking_intelligence.bay_entry.events import (
    BAY_ENTRY_CONFIRMED,
    BAY_EXIT_CONFIRMED,
    BAY_OCCUPIED,
)


def generate_evaluation_tracks() -> List[Dict]:
    """
    Generate synthetic tracking stream matching the synthetic test episodes:
      - 1001: straight entry into SP-07 (x=4.8, y: -2.5 -> -6.2)
      - 1002: straight entry into SP-14 (x=-4.8, y: 2.5 -> 6.2)
      - 1003: aisle drive-past in front of SP-07 (x: 0.0 -> 10.0, y: -2.0, speed: 7 m/s)
      - 1004: aisle drive-past in front of SP-11 (x: -16.0 -> 0.0, y: 2.0, speed: 7 m/s)
      - 1005: entry into SP-11 (x=-14.4, y: 2.5 -> 6.2)
      - 1006: entry into SP-07 then departure (x=4.8, y: -2.5 -> -6.2 -> -2.0)
    """
    frames = []

    # 1001: enters SP-07
    for i in range(25):
        t = 100.0 + i * 0.1
        prog = min(1.0, i / 15.0)
        y = -2.5 + prog * (-6.2 - (-2.5))
        frames.append({"ts": t, "det": {"track_id": 1001, "camera_id": "CAM-02", "floor_coords": (4.8, y)}})

    # 1002: enters SP-14
    for i in range(25):
        t = 110.0 + i * 0.1
        prog = min(1.0, i / 15.0)
        y = 2.5 + prog * (6.2 - 2.5)
        frames.append({"ts": t, "det": {"track_id": 1002, "camera_id": "CAM-02", "floor_coords": (-4.8, y)}})

    # 1003: drive-past along aisle adjacent to SP-07
    for i in range(20):
        t = 120.0 + i * 0.1
        x = 0.0 + i * 0.7  # fast passing
        y = -2.0
        frames.append({"ts": t, "det": {"track_id": 1003, "camera_id": "CAM-02", "floor_coords": (x, y)}})

    # 1004: drive-past along aisle adjacent to SP-11
    for i in range(20):
        t = 130.0 + i * 0.1
        x = -16.0 + i * 0.7
        y = 2.0
        frames.append({"ts": t, "det": {"track_id": 1004, "camera_id": "CAM-02", "floor_coords": (x, y)}})

    # 1005: enters SP-11
    for i in range(25):
        t = 140.0 + i * 0.1
        prog = min(1.0, i / 15.0)
        y = 2.5 + prog * (6.2 - 2.5)
        frames.append({"ts": t, "det": {"track_id": 1005, "camera_id": "CAM-02", "floor_coords": (-14.4, y)}})

    # 1006: enters SP-07 then leaves
    for i in range(25):
        t = 150.0 + i * 0.1
        prog = min(1.0, i / 15.0)
        y = -2.5 + prog * (-6.2 - (-2.5))
        frames.append({"ts": t, "det": {"track_id": 1006, "camera_id": "CAM-02", "floor_coords": (4.8, y)}})

    return sorted(frames, key=lambda f: f["ts"])


def evaluate_synthetic(ground_truth_path: str) -> None:
    gt_file = Path(ground_truth_path)
    if not gt_file.exists():
        print(f"[ERROR] Ground truth file not found at: {gt_file}")
        sys.exit(1)

    ground_truth: Dict[Tuple[int, str], str] = {}
    with open(gt_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tid = int(row["track_id"])
            bay = row["bay_id"]
            expected = row["expected_event"].strip()
            ground_truth[(tid, bay)] = expected

    detector = BayEntryDetector()
    detector.register_camera("CAM-02", status="calibrated")
    detector.register_bay("SP-07", box(4.8 - 1.4, -6.2 - 2.7, 4.8 + 1.4, -6.2 + 2.7), center=(4.8, -6.2))
    detector.register_bay("SP-11", box(-14.4 - 1.4, 6.2 - 2.7, -14.4 + 1.4, 6.2 + 2.7), center=(-14.4, 6.2))
    detector.register_bay("SP-14", box(-4.8 - 1.4, 6.2 - 2.7, -4.8 + 1.4, 6.2 + 2.7), center=(-4.8, 6.2))

    frames = generate_evaluation_tracks()

    detected_entries: Set[Tuple[int, str]] = set()
    frames_by_ts = defaultdict(list)
    for item in frames:
        frames_by_ts[item["ts"]].append(item["det"])

    for ts in sorted(frames_by_ts.keys()):
        batch = frames_by_ts[ts]
        events = detector.update(batch, ts=ts, source="demo")
        for ev in events:
            if ev.event_type == BAY_ENTRY_CONFIRMED:
                detected_entries.add((ev.track_id, ev.bay_id))

    tp = 0
    fp = 0
    fn = 0
    tn = 0

    print("\n" + "=" * 60)
    print("PARKTWIN BAY ENTRY EVALUATION REPORT [SYNTHETIC TEST-ONLY]")
    print("=" * 60)
    print(f"Data Origin: Synthetic Trajectory Simulator")
    print(f"Ground truth source: {gt_file}")
    print(f"Total labelled episodes: {len(ground_truth)}\n")

    for (tid, bay), expected in ground_truth.items():
        predicted = (tid, bay) in detected_entries
        if expected == BAY_ENTRY_CONFIRMED:
            if predicted:
                tp += 1
                outcome = "TP (Hit)"
            else:
                fn += 1
                outcome = "FN (Miss)"
        else:
            if predicted:
                fp += 1
                outcome = "FP (False Alarm)"
            else:
                tn += 1
                outcome = "TN (Correct Rejection)"
        print(f"Track {tid} -> {bay}: Expected={expected:20s} | Detected={str(predicted):5s} | {outcome}")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    print("\n" + "-" * 60)
    print(f"True Positives  (TP) : {tp}")
    print(f"True Negatives  (TN) : {tn}")
    print(f"False Positives (FP) : {fp}")
    print(f"False Negatives (FN) : {fn}")
    print(f"Precision            : {precision:.2%}")
    print(f"Recall               : {recall:.2%}")
    print(f"F1 Score             : {f1:.2%}")
    print("=" * 60 + "\n")


def evaluate_real(tracker_output_path: str, ground_truth_path: str) -> None:
    track_file = Path(tracker_output_path)
    gt_file = Path(ground_truth_path)

    print("\n" + "=" * 60)
    print("PARKTWIN BAY ENTRY EVALUATION REPORT [REAL CCTV FOOTAGE]")
    print("=" * 60)
    print(f"Tracker Output Source: {track_file}")
    print(f"Ground Truth File:     {gt_file}")

    if not track_file.exists():
        print(f"[ERROR] Real tracker output JSON not found: {track_file}")
        print("Please extract real tracks first:")
        print("  python scripts/extract_cctv_tracks.py --video <video_path>")
        sys.exit(1)

    # Check if hand-labelled ground truth exists and contains valid rows
    has_labels = False
    ground_truth = []
    if gt_file.exists():
        with open(gt_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            ground_truth = [r for r in reader if r.get("event_type")]
            has_labels = len(ground_truth) > 0

    if not has_labels:
        print("\n[STATUS: BLOCKED ON HUMAN GROUND-TRUTH LABELS]")
        print("-" * 60)
        print("No human hand-labelled ground truth entries found.")
        print("Per project ground rules, real evaluation CANNOT proceed with fabricated labels.")
        print("\nREQUIRED ACTION FROM OPERATOR:")
        print("  1. Review CCTV video and annotate ground-truth entries/drive-pasts:")
        print("     python scripts/label_bay_entries.py --video \"videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4\"")
        print("  2. Once labels are recorded to data/annotations/cctv_bay_entry_ground_truth.csv, re-run:")
        print("     python scripts/eval_bay_entry.py --mode real --tracker-output data/annotations/real_cctv_tracks_camera10.json --ground-truth data/annotations/cctv_bay_entry_ground_truth.csv")
        print("=" * 60 + "\n")
        sys.exit(0)

    # When hand labels ARE provided, run detector on real tracks
    with open(track_file, "r", encoding="utf-8") as f:
        track_data = json.load(f)

    print(f"Loaded {track_data.get('total_frames_extracted', 0)} frames from real CCTV.")
    print(f"Evaluating against {len(ground_truth)} hand-labelled ground-truth events...")

    # TODO: Once operator provides labels, compute metrics honestly
    print("=" * 60 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate BayEntryDetector on ground-truth clips.")
    parser.add_argument(
        "--mode",
        choices=["synthetic", "real"],
        default="synthetic",
        help="Evaluation mode: 'synthetic' or 'real' CCTV footage",
    )
    parser.add_argument(
        "--ground-truth",
        default="data/annotations/bay_entry_ground_truth.csv",
        help="Path to hand-labelled ground truth CSV",
    )
    parser.add_argument(
        "--tracker-output",
        default="data/annotations/real_cctv_tracks_camera10.json",
        help="Path to extracted real CCTV tracks JSON",
    )
    args = parser.parse_args()

    if args.mode == "synthetic":
        evaluate_synthetic(args.ground_truth)
    else:
        gt_path = args.ground_truth
        if gt_path == "data/annotations/bay_entry_ground_truth.csv":
            gt_path = "data/annotations/cctv_bay_entry_ground_truth.csv"
        evaluate_real(args.tracker_output, gt_path)
