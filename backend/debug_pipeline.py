"""Detailed per-frame debug: plate crop sizes + OCR results on the test video."""
import glob, cv2, os
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetector
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetection
from modules.vehicle_recognition.detection.vehicle_detector import VehicleDetector
from modules.vehicle_recognition.ocr.ocr_engine import OCREngine

# Initialize models
vd = VehicleDetector()
vd.load()
pd = PlateDetector()
pd.load()
ocr = OCREngine()
ocr.load()

vids = sorted(glob.glob('/app/backend/uploads/17863704*.mp4'))
vid = vids[-1]
print(f"Video: {os.path.basename(vid)}\n")

cap = cv2.VideoCapture(vid)
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
frame_skip = max(10, int(fps * 0.5))
print(f"FPS={fps:.1f} | Frame skip={frame_skip}\n")

fi = 0
sampled = 0
while True:
    ok = cap.grab()
    if not ok:
        break
    if fi % frame_skip == 0:
        ok2, frame = cap.retrieve()
        if not ok2:
            fi += 1
            continue

        h, w = frame.shape[:2]
        # Run vehicle detection
        veh_dets, _ = vd.detect(frame)
        for vdet in veh_dets:
            x1 = int(vdet.bbox[0] * w)
            y1 = int(vdet.bbox[1] * h)
            x2 = int(vdet.bbox[2] * w)
            y2 = int(vdet.bbox[3] * h)
            vehicle_crop = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
            if vehicle_crop.size == 0:
                continue

            plate_dets, _ = pd.detect(vehicle_crop)
            if not plate_dets:
                # Fallback: lower 45% of vehicle
                plate_dets = [PlateDetection(bbox=[0.05, 0.40, 0.95, 0.95], confidence=0.50, plate_type="fallback")]

            for pdet in plate_dets:
                plate_crop = pdet.crop_from_image(vehicle_crop)
                if plate_crop.size == 0:
                    continue

                res = ocr.read(plate_crop, enhance=True)
                cv2.imwrite(f'/app/backend/debug_f{fi}.jpg', plate_crop)
                print(f"Frame {fi:4d} | Vehicle={vehicle_crop.shape} | Plate={plate_crop.shape} | OCR={res.raw_text if res else 'None'} | Conf={res.confidence:.4f if res else 0}")
        sampled += 1
    fi += 1

cap.release()
print(f"\nTotal frames sampled: {sampled}")
