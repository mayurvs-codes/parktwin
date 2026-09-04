import os
import subprocess
from pathlib import Path

raw_dir = Path(r"27-Aug-2026\27-Aug_3-55 to 5-05 pm\20260827154500-20260827170000")
out_dir = Path("videos")
out_dir.mkdir(exist_ok=True)

targets = [
    {
        "cam_id": "CAM-01",
        "name": "cam1_entry_gate.mp4",
        "pattern": "1A-IP Camera3_",
        "start": "00:00:10",
        "duration": "15"
    },
    {
        "cam_id": "CAM-02",
        "name": "cam2_parking_bay.mp4",
        "pattern": "10A-IP Camera16_",
        "start": "00:00:10",
        "duration": "15"
    },
    {
        "cam_id": "CAM-03",
        "name": "cam3_exit_ramp.mp4",
        "pattern": "16A-IP Camera5_",
        "start": "00:00:10",
        "duration": "15"
    }
]

print("=== EXTRACTING REAL CCTV CLIPS ===")
for item in targets:
    matches = list(raw_dir.glob(f"{item['pattern']}*.mp4"))
    if not matches:
        print(f"ERROR: No matching raw video for {item['pattern']}")
        continue
    src = matches[0]
    dst = out_dir / item["name"]
    print(f"Extracting {item['cam_id']} from {src.name} -> {dst.name}...")
    cmd = [
        "ffmpeg", "-y",
        "-ss", item["start"],
        "-i", str(src),
        "-t", item["duration"],
        "-vf", "scale=1280:720",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        str(dst)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0 and dst.exists():
        sz_mb = dst.stat().st_size / (1024 * 1024)
        print(f"  SUCCESS: {dst.name} ({sz_mb:.2f} MB)")
    else:
        print(f"  FAILED to extract {dst.name}: {res.stderr[-300:]}")
