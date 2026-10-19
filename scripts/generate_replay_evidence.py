"""Generate annotated evidence image for replay bay polygons from real CCTV video."""
from pathlib import Path
import cv2
import numpy as np
import yaml

def main():
    config_path = Path("configs/replay_bay_polygons.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    cam10 = cfg["cameras"]["CAM-10"]
    video_path = Path(cam10["video_source"])
    evidence_path = Path(cam10["evidence_image"])

    cap = cv2.VideoCapture(str(video_path))
    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise RuntimeError(f"Could not read frame from {video_path}")

    overlay = frame.copy()
    colors = [
        (0, 255, 255),  # Yellow
        (0, 165, 255),  # Orange
        (0, 255, 0),    # Green
        (255, 0, 255),  # Magenta
        (255, 255, 0),  # Cyan
    ]

    for idx, (bay_id, bay_info) in enumerate(cam10["bays"].items()):
        pts = np.array(bay_info["polygon_pixels"], dtype=np.int32)
        color = colors[idx % len(colors)]
        cv2.fillPoly(overlay, [pts], color)
        cv2.polylines(frame, [pts], isClosed=True, color=(255, 255, 255), thickness=3)

        # Label position: near centroid
        cx = int(np.mean(pts[:, 0]))
        cy = int(np.mean(pts[:, 1]))
        cv2.putText(frame, bay_id, (cx - 70, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 4)
        cv2.putText(frame, bay_id, (cx - 70, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

    cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)
    cv2.imwrite(str(evidence_path), frame)
    print(f"Generated replay evidence image at: {evidence_path} (size: {frame.shape[1]}x{frame.shape[0]})")

if __name__ == "__main__":
    main()
