# Vehicle Detection (`modules/vehicle_recognition/detection/`)

The vehicle detection engine provides localized bounding boxes for all vehicles in a frame using a fine-tuned **YOLOv8 Medium (YOLOv8m)** model.

---

## Architecture & Model Specs

- **Base Architecture**: YOLOv8m (25.9M parameters, 78.9 GFLOPs)
- **Default Input Resolution**: $640 \times 640 \times 3$ (RGB)
- **Model Weights Path**: `models/yolov8m.pt` (automatically downloaded by `ModelManager` if missing)
- **Execution Providers**: CUDA (with FP16 half-precision), MPS (Apple Silicon), or CPU (INT8/FP32)

---

## Class Mapping & Filtering

COCO dataset class IDs mapped into the ParkTwin vehicle ontology:

| COCO Class ID | Raw Name | ParkTwin Class | Action |
| :---: | :--- | :--- | :--- |
| `2` | `car` | `Car` | Passed to tracking and attribute classifiers |
| `3` | `motorcycle` | `Motorcycle` | Passed to tracking and plate OCR |
| `5` | `bus` | `Bus` | Passed to tracking and attribute classifiers |
| `7` | `truck` | `Truck` | Passed to tracking and attribute classifiers |
| `8 - 18` | `custom` | Custom Vehicles | Extended classes (`auto_rickshaw`, `pickup_truck`, `van`, `sedan`, `suv`) |

---

## `DetectionResult` Data Class

```python
class DetectionResult:
    __slots__ = [
        "bbox", "confidence", "class_id", "class_name",
        "track_id", "frame_id", "timestamp"
    ]
    def __init__(self, bbox: List[float], confidence: float, class_id: int, class_name: str, ...):
        self.bbox = bbox              # [x1, y1, x2, y2] normalized to [0, 1]
        self.confidence = confidence  # e.g., 0.925
        self.class_id = class_id      # e.g., 2
        self.class_name = class_name  # e.g., "car"
```

---

## Model Loading & Caching (`model_manager.py`)

`ModelManager.ensure_weights()` guarantees zero manual setup:
1. Checks local cache `models/yolov8m.pt`.
2. Validates file integrity and size.
3. If absent, downloads from official Ultralytics release CDN over HTTPS.
4. Initializes PyTorch model with `half=True` if CUDA is active for a 2.2x inference speedup.
