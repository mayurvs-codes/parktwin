"""
DEFINITIVE TEST: PaddleOCR on full-frame plate crop.
Runs full frame plate detection on video, saves every crop, tests multiple preprocessing strategies.
"""
import glob, cv2, numpy as np, os

# ── 1. Extract the best full-frame plate crop from the video ──────────────────
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetector

pd = PlateDetector()
pd.load()

vids = sorted(glob.glob('/app/backend/uploads/17863704*.mp4'))
vid = vids[-1]
print(f"Video: {os.path.basename(vid)}\n")

cap = cv2.VideoCapture(vid)
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
frame_skip = max(10, int(fps * 0.5))

best_crop = None
best_conf = 0
best_fi = -1
crops_found = []

fi = 0
while True:
    ok = cap.grab()
    if not ok: break
    if fi % frame_skip == 0:
        ok2, frame = cap.retrieve()
        if ok2:
            dets, _ = pd.detect(frame)
            for det in dets:
                crop = det.crop_from_image(frame)
                if crop.size > 0:
                    crops_found.append((fi, det.confidence, crop.copy()))
                    if det.confidence > best_conf:
                        best_conf = det.confidence
                        best_crop = crop.copy()
                        best_fi = fi
    fi += 1
cap.release()

print(f"Found {len(crops_found)} plate crops. Best: frame={best_fi} conf={best_conf:.3f} shape={best_crop.shape if best_crop is not None else None}")

# Save all crops
for fi2, conf2, c in crops_found:
    cv2.imwrite(f'/app/backend/confirmed_plate_f{fi2}.jpg', c)
    print(f"  Saved frame {fi2} conf={conf2:.3f} shape={c.shape}")

# ── 2. Test PaddleOCR on every crop found ────────────────────────────────────
print("\n=== PaddleOCR test ===")
from paddleocr import PaddleOCR
poc = PaddleOCR(lang='en', use_textline_orientation=False, drop_score=0.05)

for fi2, conf2, crop in crops_found:
    h, w = crop.shape[:2]
    inner = crop[int(0.10*h):int(0.90*h), int(0.05*w):int(0.95*w)]
    # Direct
    r = poc.ocr(inner)
    texts = [(l[1][0], round(l[1][1], 4)) for l in (r[0] or []) if l and l[1]]
    # Upscaled
    up = cv2.resize(inner, (300, 100), interpolation=cv2.INTER_CUBIC)
    r2 = poc.ocr(up)
    texts2 = [(l[1][0], round(l[1][1], 4)) for l in (r2[0] or []) if l and l[1]]
    print(f"  Frame {fi2:4d} conf={conf2:.3f} inner={inner.shape} | direct={texts} | up300x100={texts2}")

print("\n=== DONE ===")
