import cv2
import os
import numpy as np

os.makedirs('evidence/parking', exist_ok=True)
os.makedirs('evidence/exit', exist_ok=True)
os.makedirs('evidence/entry', exist_ok=True)

# 1. Inspect cam2_parking_bay.mp4
cap = cv2.VideoCapture('apps/web/public/videos/cam2_parking_bay.mp4')
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"Processing cam2_parking_bay.mp4 ({total} frames)...")

# Extract frame sequence for parking: e.g. approach, entering bay, parked
# We'll save frames at key intervals: f30, f75, f150, f250, f350
for fnum in [30, 75, 150, 250, 350]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f'evidence/parking/cam2_parking_bay_f{fnum}.png', frame)
        print(f"  Saved evidence/parking/cam2_parking_bay_f{fnum}.png")
cap.release()

# 2. Inspect cam3_exit_ramp.mp4
cap = cv2.VideoCapture('apps/web/public/videos/cam3_exit_ramp.mp4')
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"Processing cam3_exit_ramp.mp4 ({total} frames)...")

# Extract frame sequence for exit:
for fnum in [30, 75, 150, 250, 350]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f'evidence/exit/cam3_exit_ramp_f{fnum}.png', frame)
        print(f"  Saved evidence/exit/cam3_exit_ramp_f{fnum}.png")
cap.release()

# 3. Inspect cam1_entry_gate.mp4
cap = cv2.VideoCapture('apps/web/public/videos/cam1_entry_gate.mp4')
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"Processing cam1_entry_gate.mp4 ({total} frames)...")

for fnum in [30, 75, 150, 250, 350]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f'evidence/entry/cam1_entry_gate_f{fnum}.png', frame)
        print(f"  Saved evidence/entry/cam1_entry_gate_f{fnum}.png")
cap.release()

print("Visual evidence frames extracted successfully.")
