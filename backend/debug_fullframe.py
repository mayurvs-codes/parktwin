"""Test plate detection on FULL frame vs vehicle crop."""
import glob, cv2, os
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetector
from modules.vehicle_recognition.detection.vehicle_detector import VehicleDetector

vd = VehicleDetector()
vd.load()
pd = PlateDetector()
pd.load()

vids = sorted(glob.glob('/app/backend/uploads/17863704*.mp4'))
vid = vids[-1]
cap = cv2.VideoCapture(vid)
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
frame_skip = max(10, int(fps * 0.5))
print(f"Video FPS={fps:.1f} frame_skip={frame_skip}\n")

fi = 0
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
        # Full frame plate detection
        full_dets, _ = pd.detect(frame)
        for det in full_dets:
            crop = det.crop_from_image(frame)
            cv2.imwrite(f'/app/backend/fullframe_plate_f{fi}.jpg', crop)
            print(f"Frame {fi:4d} | FULL FRAME: plate_conf={det.confidence:.3f} | crop_shape={crop.shape}")

        if not full_dets:
            print(f"Frame {fi:4d} | FULL FRAME: no plate detected")
    fi += 1

cap.release()
