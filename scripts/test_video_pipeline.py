import os
import sys
import json
import traceback
from pathlib import Path

# Ensure project root is in path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.services.anpr_service import process_video_file
from engine.pipeline import ParkTwinPipeline

def test_videos():
    video_dir = project_root / "videos"
    videos_to_test = [
        video_dir / "car_entering_parking.mp4",
        video_dir / "car_exiting_parking.mp4",
        video_dir / "ai_generated_parking_lot.mp4"
    ]

    print("Initializing ParkTwin AI Pipeline...")
    pipeline = ParkTwinPipeline()
    pipeline.initialize()

    results = {}

    for video_path in videos_to_test:
        if not video_path.exists():
            print(f"Error: Video {video_path} not found")
            continue

        print(f"\n==========================================")
        print(f"Testing Video: {video_path.name}")
        print(f"==========================================")

        try:
            res = process_video_file(
                video_path=video_path,
                pipeline=pipeline,
                camera_id=f"CAM_{video_path.stem.upper()}"
            )

            res_dict = res.to_dict()
            results[video_path.name] = res_dict

            print(f"Processing Status: {'SUCCESS' if res.success else 'FAILED'}")
            print(f"Frames Processed: {res.frames_processed}")
            print(f"Processing Time: {res.processing_time_ms / 1000.0:.2f}s")
            print(f"Vehicles Detected: {res.vehicles_detected}")
            print(f"Detected Plates: {res.detected_plates}")
            print(f"Annotated Video URL: {res.annotated_video_url}")
            print(f"CSV URL: {res.csv_url}")
            print(f"JSON URL: {res.json_url}")
            if res.error:
                print(f"Error Log: {res.error}")

        except Exception as e:
            print(f"Exception during processing {video_path.name}: {e}")
            traceback.print_exc()

    # Summary json
    summary_path = video_dir / "pipeline_test_summary.json"
    with open(summary_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nPipeline Test Completed! Summary saved to {summary_path}")

if __name__ == "__main__":
    test_videos()
