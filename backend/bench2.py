"""Dual-video ANPR benchmark comparing journey_parking vs direct upload video."""
import glob, json, os
from engine.pipeline import ParkTwinPipeline
from backend.services.anpr_service import process_video_file

p = ParkTwinPipeline()
p.initialize()

vids_journey = sorted(glob.glob('/app/backend/uploads/journey_parking*.mp4'))
vids_ts = sorted(glob.glob('/app/backend/uploads/17863704*.mp4'))
test_vids = vids_journey[-1:] + vids_ts[-1:]

for vid in test_vids:
    print(f"\n=== {os.path.basename(vid)} ===")
    res = process_video_file(vid, p)
    json_path = res.json_url or ""
    if json_path.startswith("/outputs/"):
        fpath = "/app/backend/outputs/" + json_path[len("/outputs/"):]
    elif json_path.startswith("/api/v1/outputs/"):
        fpath = "/app/backend/outputs/" + json_path[len("/api/v1/outputs/"):]
    else:
        fpath = "/app/backend" + json_path
    if os.path.exists(fpath):
        data = json.load(open(fpath))
        plates = data.get("detected_plates", [])
        if plates:
            for plate in plates:
                print(f"  Plate={plate['license_plate']}  conf={plate['plate_confidence']}  engine={plate['ocr_engine']}")
        else:
            print("  No plates detected")
    else:
        print(f"  Output not found: {fpath}")
