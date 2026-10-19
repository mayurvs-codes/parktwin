import cv2
import os
import json

def inspect(name, path):
    if not os.path.exists(path):
        return None
    cap = cv2.VideoCapture(path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    dur = count / fps if fps else 0
    cap.release()
    return {'name': name, 'res': f'{w}x{h}', 'fps': round(fps, 1), 'count': count, 'duration': round(dur, 1)}

targets = [
    ('CAM-01 Entry Gate', 'apps/web/public/videos/cam1_entry_gate.mp4'),
    ('CAM-02 Parking Bay', 'apps/web/public/videos/cam2_parking_bay.mp4'),
    ('CAM-03 Exit Ramp', 'apps/web/public/videos/cam3_exit_ramp.mp4'),
    ('Test Video (ANPR 11 Tracks)', 'test_video.mp4'),
    ('Raw IP Cam 16 (Parking Bay)', '27-Aug-2026/27-Aug_3-55 to 5-05 pm/20260827154500-20260827170000/10A-IP Camera16_Carparking-01_Carparking-01_20260827154459_20260827160125_771251.mp4'),
    ('Raw IP Cam 5 (Exit Ramp)', '27-Aug-2026/27-Aug_3-55 to 5-05 pm/20260827154500-20260827170000/16A-IP Camera5_Carparking-01_Carparking-01_20260827154500_20260827164501_771244.mp4'),
    ('Raw IP Cam 3 (Entry Gate)', '27-Aug-2026/27-Aug_3-55 to 5-05 pm/20260827154500-20260827170000/1A-IP Camera3_Carparking-01_Carparking-01_20260827154459_20260827164058_770771.mp4'),
    ('Dataset Video 1', 'datasets/test_videos/test_video_1.mp4'),
    ('Dataset Video 2', 'datasets/test_videos/test_video_2.avi'),
    ('Dataset Video 3', 'datasets/test_videos/test_video_3.mov'),
    ('Upload Carparking Lot', 'backend/uploads/1785757763507_ai-generated-parking-lot.mp4'),
    ('Upload WhatsApp Video', 'backend/uploads/1786281465014_WhatsApp Video 2026-08-09 at 11.22.23 AM.mp4')
]

print('=== TARGET VIDEOS AUDIT ===')
for name, path in targets:
    info = inspect(name, path)
    if info:
        print(f"{info['name']:30s} | {info['res']:9s} | {info['fps']:4.1f} fps | {info['count']:6d} frames | {info['duration']:6.1f}s")
    else:
        print(f"{name:30s} | NOT FOUND ({path})")
