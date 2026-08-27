"""Test two strategies on the video's actual vehicle crops."""
import glob, cv2, os
from paddleocr import PaddleOCR
import easyocr

poc = PaddleOCR(lang='en', use_textline_orientation=False, drop_score=0.1)
reader = easyocr.Reader(['en'], gpu=False, verbose=False)

from modules.vehicle_recognition.detection.vehicle_detector import VehicleDetector
vd = VehicleDetector()
vd.load()

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
        veh_dets, _ = vd.detect(frame)
        for vdet in veh_dets:
            x1, y1 = int(vdet.bbox[0]*w), int(vdet.bbox[1]*h)
            x2, y2 = int(vdet.bbox[2]*w), int(vdet.bbox[3]*h)
            vcrop = frame[max(0,y1):min(h,y2), max(0,x1):min(w,x2)]
            if vcrop.size == 0:
                continue

            vh, vw = vcrop.shape[:2]
            # Strategy A: OCR on full vehicle crop
            res_a = poc.ocr(vcrop)
            # Strategy B: tighter bottom strip (65-90% of vehicle height)
            tight = vcrop[int(0.65*vh):int(0.90*vh), int(0.05*vw):int(0.95*vw)]
            res_b = poc.ocr(tight) if tight.size > 0 else [None]
            # Strategy C: EasyOCR on tight strip
            res_c = reader.readtext(tight) if tight.size > 0 else []

            texts_a = [(line[1][0], round(line[1][1], 3)) for line in (res_a[0] or []) if line and line[1]]
            texts_b = [(line[1][0], round(line[1][1], 3)) for line in (res_b[0] or []) if line and line[1]]
            texts_c = [(item[1], round(item[2], 3)) for item in res_c]
            print(f"Frame {fi:4d} | VCrop={vcrop.shape[:2]} | A={texts_a} | B={texts_b} | C={texts_c}")
            cv2.imwrite(f'/app/backend/vcrop_f{fi}.jpg', vcrop)
            cv2.imwrite(f'/app/backend/tight_f{fi}.jpg', tight)
    fi += 1

cap.release()
