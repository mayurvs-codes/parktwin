"""
ParkTwin AI — Ground-Truth Bay Entry Labelling Helper
=====================================================
Interactive tool to play CCTV archive footage and annotate ground-truth
bay entry, exit, and drive-past events for precision/recall evaluation.

Outputs: CSV with schema:
  episode_id,video_clip,timestamp_sec,frame_idx,track_id,bay_id,event_type,notes

Usage:
  # GUI mode (interactive video window):
  python scripts/label_bay_entries.py --video "videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4"

  # Headless / CLI prompt mode:
  python scripts/label_bay_entries.py --video "videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4" --headless
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from pathlib import Path

import cv2

# Project root
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))


def label_video_cli(video_path: Path, output_csv: Path):
    """Headless CLI labelling helper."""
    print(f"\n[INFO] Opening video for CLI metadata inspection: {video_path.name}")
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[ERROR] Could not open video file: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s = total_frames / fps
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    print(f"Video Summary:")
    print(f"  - File: {video_path.name}")
    print(f"  - Resolution: {w}x{h}")
    print(f"  - Total Frames: {total_frames}")
    print(f"  - FPS: {fps:.2f}")
    print(f"  - Duration: {duration_s:.2f} seconds ({duration_s/60:.2f} minutes)")
    print(f"  - Target Output CSV: {output_csv}\n")

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    file_exists = output_csv.exists()

    with open(output_csv, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "episode_id",
                "video_clip",
                "timestamp_sec",
                "frame_idx",
                "track_id",
                "bay_id",
                "event_type",
                "notes",
            ])

        print("Enter ground truth annotations (or type 'done' to finish):")
        ep_count = 1
        while True:
            prompt = input(f"\n[Episode #{ep_count}] Enter 'add' to record an event, or 'done' to exit: ").strip()
            if prompt.lower() in ("done", "q", "exit"):
                break
            if prompt.lower() != "add":
                continue

            try:
                t_sec_str = input("  Timestamp (seconds into video, e.g. 14.5): ").strip()
                t_sec = float(t_sec_str)
                frame_idx = int(t_sec * fps)
                track_id = input("  Track / Vehicle ID (e.g. 1, VEH-001): ").strip()
                bay_id = input("  Bay ID (e.g. SP-07, SP-11, BAY-01): ").strip()
                ev_type = input("  Event Type [BAY_ENTRY_CONFIRMED | DRIVE_PAST | BAY_EXIT_CONFIRMED]: ").strip()
                notes = input("  Notes (optional): ").strip()

                ep_id = f"GT-{int(time.time())}-{ep_count:03d}"
                writer.writerow([
                    ep_id,
                    video_path.name,
                    f"{t_sec:.2f}",
                    frame_idx,
                    track_id,
                    bay_id,
                    ev_type,
                    notes,
                ])
                f.flush()
                print(f"  [SAVED] Episode {ep_id} logged to {output_csv.name}")
                ep_count += 1
            except Exception as e:
                print(f"  [ERROR] Invalid input: {e}")


def label_video_gui(video_path: Path, output_csv: Path, start_sec: float = 0.0):
    """Interactive OpenCV GUI labelling interface."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[ERROR] Could not open video file: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s = total_frames / fps

    start_frame = int(start_sec * fps)
    if start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    file_exists = output_csv.exists()

    csv_file = open(output_csv, "a", newline="", encoding="utf-8")
    writer = csv.writer(csv_file)
    if not file_exists:
        writer.writerow([
            "episode_id",
            "video_clip",
            "timestamp_sec",
            "frame_idx",
            "track_id",
            "bay_id",
            "event_type",
            "notes",
        ])

    window_name = f"ParkTwin Ground-Truth Labeller: {video_path.name}"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720)

    print("\n" + "=" * 60)
    print("  PARKTWIN CCTV GROUND-TRUTH LABELLING INTERFACE")
    print("=" * 60)
    print("  Controls:")
    print("    [SPACE] : Pause / Resume playback")
    print("    [E]     : Mark BAY_ENTRY_CONFIRMED")
    print("    [P]     : Mark DRIVE_PAST")
    print("    [X]     : Mark BAY_EXIT_CONFIRMED")
    print("    [A] / [D]: Step backward / forward 1 second (when paused)")
    print("    [Q]     : Save and Quit")
    print("=" * 60 + "\n")

    paused = False
    ep_count = 1

    try:
        while True:
            if not paused:
                ret, frame = cap.read()
                if not ret:
                    print("[INFO] Reached end of video.")
                    break
            else:
                cap.set(cv2.CAP_PROP_POS_FRAMES, cap.get(cv2.CAP_PROP_POS_FRAMES) - 1)
                ret, frame = cap.read()

            current_frame = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
            current_sec = current_frame / fps

            # Overlay HUD
            hud_text = f"Time: {current_sec:.2f}s / {duration_s:.2f}s | Frame: {current_frame}/{total_frames} | {'PAUSED' if paused else 'PLAYING'}"
            cv2.rectangle(frame, (10, 10), (750, 50), (0, 0, 0), -1)
            cv2.putText(frame, hud_text, (20, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            cv2.imshow(window_name, frame)
            key = cv2.waitKey(int(1000 / fps) if not paused else 50) & 0xFF

            if key == ord("q"):
                break
            elif key == ord(" "):
                paused = not paused
            elif key == ord("d") and paused:
                new_f = min(total_frames - 1, current_frame + int(fps))
                cap.set(cv2.CAP_PROP_POS_FRAMES, new_f)
            elif key == ord("a") and paused:
                new_f = max(0, current_frame - int(fps))
                cap.set(cv2.CAP_PROP_POS_FRAMES, new_f)
            elif key in (ord("e"), ord("p"), ord("x")):
                ev_type_map = {
                    ord("e"): "BAY_ENTRY_CONFIRMED",
                    ord("p"): "DRIVE_PAST",
                    ord("x"): "BAY_EXIT_CONFIRMED",
                }
                ev_type = ev_type_map[key]
                paused = True
                print(f"\n[EVENT] Logging {ev_type} at {current_sec:.2f}s (Frame {current_frame}):")
                bay_id = input("  Enter Bay ID (e.g. SP-07, SP-11): ").strip()
                track_id = input("  Enter Track / Vehicle ID (or press Enter): ").strip() or "1"
                notes = input("  Notes (or press Enter): ").strip()

                ep_id = f"GT-{int(time.time())}-{ep_count:03d}"
                writer.writerow([
                    ep_id,
                    video_path.name,
                    f"{current_sec:.2f}",
                    current_frame,
                    track_id,
                    bay_id,
                    ev_type,
                    notes,
                ])
                csv_file.flush()
                print(f"  [SAVED] {ev_type} recorded as {ep_id}\n")
                ep_count += 1
                paused = False
    finally:
        cap.release()
        cv2.destroyAllWindows()
        csv_file.close()
        print(f"[INFO] Annotations saved to: {output_csv}")


def main():
    parser = argparse.ArgumentParser(description="ParkTwin Bay Entry Labelling Helper")
    parser.add_argument(
        "--video",
        type=str,
        default="videos/6B-IP Camera10_Carparking-01_Carparking-01_20260827165948_20260827170000_1718912.mp4",
        help="Path to CCTV video clip",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/annotations/cctv_bay_entry_ground_truth.csv",
        help="Output CSV path for hand annotations",
    )
    parser.add_argument(
        "--start-sec",
        type=float,
        default=0.0,
        help="Start offset in seconds",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run in headless CLI mode (no display/GUI window required)",
    )
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.is_absolute():
        video_path = BASE_DIR / video_path

    if not video_path.exists():
        print(f"[ERROR] Video file not found: {video_path}")
        sys.exit(1)

    out_csv = Path(args.output)
    if not out_csv.is_absolute():
        out_csv = BASE_DIR / out_csv

    # Check if GUI is possible
    has_display = bool(os.environ.get("DISPLAY") or sys.platform.startswith("win"))
    if args.headless or not has_display:
        label_video_cli(video_path, out_csv)
    else:
        try:
            label_video_gui(video_path, out_csv, args.start_sec)
        except cv2.error:
            print("[WARN] OpenCV GUI display failed, falling back to CLI interface.")
            label_video_cli(video_path, out_csv)


if __name__ == "__main__":
    main()
