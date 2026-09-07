# Configuration Reference (`configs/settings.yaml`)

Comprehensive reference table of all settings in `configs/settings.yaml`:

| Section | Key | Default | Description |
| :--- | :--- | :---: | :--- |
| `app` | `environment` | `development` | `development` \| `production` \| `testing` |
| `app` | `log_level` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `detection` | `model_name` | `yolov8m` | YOLO weights (`yolov8n`, `yolov8s`, `yolov8m`, `yolov8l`, `yolov8x`) |
| `detection` | `confidence_threshold` | `0.50` | Minimum detection confidence score |
| `detection` | `iou_threshold` | `0.45` | NMS IoU bounding box overlap threshold |
| `tracking` | `algorithm` | `bytetrack` | Multi-object tracking algorithm |
| `tracking` | `track_buffer` | `300` | Frames to keep lost tracks alive across skips |
| `ocr` | `engine` | `paddleocr` | Primary OCR engine (`paddleocr` \| `easyocr`) |
| `ocr` | `confidence_threshold` | `0.45` | Minimum character recognition threshold |
| `ocr` | `fallback_engine` | `easyocr` | Secondary OCR engine for difficult plates |
| `parking` | `total_slots` | `10` | Default calibrated slot count |
| `parking` | `occupancy_iou_thresh` | `0.35` | IoU needed to declare slot occupied |
