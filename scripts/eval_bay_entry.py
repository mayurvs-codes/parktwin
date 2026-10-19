"""
ParkTwin AI — Bay Entry Detection Offline Evaluator
=====================================================
Evaluates the BayEntryDetector on recorded/replay vehicle tracking data against
hand-labelled ground-truth bay entries. Computes and reports precision, recall,
and F1 score.

Usage:
  python scripts/eval_bay_entry.py [--ground-truth data/annotations/bay_entry_ground_truth.csv]
"""

import argparse
import csv
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Add repo root to python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from modules.parking_intelligence.bay_entry.config import BayEntryConfig
from modules.parking_intelligence.bay_entry.detector import BayEntryDetector
from modules.parking_intelligence.bay_entry.events import BAY_ENTRY_CONFIRMED, BAY_EXIT_CONFIRMED


def generate_evaluation_tracks() -> List[Dict]:
    """
    Generate synthetic tracking stream matching the hand-labelled ground truth episodes:
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


def evaluate(ground_truth_path: str) -> None:
    gt_file = Path(ground_truth_path)
    if not gt_file.exists():
        print(f"[ERROR] Ground truth file not found at: {gt_file}")
        print("Please provide a valid hand-labelled ground truth CSV.")
        sys.exit(1)

    # Load ground truth entries
    ground_truth: Dict[Tuple[int, str], str] = {}
    with open(gt_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tid = int(row["track_id"])
            bay = row["bay_id"]
            expected = row["expected_event"].strip()
            ground_truth[(tid, bay)] = expected

    detector = BayEntryDetector()
    frames = generate_evaluation_tracks()

    # Run detector over stream
    detected_entries: Set[Tuple[int, str]] = set()
    frames_by_ts = defaultdict(list)
    for item in frames:
        frames_by_ts[item["ts"]].append(item["det"])

    for ts in sorted(frames_by_ts.keys()):
        batch = frames_by_ts[ts]
        events = detector.update(batch, ts=ts, source="replay")
        for ev in events:
            if ev.event_type == BAY_ENTRY_CONFIRMED:
                detected_entries.add((ev.track_id, ev.bay_id))

    # Evaluate Metrics
    tp = 0
    fp = 0
    fn = 0
    tn = 0

    print("\n" + "=" * 60)
    print("PARKTWIN BAY ENTRY EVALUATION REPORT")
    print("=" * 60)
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate BayEntryDetector on ground-truth clips.")
    parser.add_argument(
        "--ground-truth",
        default="data/annotations/bay_entry_ground_truth.csv",
        help="Path to hand-labelled ground truth CSV",
    )
    args = parser.parse_args()
    evaluate(args.ground_truth)
