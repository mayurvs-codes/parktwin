import sys
import json
import time
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.services.anpr_service import process_video_file
from engine.pipeline import ParkTwinPipeline

def run_cctv_check():
    video_dir = project_root / "videos"
    cctv_videos = [
        ("CAM_01_ENTRY", video_dir / "car-detection.mp4"),
        ("CAM_02_EXIT", video_dir / "Traffic.mp4"),
        ("CAM_03_OVERVIEW", video_dir / "video_3_parking_overview.mp4")
    ]

    print("==================================================")
    print("  PARKTWIN CCTV CONTROL CENTER - VIDEO VERIFICATION  ")
    print("==================================================")
    
    print("\n[1/3] Initializing ParkTwin AI Pipeline (YOLO + PaddleOCR / EasyOCR)...")
    start_init = time.time()
    pipeline = ParkTwinPipeline()
    pipeline.initialize()
    print(f"Pipeline initialized in {time.time() - start_init:.2f}s")

    results_summary = []

    for camera_id, video_path in cctv_videos:
        print(f"\n--------------------------------------------------")
        print(f" Camera ID : {camera_id}")
        print(f" Video File: {video_path.name}")
        print(f"--------------------------------------------------")

        if not video_path.exists():
            print(f"ERROR: Video file {video_path} does not exist.")
            continue

        start_time = time.time()
        res = process_video_file(
            video_path=video_path,
            pipeline=pipeline,
            camera_id=camera_id
        )
        elapsed = time.time() - start_time

        res_dict = res.to_dict()
        results_summary.append(res_dict)

        print(f" Status           : {'SUCCESS' if res.success else 'FAILED'}")
        print(f" Processing Time  : {elapsed:.2f} seconds")
        print(f" Total Frames     : {res.frames_processed}")
        print(f" Vehicles Count   : {res.vehicles_detected}")
        print(f" Detected Plates  : {res.detected_plates if res.detected_plates else 'None detected'}")
        if hasattr(res, 'annotated_video_url') and res.annotated_video_url:
            print(f" Output Video     : {res.annotated_video_url}")
        if res.error:
            print(f" Error Details    : {res.error}")

    output_summary = video_dir / "cctv_control_center_results.json"
    with open(output_summary, "w") as f:
        json.dump(results_summary, f, indent=2)

    print("\n==================================================")
    print(f" CCTV Control Center Processing Complete!")
    print(f" Detailed results saved to: {output_summary.name}")
    print("==================================================")

if __name__ == "__main__":
    run_cctv_check()
