"""Official ANPR benchmark — runs validation across sample and uploaded videos."""
import glob, json, os
from engine.pipeline import ParkTwinPipeline
from backend.services.anpr_service import process_video_file

pipeline = ParkTwinPipeline()
pipeline.initialize()

test_videos = [
    "plate_test.mp4",
    "car_with_plate_bbox.mp4",
    "real_car_plate.mp4",
]

# Also find recent uploads
uploads = sorted(glob.glob('/app/backend/uploads/17863704*.mp4'))
if uploads:
    test_videos.append(os.path.basename(uploads[-1]))

print("\n=================================================================")
print("           PARKTWIN AI — ANPR BENCHMARK SUITE")
print("=================================================================\n")

for vid_name in test_videos:
    vid_path = f"/app/backend/uploads/{vid_name}"
    if not os.path.exists(vid_path):
        continue

    print(f"▶ Testing Video: {vid_name}")
    res = process_video_file(vid_path, pipeline)

    if not res.success:
        print(f"  ❌ Processing failed: {res.error}\n")
        continue

    json_path = res.json_url or ""
    if json_path.startswith("/outputs/"):
        fpath = "/app/backend/outputs/" + json_path[len("/outputs/"):]
    elif json_path.startswith("/api/v1/outputs/"):
        fpath = "/app/backend/outputs/" + json_path[len("/api/v1/outputs/"):]
    else:
        fpath = "/app/backend" + json_path

    if os.path.exists(fpath):
        with open(fpath) as f:
            data = json.load(f)
        plates = data.get("detected_plates", [])
        print(f"  Frames Processed : {data.get('frames_processed', 0)}")
        print(f"  Vehicles Detected: {data.get('vehicles_detected', 0)}")
        print(f"  Plates Count     : {len(plates)}")
        for plate in plates:
            conf = plate.get('plate_confidence', 0.0)
            status = "✅ PASS (≥95%)" if conf >= 0.95 else ("⚠️ FALLBACK (85%)" if plate.get('ocr_engine') == 'anpr_fusion' else "❌ FAIL (<95%)")
            print(f"    • License Plate : {plate.get('license_plate')}")
            print(f"      Confidence    : {conf:.4f}  {status}")
            print(f"      OCR Engine    : {plate.get('ocr_engine')}")
            print(f"      Vehicle Type  : {plate.get('vehicle_type')}")
            print(f"      Color         : {plate.get('color')}")
    print()

print("=================================================================\n")
