"""
Extract plate crops from EVERY sampled frame (no skipping) and test OCR.
Save every crop and show which frame gives best result.
"""
import cv2, glob, os, numpy as np
from modules.vehicle_recognition.plate_detection.plate_detector import PlateDetector
from paddleocr import PaddleOCR

pd = PlateDetector()
pd.load()
poc = PaddleOCR(lang='en', use_textline_orientation=False, drop_score=0.05)

for vidpath in sorted(glob.glob('/app/backend/uploads/17863704*.mp4')):
    cap = cv2.VideoCapture(vidpath)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"\nVideo: {os.path.basename(vidpath)} fps={fps:.1f} total={total}")
    
    # Sample every 5 frames to find the sharpest plate
    fi = 0
    best_res = None
    best_fi = -1
    best_conf = 0
    
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        
        if fi % 5 == 0:
            h, w = frame.shape[:2]
            dets, _ = pd.detect(frame)
            for det in dets:
                crop = det.crop_from_image(frame)
                if crop.size == 0:
                    continue
                
                ch, cw = crop.shape[:2]
                inner = crop[int(0.10*ch):int(0.90*ch), int(0.05*cw):int(0.95*cw)]
                if inner.size == 0:
                    continue
                
                # Scale up: maintain aspect ratio with target_w=300
                scale = 300.0 / inner.shape[1]
                up = cv2.resize(inner, (300, int(inner.shape[0]*scale)), interpolation=cv2.INTER_LANCZOS4)
                
                r = poc.ocr(up)
                texts = [(l[1][0], round(l[1][1], 4)) for l in (r[0] or []) if l and l[1]]
                
                if texts:
                    max_conf = max(t[1] for t in texts)
                    print(f"  Frame {fi:4d} det_conf={det.confidence:.3f} crop={crop.shape} texts={texts}")
                    if max_conf > best_conf:
                        best_conf = max_conf
                        best_fi = fi
                        best_res = texts
                        cv2.imwrite('/app/backend/BEST_inner.jpg', inner)
                        cv2.imwrite('/app/backend/BEST_up.jpg', up)
                        cv2.imwrite('/app/backend/BEST_full.jpg', crop)
        fi += 1
    
    cap.release()
    if best_res:
        print(f"\nBEST for {os.path.basename(vidpath)}: frame={best_fi} conf={best_conf:.4f} texts={best_res}")
    else:
        print(f"\nNo OCR result found in {os.path.basename(vidpath)}")
