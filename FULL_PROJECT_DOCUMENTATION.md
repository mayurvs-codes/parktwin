# ParkTwin AI — Complete Project Documentation Manual

> **Comprehensive Unified Technical Manual & Architecture Guide**  
> *Generated on September 3, 2026 — Covers all modules, models, pipelines, APIs, UI, and deployment.*

---

## 📑 Master Table of Contents

- [1. System Overview & Technology Stack](#1-system-overview--technology-stack)
- [2. AI Pipeline & Engine Architecture (`engine/`)](#2-ai-pipeline--engine-architecture-engine)
  - [2.1 Pipeline Overview & VehicleRecord Schema](#21-pipeline-overview--vehiclerecord-schema)
  - [2.2 Detailed Pipeline Engine (`engine/pipeline.py`)](#22-detailed-pipeline-engine-enginepipelinepy)
  - [2.3 Frame Processor & Multi-Threaded Streaming (`engine/frame_processor.py`)](#23-frame-processor--multi-threaded-streaming-engineframe_processorpy)
- [3. Vehicle Recognition Subsystem (`modules/vehicle_recognition/`)](#3-vehicle-recognition-subsystem-modulesvehicle_recognition)
  - [3.1 Vehicle Detection (YOLOv8m)](#31-vehicle-detection-yolov8m)
  - [3.2 Multi-Object Tracking & Re-ID (ByteTrack)](#32-multi-object-tracking--re-id-bytetrack)
  - [3.3 License Plate Detection (DBNet FPN Multi-Scale)](#33-license-plate-detection-dbnet-fpn-multi-scale)
  - [3.4 OCR Engine & Image Enhancement (PaddleOCR + EasyOCR)](#34-ocr-engine--image-enhancement-paddleocr--easyocr)
  - [3.5 Vehicle Attribute Classification (Type, Brand, Color)](#35-vehicle-attribute-classification-type-brand-color)
  - [3.6 License Plate Formatting & Indian Standards (HSRP)](#36-license-plate-formatting--indian-standards-hsrp)
- [4. Parking Intelligence Module (`modules/parking_intelligence/`)](#4-parking-intelligence-module-modulesparking_intelligence)
  - [4.1 Slot Detection & Spatial Geometry](#41-slot-detection--spatial-geometry)
  - [4.2 Real-Time Occupancy Management](#42-real-time-occupancy-management)
  - [4.3 Parking Session Lifecycle](#43-parking-session-lifecycle)
  - [4.4 Parking Events & Violations](#44-parking-events--violations)
- [5. Smart Parking Analytics Engine (`modules/analytics/`)](#5-smart-parking-analytics-engine-modulesanalytics)
  - [5.1 Occupancy Analytics](#51-occupancy-analytics)
  - [5.2 Traffic Analytics](#52-traffic-analytics)
  - [5.3 Utilization & Duration Analytics](#53-utilization--duration-analytics)
  - [5.4 Trends & Statistical Percentiles](#54-trends--statistical-percentiles)
  - [5.5 Analytics REST API Reference](#55-analytics-rest-api-reference)
- [6. Backend API Architecture (`backend/`)](#6-backend-api-architecture-backend)
  - [6.1 ANPR Video Upload API](#61-anpr-video-upload-api)
  - [6.2 Vehicles API](#62-vehicles-api)
  - [6.3 Parking API](#63-parking-api)
  - [6.4 Multi-Camera Journey API](#64-multi-camera-journey-api)
  - [6.5 Authentication & Security Architecture](#65-authentication--security-architecture)
  - [6.6 Database & SQLAlchemy Schema](#66-database--sqlalchemy-schema)
  - [6.7 Configuration Reference (`settings.yaml`)](#67-configuration-reference-settingsyaml)
- [7. Integration Layer & Real-Time Event Bus (`modules/integration_layer/`)](#7-integration-layer--real-time-event-bus-modulesintegration_layer)
  - [7.1 Event Bus Architecture](#71-event-bus-architecture)
  - [7.2 WebSocket Real-Time Manager](#72-websocket-real-time-manager)
  - [7.3 Data Adapters](#73-data-adapters)
  - [7.4 Integration Gateway](#74-integration-gateway)
- [8. Frontend Application Architecture (`apps/web/`)](#8-frontend-application-architecture-appsweb)
  - [8.1 Frontend Pages Reference (All 10 Routes)](#81-frontend-pages-reference-all-10-routes)
  - [8.2 API Service Layer](#82-api-service-layer)
  - [8.3 State Management & WebSockets](#83-state-management--websockets)
  - [8.4 Reusable UI Components](#84-reusable-ui-components)
- [9. DevOps & Container Architecture (`docker/`)](#9-devops--container-architecture-docker)
  - [9.1 Docker Architecture & Operations](#91-docker-architecture--operations)
  - [9.2 Operational Tuning & Configuration Guide](#92-operational-tuning--configuration-guide)
  - [9.3 Production Deployment Guide](#93-production-deployment-guide)
- [10. Incident Post-Mortem & Stability Engineering Log](#10-incident-post-mortem--stability-engineering-log)

---



# 1. System Overview & Technology Stack


## 🏛️ System Overview

ParkTwin AI combines computer vision (YOLOv8, PaddleOCR, MobileNetV3, EfficientNet), multi-object tracking (ByteTrack), geometric spatial intelligence, real-time event distribution (WebSocket/Redis), and a 3D digital twin visualization frontend (Next.js 15.5) into a unified platform.

```mermaid
graph TD
    subgraph Input_Layer [Input Layer]
        CCTV["CCTV RTSP Streams / MP4 Feeds"]
        Upload["Video / Image Uploads (ANPR & Journey)"]
    end

    subgraph AI_Engine [AI Inference Engine]
        FP["FrameProcessor (Capture & Thread Pool)"]
        Pipe["ParkTwinPipeline (Orchestrator)"]
        YOLO["VehicleDetector (YOLOv8m / YOLOv11)"]
        BT["ByteTracker (Stateful Tracking & ReID)"]
        PD["PlateDetector (PaddleOCR DBNet Multi-Scale)"]
        OCR["OCREngine (PaddleOCR + EasyOCR Fallback)"]
        Enhance["ImageEnhancer (Lanczos4, Niblack, CLAHE)"]
        Fmt["PlateFormatter (Indian HSRP Standard)"]
        Class["VehicleTypeClassifier (MobileNetV3)"]
        Brand["BrandClassifier (EfficientNet-B0)"]
        Color["ColorRecognizer (HSV Median Classifier)"]
    end

    subgraph Domain_Layer [Domain & Intelligence Layer]
        PI["ParkingIntelligence (Slot Detection P01-P10)"]
        SM["SessionManager (Entry / Parked / Exit)"]
        Occ["OccupancyManager (Real-Time Slot States)"]
        Analytics["AnalyticsService (Traffic, Utilization, Trends)"]
    end

    subgraph Integration_Layer [Integration & Event Bus]
        EB["EventBus (MemoryBus / RedisBus)"]
        WS["WebSocketManager (/ws/realtime)"]
        API["FastAPI REST Routers (/api/v1/*, /integration/*)"]
        DB[("SQLite / PostgreSQL + WAL Mode")]
    end

    subgraph Frontend_Layer [Frontend & Presentation Layer]
        Next["Next.js 15.5 (React 19, Tailwind, Lucide)"]
        Twin["3D Digital Twin (Three.js / React Three Fiber)"]
        Dash["Real-Time Dashboard & Slot Grid"]
        LiveANPR["ANPR Lab & Benchmark Visualizer"]
    end

    CCTV --> FP --> Pipe
    Upload --> Pipe
    Pipe --> YOLO --> BT --> Class
    BT --> Brand
    BT --> Color
    BT --> PD --> Enhance --> OCR --> Fmt
    Pipe --> PI
    PI --> Occ
    PI --> SM
    PI --> EB
    EB --> Analytics
    EB --> WS
    EB --> DB
    API --> DB
    API --> Analytics
    API --> PI
    WS --> Next
    API --> Next
    Next --> Twin
    Next --> Dash
    Next --> LiveANPR
```

---

## 📁 Documentation Directory Structure

This documentation suite is organized into 8 focused folders:

| Section | Directory | Focus & Contents |
| :--- | :--- | :--- |
| **01** | [`01_ai_pipeline/`](./01_ai_pipeline/README.md) | Pipeline orchestrator, multi-threading, frame capture loop, CPU vs GPU benchmarks |
| **02** | [`02_vehicle_recognition/`](./02_vehicle_recognition/README.md) | YOLOv8m detection, ByteTracker ReID, DBNet plate detector, PaddleOCR, EasyOCR, MobileNetV3, EfficientNet-B0, Color heuristics, Indian HSRP formatting |
| **03** | [`03_parking_intelligence/`](./03_parking_intelligence/README.md) | Geometric slot detection (P01–P10), IoU mapping, real-time occupancy state machine, parking session lifecycles, violation engine |
| **04** | [`04_analytics/`](./04_analytics/README.md) | Occupancy rates, traffic histograms, peak hours, slot turnover & utilization, session duration distribution, trend analytics APIs |
| **05** | [`05_backend_api/`](./05_backend_api/README.md) | FastAPI routing, ANPR video ingestion, vehicle CRUD, parking endpoints, multi-camera journey tracking, authentication, SQLite/SQLAlchemy schema, configuration |
| **06** | [`06_integration_layer/`](./06_integration_layer/README.md) | Event bus pub/sub (Memory & Redis), WebSocket real-time push, model-to-DTO adapters, integration gateway |
| **07** | [`07_frontend/`](./07_frontend/README.md) | Next.js 15.5 App Router (all 10 routes), Zustand global state, Three.js 3D Digital Twin, TypeScript API service layer, UI components |
| **08** | [`08_devops/`](./08_devops/README.md) | Docker Compose multi-container setup, GPU passthrough guide, automated storage pruning, production deployment, Caddy/Nginx reverse proxy |

---

## ⚙️ Core Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Deep Learning & Computer Vision** | PyTorch 2.4, Ultralytics YOLOv8m, PaddlePaddle 2.6 / PaddleOCR 2.8, EasyOCR 1.7, OpenCV 4.10, Albumentations |
| **Tracking & Spatial Geometry** | ByteTrack (IoU Association + Kalman Filter), Shapely, NumPy, SciPy |
| **Backend & Asynchronous Services** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, SQLite (WAL mode), Loguru |
| **Event Bus & Streaming** | Redis 7 / In-Memory asyncio EventBus, WebSockets |
| **Frontend & UI** | Next.js 15.5 (App Router), React 19, TypeScript 5, Tailwind CSS, Lucide Icons, Three.js / R3F, Axios, Zustand |
| **DevOps & Containers** | Docker, Docker Compose, Caddy / Nginx, Multi-stage Linux Builds |


---

<!-- Section: 01_ai_pipeline/README.md -->


# Section 01: AI Pipeline & Engine Architecture

The **AI Pipeline** layer (`engine/`) is the central orchestrator of ParkTwin AI. It ingests video frames from camera capture threads or HTTP upload handlers, executes computer vision models in sequence, and outputs structured, track-confirmed `VehicleRecord` objects.

---

## Architecture & Data Flow

```mermaid
sequenceDiagram
    participant Source as Video Source / CCTV
    participant FP as FrameProcessor
    participant Pipe as ParkTwinPipeline
    participant Det as VehicleDetector (YOLOv8m)
    participant Trk as ByteTracker & TrackManager
    participant Sub as Classifier Sub-Pipeline
    participant OCR_Pipe as Plate Detector & OCR
    participant Rec as VehicleRecord Output

    Source->>FP: Raw Video Stream (RTSP / MP4)
    FP->>Pipe: Sampled Frame (cv2.Mat)
    Pipe->>Det: detect(frame)
    Det-->>Pipe: Raw Detections [bbox, conf, class_id]
    Pipe->>Trk: update(detections)
    Trk-->>Pipe: Tracked Vehicles (track_id, state)
    
    loop For each tracked vehicle
        Pipe->>Sub: Crop Vehicle Body -> Type, Brand, Color Classifiers
        Sub-->>Pipe: Attribute Predictions (confidences)
        Pipe->>OCR_Pipe: Crop Bumper/Plate ROI -> PaddleOCR + EasyOCR
        OCR_Pipe-->>Pipe: Plate Text (e.g., KA05HM6963, 92.5%)
        Pipe->>Trk: Accumulate Voting History (temporal fusion)
    end

    Pipe->>Rec: Emit structured List[VehicleRecord]
```

---

## Key Data Structures

### `VehicleRecord` Data Class (`engine/pipeline.py`)

The primary output generated for every detected vehicle per frame:

| Field | Type | Description |
| :--- | :--- | :--- |
| `record_id` | `str` (UUIDv4) | Unique identifier for this detection event |
| `tracking_id` | `Optional[int]` | Persistent tracking ID assigned by ByteTrack across video frames |
| `camera_id` | `str` | Camera identifier (e.g., `camera_01`, `CAM_UPLOAD`, `station_entry`) |
| `frame_id` | `int` | Sequential frame index from the video stream |
| `bbox` | `List[float]` | Normalized bounding box coordinates `[x1, y1, x2, y2]` in range [0.0, 1.0] |
| `detection_confidence` | `float` | YOLO detection confidence score (0.0 to 1.0) |
| `vehicle_class_raw` | `str` | Raw YOLO class name (`car`, `truck`, `bus`, `motorcycle`) |
| `vehicle_type` | `str` | Refined vehicle type (`Sedan`, `SUV`, `Hatchback`, `Van`, `Coupe`, `Motorcycle`) |
| `type_confidence` | `float` | Vehicle type classification confidence score |
| `brand` | `str` | Vehicle manufacturer (`Toyota`, `Hyundai`, `Kia`, `Maruti Suzuki`, `Volkswagen`, etc.) |
| `brand_confidence` | `float` | Brand classification confidence score |
| `color` | `str` | Predominant vehicle body color (`Black`, `White`, `Silver`, `Red`, `Blue`, `Grey`, etc.) |
| `color_confidence` | `float` | Color recognition confidence score |
| `license_plate` | `str` | Formatted Indian license plate or standard text (`KA05HM6963`) |
| `plate_raw` | `str` | Unprocessed OCR text before heuristic formatting |
| `plate_confidence` | `float` | Aggregated OCR recognition confidence score |
| `plate_format` | `str` | Plate classification (`indian_standard`, `standard`, `unknown`) |
| `plate_bbox` | `List[float]` | Normalized bounding box of the license plate relative to vehicle crop |
| `timestamp` | `datetime` | UTC timestamp of the observation |
| `snapshot_path` | `Optional[str]` | File path of the saved cropped snapshot of the vehicle |
| `plate_snapshot_path`| `Optional[str]` | File path of the saved cropped snapshot of the license plate |

---

## Configuration Parameters (`configs/settings.yaml`)

| Setting | Default | Tuned CPU Value | Description |
| :--- | :--- | :--- | :--- |
| `detection.confidence_threshold` | `0.50` | `0.50` | Minimum YOLO confidence to consider a vehicle detection |
| `detection.iou_threshold` | `0.45` | `0.45` | NMS IoU threshold for overlapping vehicle candidate boxes |
| `tracking.track_buffer` | `60` | `300` | Frames to keep lost tracks alive (extended to prevent track splitting during frame skips) |
| `ocr.confidence_threshold` | `0.45` | `0.45` | Minimum OCR character confidence to accept a plate reading |
| `ocr.engine` | `paddleocr` | `paddleocr` | Primary OCR engine (`paddleocr` with `easyocr` fallback) |

---

## Detailed Documentation in This Section

- [`pipeline.md`](./pipeline.md) — Comprehensive breakdown of `ParkTwinPipeline` lifecycle, primary/secondary detection passes, temporal voting, and CPU vs GPU profiling.
- [`frame_processor.md`](./frame_processor.md) — Multi-threaded OpenCV capture loops, frame buffer queues, frame skip algorithms, and error recovery.


---

<!-- Section: 01_ai_pipeline/pipeline.md -->


# AI Pipeline Engine (`engine/pipeline.py`)

The `ParkTwinPipeline` class is the master coordinator for all deep learning models, spatial tracking, and attribute recognition routines in ParkTwin AI.

---

## Class Architecture & Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Uninitialized: Instantiate ParkTwinPipeline()
    Uninitialized --> Initializing: pipeline.initialize()
    state Initializing {
        [*] --> LoadYOLO: VehicleDetector.load()
        LoadYOLO --> LoadTrack: ByteTracker & TrackManager
        LoadTrack --> LoadPlate: PlateDetector.load()
        LoadPlate --> LoadOCR: OCREngine.load()
        LoadOCR --> LoadClassifiers: Type, Brand & Color Classifiers
        LoadClassifiers --> [*]
    }
    Initializing --> Ready: Success (pipeline_ready=True)
    Ready --> Processing: process_frame(frame, camera_id)
    Processing --> Ready: Return List[VehicleRecord]
    Ready --> Terminated: Shutdown
```

---

## Method Breakdown

### 1. `initialize()`
Initializes and warms up all sub-components in deterministic order:

```python
def initialize(self) -> None:
    """Loads weights into memory and prepares CUDA/CPU execution providers."""
    start_t = time.perf_counter()
    logger.info("🚀 Initializing ParkTwin AI Pipeline...")

    self.vehicle_detector.load()      # YOLOv8m (PyTorch weights: models/yolov8m.pt)
    self.track_manager.reset()        # Clear any stale tracks
    self.plate_detector.load()        # PaddleOCR DBNet text region fallback
    self.ocr_engine.load()            # PaddleOCR (mkldnn=False) + EasyOCR
    self.type_classifier.load()       # MobileNetV3-Small deep learning backbone
    self.brand_classifier.load()      # EfficientNet-B0 feature backbone
    self.color_recognizer.load()      # HSV median color space matcher

    self.is_ready = True
    elapsed = (time.perf_counter() - start_t) * 1000
    logger.info(f"✅ Pipeline ready in {elapsed:.0f}ms")
```

### 2. `process_frame(frame, camera_id, frame_id, timestamp)`
Executes the inference loop over a single image or video frame:

1. **Detection Pass**: Calls `VehicleDetector.detect(frame)` returning `List[DetectionResult]`.
2. **Multi-Object Association**: Updates `ByteTracker` and `TrackManager` with candidate bounding boxes.
3. **Vehicle ROI Extraction**: Crops each confirmed vehicle image from the full frame.
4. **Attribute Recognition**: Runs type, brand, and color classifiers concurrently on the vehicle crop.
5. **Primary Plate Pass**: Calls `PlateDetector.detect(vehicle_crop)` to locate rectangular plate regions.
6. **Secondary Bumper ROI Pass**: If primary detection fails, crops the lower 35% bumper region and executes multi-scale OCR with format validation.
7. **Temporal Voting**: Feeds recognized plates, brands, and colors to `TrackManager` to establish temporal consensus across multiple video frames.
8. **Record Serialization**: Formats all results into `VehicleRecord` objects.

```python
# Primary vs Secondary Plate Detection Pass Excerpt from engine/pipeline.py
plate_detections = self.plate_detector.detect(vehicle_crop)

if plate_detections:
    # Primary Pass: Dedicated plate bounding box found
    best_plate_det = max(plate_detections, key=lambda p: p.confidence)
    plate_crop = self.plate_detector.crop_plate(vehicle_crop, best_plate_det.bbox)
    ocr_result = self.ocr_engine.read(plate_crop)
else:
    # Secondary Pass: Lower 35% vehicle bumper fallback
    h, w = vehicle_crop.shape[:2]
    bumper_roi = vehicle_crop[int(h * 0.65):h, int(w * 0.15):int(w * 0.85)]
    ocr_result_roi = self.ocr_engine.read(bumper_roi)
    if ocr_result_roi.raw_text and ocr_result_roi.confidence >= min_ocr_conf:
        ocr_result = ocr_result_roi
```

---

## Two-Pass Detection & Temporal Voting

```mermaid
graph TD
    V[Vehicle Crop] --> P1{Plate Detector Box Found?}
    P1 -->|Yes| C1[Crop Exact Plate ROI] --> OCR1[OCREngine Inference]
    P1 -->|No| Bumper[Crop Lower 35% Bumper Area] --> MultiScale[Multi-Scale Enhance + DBNet]
    MultiScale --> OCR2[OCREngine Inference]
    OCR1 & OCR2 --> Filter{Valid Indian Plate / Confidence > 0.45?}
    Filter -->|Yes| Vote[TrackManager Temporal Voting Buffer]
    Filter -->|No| Reject[Mark UNREADABLE for this frame]
    Vote --> Consensus[Temporal Majority + Max Conf Consensus]
```

### Temporal Voting Rules
- **Plate Number**: Weighted average by confidence score. Matches complying with Indian Standard format (`KA05HM6963`) receive a **1.10x weight multiplier**.
- **Vehicle Brand**: Mode of top 10 historical classifications.
- **Vehicle Type**: Softmax logit accumulation across all active frames for the track ID.
- **Color**: Rolling median in HSV color space to eliminate transient lighting glares.

---

## CPU vs GPU Performance Profiles

| Component | GPU (NVIDIA RTX 4090 / T4) | CPU (Intel Core i7 / AMD Ryzen) | Optimization Applied |
| :--- | :---: | :---: | :--- |
| **YOLOv8m Detection** | 8 – 12 ms | 140 – 180 ms | FP16 Half Precision on CUDA |
| **ByteTrack Association** | < 1 ms | 2 – 5 ms | Vectorized NumPy IoU |
| **MobileNetV3 Classification**| 3 – 5 ms | 20 – 35 ms | TorchScript JIT Optimization |
| **EfficientNet-B0 Brand** | 4 – 6 ms | 30 – 45 ms | TorchScript JIT Optimization |
| **Color Recognizer** | < 1 ms | 2 – 4 ms | NumPy HSV Vectorized Histogram |
| **PaddleOCR Plate Text** | 12 – 20 ms | 600 – 950 ms | `enable_mkldnn=False`, 32-stride align |
| **Total per Frame (Full Load)**| **~45 ms (22 FPS)** | **~2,500 – 5,000 ms (0.2–0.4 FPS)**| Adaptive Frame Skip (1-in-15 / 1-in-30) |


---

<!-- Section: 01_ai_pipeline/frame_processor.md -->


# Frame Processor & Stream Manager (`engine/frame_processor.py`)

The `FrameProcessor` manages video stream ingestion from RTSP IP cameras, USB webcams, and MP4 video test files.

---

## Threading Architecture

Each camera operates on a dedicated daemon thread to prevent network latency or video decoding stalls on one camera from blocking inference on other channels.

```mermaid
graph TD
    subgraph Stream_Threads [Thread Pool: Camera Capture]
        RTSP1["Camera 01 (RTSP / MP4)"] -->|cv2.VideoCapture| T1[Worker Thread 1]
        RTSP2["Camera 02 (Entry Station)"] -->|cv2.VideoCapture| T2[Worker Thread 2]
        RTSP3["Camera 03 (Exit Station)"] -->|cv2.VideoCapture| T3[Worker Thread 3]
    end

    subgraph Buffers [Thread-Safe Queues]
        T1 -->|put_nowait| Q1["Queue maxsize=30"]
        T2 -->|put_nowait| Q2["Queue maxsize=30"]
        T3 -->|put_nowait| Q3["Queue maxsize=30"]
    end

    subgraph Orchestration [Inference Loop]
        Q1 & Q2 & Q3 -->|get_latest| Pipeline["ParkTwinPipeline.process_frame()"]
    end
```

---

## Key Capabilities

### 1. Auto-Reconnect Backoff
If an RTSP stream disconnects due to network flapping, `FrameProcessor` executes an exponential backoff reconnect loop (initial delay 1.0s, doubling up to 30.0s max).

### 2. Adaptive Frame Dropping (Queue Saturation Protection)
When the AI inference loop takes longer than frame inter-arrival time (common in CPU-only setups):
- Frame queue is bounded to `maxsize=30`.
- When full, `put_nowait()` discards oldest intermediate frames, keeping only the freshest frame to prevent latency buildup.

### 3. Graceful Teardown
Thread cancellation tokens and `stop()` events release underlying OpenCV `VideoCapture` handles and POSIX file descriptors cleanly.


---

<!-- Section: 02_vehicle_recognition/README.md -->


# Section 02: Vehicle Recognition Subsystem

The **Vehicle Recognition Subsystem** (`modules/vehicle_recognition/`) houses the specialized computer vision models and heuristic post-processors responsible for detecting vehicles, reading license plates, and extracting vehicle metadata.

---

## Subsystem Topology

```mermaid
graph TD
    Frame[Input Video Frame] --> VD[vehicle_detector.py<br>YOLOv8m / YOLOv11]
    VD --> BT[tracker.py<br>ByteTrack Multi-Object Tracker]
    BT --> TM[track_manager.py<br>Temporal Voting & State Machine]
    
    TM --> VCrop[Cropped Vehicle ROI]
    
    VCrop --> TC[type_classifier.py<br>MobileNetV3-Small]
    VCrop --> BC[brand_classifier.py<br>EfficientNet-B0]
    VCrop --> CR[color_recognizer.py<br>HSV Median Color Space]
    
    VCrop --> PD[plate_detector.py<br>PaddleOCR DBNet FPN Multi-Scale]
    PD --> Enh[enhancer.py<br>Lanczos4 + Niblack + CLAHE]
    Enh --> OCR[ocr_engine.py<br>PaddleOCR + EasyOCR Fallback]
    OCR --> PF[plate_formatter.py<br>Indian HSRP Standard Fusion]
    
    TC & BC & CR & PF --> Fusion[Fused Vehicle Profile]
```

---

## Sub-Module Directory Reference

| Document | Sub-Module | Model / Technology | Description |
| :--- | :--- | :--- | :--- |
| [`vehicle_detection.md`](./vehicle_detection.md) | `detection/` | YOLOv8m (Ultralytics) | Object detection for cars, trucks, buses, motorcycles with auto-weight caching |
| [`tracking.md`](./tracking.md) | `tracking/` | ByteTrack + Kalman | Persistent ID assignment, occlusion handling, and temporal consensus voting |
| [`plate_detection.md`](./plate_detection.md) | `plate_detection/`| DBNet FPN (PaddleOCR) | Multi-scale text-region candidate localization with 32-pixel stride alignment |
| [`ocr_engine.md`](./ocr_engine.md) | `ocr/` | PaddleOCR + EasyOCR | License plate text extraction with Lanczos-4 upscaling & Niblack binarization |
| [`classification.md`](./classification.md) | `classification/` | MobileNetV3 + EfficientNet | Deep vehicle type, brand, and HSV median color recognition |
| [`plate_formatter.md`](./plate_formatter.md) | `fusion/` | Regex + HSRP Strip | Indian Standard plate format validation and confidence scoring |


---

<!-- Section: 02_vehicle_recognition/vehicle_detection.md -->


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


---

<!-- Section: 02_vehicle_recognition/tracking.md -->


# Vehicle Tracking & State Machine (`modules/vehicle_recognition/tracking/`)

ParkTwin AI uses a pure-Python vectorized implementation of **ByteTrack** (`tracker.py`) coupled with a temporal state machine (`track_manager.py`) to maintain stable identities across occlusions and camera frame skips.

---

## ByteTrack Association Algorithm

ByteTrack solves tracking failure during occlusions by splitting detections into two confidence tiers:

```mermaid
graph TD
    Dets[Frame Detections] --> Split{Confidence >= track_high_thresh (0.50)?}
    Split -->|High Conf| D_High[High Score Detections]
    Split -->|Low Conf| D_Low[Low Score Detections]
    
    Tracks[Active Tracks] --> Stage1[Stage 1: Match D_High with Active Tracks via IoU]
    D_High --> Stage1
    
    Stage1 -->|Matched| Update1[Update Kalman State & History]
    Stage1 -->|Unmatched Tracks| Stage2[Stage 2: Match Unmatched Tracks with D_Low]
    D_Low --> Stage2
    
    Stage2 -->|Matched| Update2[Recover Track through Occlusion]
    Stage2 -->|Still Unmatched| Lost[Mark Track as 'lost' for track_buffer Frames]
    
    Stage1 -->|Unmatched D_High| NewTrack{Conf >= new_track_thresh (0.60)?}
    NewTrack -->|Yes| Spawn[Spawn New Confirmed Track]
```

---

## Track Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> New: Detection observed (hits=1)
    New --> Confirmed: hits >= 3 consecutive frames
    New --> Removed: Missed before reaching 3 hits
    Confirmed --> Active: Successfully matched in frame
    Active --> Active: Continuous detection
    Active --> Lost: time_since_update > 1 frame
    Lost --> Active: Re-associated within track_buffer
    Lost --> Removed: time_since_update > track_buffer (300 frames)
    Removed --> [*]
```

---

## Track Buffer Math for Frame Skipping

When running on CPU with frame skipping (e.g., `frame_skip = 15` on a 60 FPS video):
- Each sampled frame corresponds to **0.25 seconds** of real time.
- Standard ByteTrack `track_buffer = 60` would drop tracks after only $60 \times 0.25 = 15$ seconds of occlusion or camera panning.
- ParkTwin AI sets `track_buffer: 300`, keeping vehicle tracks alive for **75 seconds of real-world occlusion**, eliminating duplicate track ID creation.


---

<!-- Section: 02_vehicle_recognition/plate_detection.md -->


# License Plate Detection (`modules/vehicle_recognition/plate_detection/`)

The `PlateDetector` locates license plate regions inside vehicle crops using multi-scale text-region detection.

---

## DBNet FPN Architecture & 32-Pixel Stride Alignment

PaddleOCR's DBNet text detector uses Feature Pyramid Networks (FPN) with downsampling stages. The convolutions require tensor spatial dimensions to be exact multiples of 32.

> **Crucial Optimization Note**:
> If an arbitrary crop size (e.g. $147 \times 49$) is passed to DBNet, oneDNN / MKL-DNN raises a shape broadcast mismatch (`Operands could not be broadcast together with shape X = [1, 96, 80, 160] and Y = [1, 96, 48, 160]`).
> ParkTwin enforces **32-pixel stride alignment** before detection:
> ```python
> target_w = ((target_w + 31) // 32) * 32
> target_h = ((target_h + 31) // 32) * 32
> scaled_img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
> scaled_img = np.ascontiguousarray(scaled_img)
> ```

---

## Multi-Scale Detection Pyramid

To reliably detect both small, distant plates and close-up bumper plates, candidate crops are processed across 3 scale factors:

| Scale Factor | Target Resolution | Target Distance |
| :---: | :---: | :--- |
| **0.75x** | $480 \times 96$ | Close-up vehicle directly in front of camera |
| **1.00x** | $640 \times 128$ | Standard entry/exit lane distance (3–6 meters) |
| **1.25x** | $800 \times 160$ | Distant parking bay vehicle (6–12 meters) |

Overlapping plate candidate boxes across scales are merged using **IoU Non-Maximum Suppression (threshold 0.45)**.


---

<!-- Section: 02_vehicle_recognition/ocr_engine.md -->


# OCR Engine & Image Enhancement (`modules/vehicle_recognition/ocr/`)

The OCR subsystem extracts alphanumeric license plate text using a dual-engine architecture (**PaddleOCR** primary with **EasyOCR** fallback) and specialized image pre-processing.

---

## Image Pre-Processing Pipeline (`enhancer.py`)

```mermaid
graph TD
    Raw[Raw Plate Crop] --> Resize[Lanczos-4 Resize to 640x128]
    Resize --> EV{detect_plate_type: Green/Black Plate?}
    EV -->|Yes| Invert[Invert Plate Color Space]
    EV -->|No| Gray[Grayscale Conversion]
    Invert --> Gray
    Gray --> CLAHE[Adaptive CLAHE Contrast Enhancement]
    CLAHE --> Binarize[Niblack Local Adaptive Binarization]
    Binarize --> Denoise[Morphological Opening & Gaussian Blur]
    Denoise --> OCR[Pass to OCREngine]
```

---

## Multi-Crop OCR Perturbation

To guarantee high OCR accuracy on vibrating cameras or angled plates, `OCREngine` generates 4 variants per plate:
1. **Tight Bounding Box**: Exact detected text boundary.
2. **5% Padding Expansion**: Adds context around edge characters (`K`, `A`, `0`, `9`).
3. **10% Padding Expansion**: Captures full border of Indian HSRP plates.
4. **$\pm 5^\circ$ Rotation Correction**: Rectifies angled camera views.

The engine scores all predictions and selects the highest confidence text string matching the Indian Standard grammar.


---

<!-- Section: 02_vehicle_recognition/classification.md -->


# Vehicle Attribute Classification (`modules/vehicle_recognition/classification/`)

Extracts vehicle type, brand manufacturer, and dominant body color.

---

## 1. Vehicle Type Classifier (`type_classifier.py`)
- **Deep Model**: MobileNetV3-Small fine-tuned on vehicle topologies.
- **Classes**: `Sedan`, `SUV`, `Hatchback`, `Van`, `Coupe`, `Motorcycle`, `Bus`, `Truck`.
- **YOLO Fallback**: If deep model confidence $< 0.40$, falls back to YOLO bounding box aspect ratio and geometry.

---

## 2. Brand Classifier (`brand_classifier.py`)
- **Deep Model**: EfficientNet-B0 backbone extracting 1280-dimensional feature embeddings.
- **Recognized Brands**: `Toyota`, `Hyundai`, `Honda`, `Maruti Suzuki`, `Tata`, `Mahindra`, `Kia`, `Volkswagen`, `BMW`, `Mercedes-Benz`, `Audi`, `Ford`, `Jeep`.

---

## 3. Color Recognizer (`color_recognizer.py`)
- **Method**: Central body crop (avoids windshield glass and black tires) transformed into **HSV color space**.
- **Histogram Quantization**: Computes median Hue, Saturation, and Value across 12 distinct centroid clusters:
  - `Black`, `White`, `Silver`, `Grey`, `Red`, `Blue`, `Green`, `Yellow`, `Orange`, `Brown`, `Gold`, `Purple`.


---

<!-- Section: 02_vehicle_recognition/plate_formatter.md -->


# License Plate Formatting & Indian Standards (`modules/vehicle_recognition/fusion/plate_formatter.py`)

`PlateFormatter` standardizes raw OCR strings into compliant Indian High Security Registration Plate (HSRP) formats.

---

## Indian License Plate Format Specifications

Standard Indian vehicle plates follow the statutory format:
$$\underbrace{\text{KA}}_{\text{State (2 letters)}} \quad \underbrace{\text{05}}_{\text{RTO District (2 digits)}} \quad \underbrace{\text{HM}}_{\text{Series (1-3 letters)}} \quad \underbrace{\text{6963}}_{\text{Registration Number (4 digits)}}$$

**Regex Pattern**:
```regex
^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$
```

---

## Post-Processing Rules

1. **HSRP Security Strip Removal**: Discards leading `IND` watermark text detected by OCR.
2. **Character Substitution Matrix**:
   - `O` / `D` $\leftrightarrow$ `0` in number segments.
   - `I` / `L` $\leftrightarrow$ `1` in number segments.
   - `Z` $\leftrightarrow$ `2` in number segments.
   - `S` $\leftrightarrow$ `5` in number segments.
   - `B` $\leftrightarrow$ `8` in number segments.
3. **1.10x Confidence Multiplier**: Plate candidates that fully satisfy the Indian Standard regex receive an automatic 10% boost in temporal voting consensus.


---

<!-- Section: 03_parking_intelligence/README.md -->


# Section 03: Parking Intelligence Module

The **Parking Intelligence Module** (`modules/parking_intelligence/`) manages physical parking bays, slot geometry, real-time vehicle-to-slot spatial assignment, session life cycles, and parking violation detection.

---

## Subsystem Architecture

```mermaid
graph TD
    VR[VehicleRecord from AI Pipeline] --> SD[slot_detector.py<br>Geometric Polygon IoU Matching]
    SC[slot_config.py<br>Static / Calibrated Slot Polygons P01-P10] --> SD
    
    SD --> OM[occupancy_manager.py<br>Real-Time Slot State Machine]
    OM --> SM[session_manager.py<br>Vehicle Session Lifecycle]
    
    OM --> EE[event_engine.py<br>Violation & Status Event Publisher]
    SM --> DT[duration_tracker.py<br>Live Elapsed Time Clock]
    
    SM --> DB[(SQLite / PostgreSQL<br>parking_sessions Table)]
    EE --> EB[EventBus & WebSocket Broadcast]
```

---

## Parking Slot Geometry (Default 10-Slot Layout)

The standard parking lot map provides 10 calibrated geometric bounding polygons:

```
[ P01 ] [ P02 ] [ P03 ] [ P04 ] [ P05 ]   <-- North Bay (Lane A)
================= Driving Aisle =================
[ P06 ] [ P07 ] [ P08 ] [ P09 ] [ P10 ]   <-- South Bay (Lane B)
```

---

## Sub-Module Directory Reference

| Document | Sub-Module | Focus & Capabilities |
| :--- | :--- | :--- |
| [`slot_detection.md`](./slot_detection.md) | `slot_detection/` | Polygon coordinates, bottom-center projection, IoU calculation, and spatial thresholding |
| [`occupancy.md`](./occupancy.md) | `occupancy/` | Slot state transition rules (`free` $\leftrightarrow$ `occupied` $\leftrightarrow$ `reserved`), per-camera aggregation |
| [`sessions.md`](./sessions.md) | `sessions/` | Entry-to-exit state machine, plate-to-slot binding, session duration metrics, SQL schema |
| [`events.md`](./events.md) | `events/` | Domain event dispatching (`slot_occupied`, `slot_freed`), overstay & unauthorized parking violations |


---

<!-- Section: 03_parking_intelligence/slot_detection.md -->


# Slot Detection & Spatial Geometry (`modules/parking_intelligence/slot_detection/`)

The `SlotDetector` evaluates spatial overlap between detected vehicle bounding boxes and pre-calibrated parking slot polygons.

---

## Spatial Matching Logic

1. **Vehicle Footprint Projection**: Rather than using the entire vehicle bounding box (which includes windshield and roof perspectives), the detector calculates the **bottom-center contact patch**:
   $$P_{\text{contact}} = \left( \frac{x_1 + x_2}{2}, \; y_2 \right)$$
2. **Polygon Overlap & IoU**: Evaluates geometric intersection using `Shapely`:
   $$\text{IoU}(\text{Box}, \text{Slot}) = \frac{\text{Area}(\text{Box} \cap \text{Slot})}{\text{Area}(\text{Box} \cup \text{Slot})}$$
3. **Thresholding**:
   - $\text{IoU} \ge 0.35$ or $P_{\text{contact}} \in \text{Polygon}(\text{Slot}) \implies$ **Occupied by Track ID**.
   - $\text{IoU} < 0.10 \implies$ **Free / Unoccupied**.

---

## Slot Status Enumeration

| State | Color Code | Description |
| :--- | :---: | :--- |
| `FREE` | 🟢 Green | Available for parking; no vehicle detected |
| `OCCUPIED` | 🔴 Red | Vehicle currently stationed in bay |
| `RESERVED` | 🟡 Yellow | Dedicated for VIP / EV charging / Handled via API |
| `UNKNOWN` | ⚪ Grey | Camera feed obstructed or degraded |


---

<!-- Section: 03_parking_intelligence/occupancy.md -->


# Real-Time Occupancy Management (`modules/parking_intelligence/occupancy/`)

The `OccupancyManager` maintains an in-memory real-time registry of all slot states across all registered cameras.

---

## State Transition Rules

```mermaid
stateDiagram-v2
    [*] --> Free: System Startup
    Free --> Occupied: Vehicle IoU >= 0.35 for >= 3 frames
    Occupied --> Occupied: Vehicle stationary
    Occupied --> Free: Vehicle leaves bay (IoU < 0.10 for >= 5 frames)
    Free --> Reserved: API Reservation Call
    Reserved --> Occupied: Authorized vehicle arrives
    Reserved --> Free: Reservation cancelled / expired
```

---

## Aggregate Occupancy REST Response (`/integration/occupancy`)

```json
{
  "total_slots": 10,
  "free": 9,
  "occupied": 1,
  "reserved": 0,
  "unknown": 0,
  "occupancy_rate": 0.10,
  "per_camera": {
    "camera_01": {
      "total": 10,
      "free": 9,
      "occupied": 1,
      "reserved": 0,
      "unknown": 0
    }
  }
}
```


---

<!-- Section: 03_parking_intelligence/sessions.md -->


# Parking Session Lifecycle (`modules/parking_intelligence/sessions/`)

The `SessionManager` tracks the lifecycle of every vehicle visit from the moment it enters the lot until it clears the exit station.

---

## Session State Machine

```mermaid
stateDiagram-v2
    [*] --> Entering: Observed at Entry CCTV Lane
    Entering --> Parked: Assigned to Slot (e.g. P03)
    Parked --> Exiting: Left slot, observed at Exit CCTV Lane
    Exiting --> Closed: Exit confirmed & duration recorded
    Closed --> [*]
```

---

## Database Table Schema (`parking_sessions`)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `session_id` | `VARCHAR(36)` | `PRIMARY KEY` | UUIDv4 session identifier |
| `license_plate` | `VARCHAR(20)` | `INDEXED` | Formatted plate (e.g. `KA05HM6963`) |
| `slot_id` | `VARCHAR(10)` | `INDEXED` | Calibrated slot ID (e.g. `P01`–`P10`) |
| `tracking_id` | `INTEGER` | `NULLABLE` | Active tracker ID |
| `entry_time` | `TIMESTAMP` | `NOT NULL` | UTC arrival timestamp |
| `parked_time` | `TIMESTAMP` | `NULLABLE` | Timestamp when slot occupancy confirmed |
| `exit_time` | `TIMESTAMP` | `NULLABLE` | UTC departure timestamp |
| `duration_seconds` | `FLOAT` | `DEFAULT 0.0`| Total elapsed stay duration |
| `status` | `VARCHAR(20)` | `INDEXED` | `entering` \| `parked` \| `exited` \| `closed` |


---

<!-- Section: 03_parking_intelligence/events.md -->


# Parking Events & Violations (`modules/parking_intelligence/events/`)

The `EventEngine` monitors the parking domain for critical business events and automated violation triggers.

---

## Domain Event Types

```mermaid
graph TD
    EV[EventEngine Ingests State Changes] --> E1[vehicle_entered]
    EV --> E2[vehicle_parked]
    EV --> E3[vehicle_exited]
    EV --> E4[slot_occupied]
    EV --> E5[slot_freed]
    EV --> V[Violation Detection Rules]
    
    V --> V1[overstay_violation<br>Stay > max_parking_hours]
    V --> V2[unauthorized_parking<br>Unregistered plate in reserved slot]
    V --> V3[wrong_bay_parking<br>Vehicle spans across 2 slot boundaries]
```

---

## Violation Detection Parameters

Configured via `configs/settings.yaml`:
- `violations.max_stay_hours`: `24` (triggers alert when exceeded).
- `violations.cross_bay_iou_threshold`: `0.25` on two adjacent slots simultaneously.


---

<!-- Section: 04_analytics/README.md -->


# Section 04: Smart Parking Analytics Engine

The **Analytics Module** (`modules/analytics/`) aggregates parking sessions, vehicle observations, and occupancy timelines into actionable operational metrics, historical trends, and executive dashboards.

---

## Subsystem Architecture

```mermaid
graph TD
    Sessions[parking_sessions DB Table] --> Agg[AnalyticsService]
    Events[EventBus Stream] --> Agg
    
    Agg --> OA[occupancy_analytics.py<br>Occupancy Rates & Timelines]
    Agg --> TA[traffic_analytics.py<br>Vehicle Volume & Peak Hours]
    Agg --> UA[utilization_analytics.py<br>Turnover & Duration Distributions]
    Agg --> TrA[trends_analytics.py<br>Historical Percentiles & Forecasting]
    
    OA & TA & UA & TrA --> Router[api/router.py<br>GET /analytics/dashboard]
    Router --> Web[Next.js Analytics Dashboard UI]
```

---

## Analytics Sub-Modules Reference

| Document | Component | Metrics Generated |
| :--- | :--- | :--- |
| [`occupancy_analytics.md`](./occupancy_analytics.md) | `OccupancyAnalytics` | Real-time rate, average occupancy %, per-camera distribution, timeline graphs |
| [`traffic_analytics.md`](./traffic_analytics.md) | `TrafficAnalytics` | 24-hour hourly traffic histogram, entry/exit counts, peak hour identification |
| [`utilization_analytics.md`](./utilization_analytics.md) | `UtilizationAnalytics`| Slot turnover rate, utilization %, average parking duration (`HH:MM:SS`), top/bottom slots |
| [`trends_analytics.md`](./trends_analytics.md) | `TrendsAnalytics` | Statistical duration percentiles ($p_{25}, p_{50}, p_{75}, p_{90}$), multi-day trendlines |
| [`api.md`](./api.md) | `AnalyticsRouter` | Full API schema for `/analytics/dashboard`, query filters, and sample curl requests |


---

<!-- Section: 04_analytics/occupancy_analytics.md -->


# Occupancy Analytics (`modules/analytics/occupancy/`)

Computes spatial capacity utilization over configurable historical windows ($1\text{h}$, $24\text{h}$, $7\text{d}$, $30\text{d}$).

---

## Key Formulas

### 1. Real-Time Occupancy Rate
$$\text{Occupancy Rate} = \frac{\sum \text{Occupied Slots}}{\text{Total Registered Slots}}$$

### 2. Time-Weighted Average Occupancy
$$\bar{O} = \frac{1}{T} \int_{0}^{T} O(t) \, dt \approx \frac{1}{N} \sum_{i=1}^{N} \text{Occupancy}_i$$


---

<!-- Section: 04_analytics/traffic_analytics.md -->


# Traffic Analytics (`modules/analytics/traffic/`)

Tracks the ingress and egress dynamics of vehicles across the parking facility.

---

## Metrics & Visualizations

1. **Hourly Influx/Outflux Histogram**: 24 bins representing hours `0` through `23`.
2. **Peak Hour Detection**:
   $$\text{Peak Hour} = \arg\max_{h \in [0, 23]} \left( \text{Entries}(h) + \text{Exits}(h) \right)$$
3. **Active Fleet In-Lot**: Net difference of $\sum \text{Entries} - \sum \text{Exits}$.


---

<!-- Section: 04_analytics/utilization_analytics.md -->


# Utilization & Duration Analytics (`modules/analytics/utilization/`)

Evaluates parking asset efficiency and turnover velocity.

---

## Key Performance Indicators (KPIs)

- **Turnover Rate**: $\frac{\text{Total Completed Sessions}}{\text{Total Slot Capacity}}$ per day.
- **Average Parking Duration**: Formatted as human-readable `HH:MM:SS`.
- **Top / Bottom Utilized Slots**: Identifies prime vs underused slots (e.g. `P01` vs `P10`) to inform tariff adjustments.


---

<!-- Section: 04_analytics/trends_analytics.md -->


# Trends & Statistical Percentiles (`modules/analytics/trends/`)

Computes non-parametric duration statistics across completed sessions to model long-tail stay distributions.

---

## Statistical Percentiles Table

| Metric | Meaning | Operational Use |
| :--- | :--- | :--- |
| **Mean (Average)** | Arithmetic average stay length | General revenue forecasting |
| **Median ($p_{50}$)** | 50% of vehicles stay less than this value | Baseline tariff window sizing |
| **$p_{25}$** | Short-stay threshold | Quick drop-off / delivery grace periods |
| **$p_{75}$** | Standard long-stay threshold | Daily commuter boundary |
| **$p_{90}$** | 90th percentile stay length | Extended overstay monitoring |


---

<!-- Section: 04_analytics/api.md -->


# Analytics REST API Reference (`/analytics/dashboard`)

---

## `GET /analytics/dashboard`

Retrieves a unified analytics payload containing occupancy, traffic, utilization, and trend data.

### Request Headers
- `Authorization: Bearer <token>` (e.g. `dev_admin_token`)

### Query Parameters
- `start_time` *(optional, ISO-8601)*: Window start (defaults to $T - 24\text{h}$).
- `end_time` *(optional, ISO-8601)*: Window end (defaults to $T$).
- `camera_id` *(optional, string)*: Filter by specific camera ID.

---

### Sample Response Excerpt

```json
{
  "occupancy": {
    "current_occupancy": 1,
    "occupancy_percentage": 10.0,
    "free_slots": 9,
    "total_slots": 10
  },
  "traffic": {
    "vehicle_entries": 15,
    "vehicle_exits": 13,
    "active_vehicles": 2,
    "peak_hour": 9
  },
  "utilization": {
    "slot_utilization_percentage": 10.0,
    "average_parking_duration": "00:45:12",
    "turnover_rate": 1.3
  }
}
```

### Curl Example
```bash
curl -X GET "http://localhost:8000/analytics/dashboard"      -H "Authorization: Bearer dev_admin_token"
```


---

<!-- Section: 05_backend_api/README.md -->


# Section 05: Backend API Architecture

The **Backend API** layer (`backend/`) is built on **FastAPI** and **SQLAlchemy 2.0**, exposing asynchronous REST and WebSocket interfaces for video ingestion, vehicle management, parking control, multi-station journeys, and configuration.

---

## Architecture & Router Topology

```mermaid
graph TD
    Client[Web Browser / Next.js / Mobile / API Client] --> App[backend/app/app.py<br>FastAPI App & Lifespan Hooks]
    
    App --> Auth[auth/deps.py<br>Bearer Token Auth]
    
    App --> R1[routers/anpr.py<br>POST /api/v1/anpr/upload]
    App --> R2[routers/vehicles.py<br>GET /api/v1/vehicles]
    App --> R3[routers/parking.py<br>GET /api/v1/parking/*]
    App --> R4[routers/journey.py<br>POST /api/v1/journey/upload]
    App --> R5[routers/cameras.py<br>GET /api/v1/cameras]
    App --> R6[routers/health.py<br>GET /health]
    App --> R7[gateway/router.py<br>/integration/slots, occupancy, sessions]
    App --> R8[websocket/router.py<br>/ws/realtime]
    
    R1 & R4 --> AS[services/anpr_service.py]
    R2 & R3 & R5 & R7 --> DB[(SQLite / PostgreSQL<br>SQLAlchemy 2.0 Engine)]
```

---

## Router Directory Reference

| Document | Endpoint Prefix | Purpose |
| :--- | :--- | :--- |
| [`anpr_api.md`](./anpr_api.md) | `/api/v1/anpr` | Multipart video upload, batch ANPR pipeline, annotated video, CSV/JSON downloads, auto-cleanup |
| [`vehicles_api.md`](./vehicles_api.md) | `/api/v1/vehicles` | Search, filter, and retrieve historical vehicle recognition records and snapshot crops |
| [`parking_api.md`](./parking_api.md) | `/api/v1/parking` | Parking slot status queries, reservation overrides, bay configuration |
| [`journey_api.md`](./journey_api.md) | `/api/v1/journey` | Multi-camera journey tracking across Entry Station, Parking Lot, and Exit Station |
| [`auth_and_security.md`](./auth_and_security.md) | N/A | Bearer token authentication, API keys, role-based authorization |
| [`database.md`](./database.md) | N/A | SQLAlchemy ORM models, SQLite WAL mode, schema tables, indexes, and connection pooling |
| [`configuration.md`](./configuration.md) | N/A | Full annotated reference of `settings.yaml` and environment variables |


---

<!-- Section: 05_backend_api/anpr_api.md -->


# ANPR Video Upload API (`backend/api/routers/anpr.py`)

The `/api/v1/anpr/upload` endpoint processes raw video files through the full AI recognition pipeline asynchronously.

---

## `POST /api/v1/anpr/upload`

### Request Specifications
- **Content-Type**: `multipart/form-data`
- **Headers**: `Authorization: Bearer dev_admin_token`
- **Body Form**:
  - `video`: File binary (`.mp4`, `.avi`, `.mov`, `.mkv`).

---

### Pipeline Execution Flow

```mermaid
sequenceDiagram
    participant User as Client / Browser
    participant API as POST /api/v1/anpr/upload
    participant Svc as anpr_service.py
    participant Pipe as ParkTwinPipeline
    participant Disk as /backend/outputs/

    User->>API: Multipart Video Upload (e.g. test_video.mp4)
    API->>Svc: process_video_upload(file)
    Svc->>Svc: Calculate adaptive frame_skip (1-in-15 on 60fps)
    
    loop Every Sampled Frame
        Svc->>Pipe: process_frame(frame)
        Pipe-->>Svc: List[VehicleRecord] (YOLO + ByteTrack + OCR)
        Svc->>Disk: Render annotated frame to output VideoWriter
    end

    Svc->>Disk: Save results_<run_id>.json & results_<run_id>.csv
    Svc->>Svc: cleanup_old_outputs(keep_latest=10)
    Svc-->>API: Summary Response JSON
    API-->>User: HTTP 200 { success: true, run_id: "...", detected_plates: [...] }
```

---

### Storage Management & Pruning (`cleanup_old_outputs`)

To prevent disk bloat on continuous usage, `anpr_service.py` executes automated pruning after every upload:
- Retains the **10 most recent runs**.
- Prunes all benchmark and temporary upload files older than **3 days**.
- Reclaims gigabytes of disk space automatically.


---

<!-- Section: 05_backend_api/vehicles_api.md -->


# Vehicles API (`backend/api/routers/vehicles.py`)

Provides CRUD and search access to observed vehicle records.

---

## Endpoints

- `GET /api/v1/vehicles` — Paginated list of detected vehicles (filter by plate, brand, color, type, camera, date).
- `GET /api/v1/vehicles/{record_id}` — Single vehicle record details.
- `GET /api/v1/vehicles/plate/{license_plate}` — Query all observations of a specific plate number across all cameras.
- `GET /api/v1/vehicles/{record_id}/snapshot` — Download cropped vehicle snapshot JPEG.
- `GET /api/v1/vehicles/{record_id}/plate-snapshot` — Download cropped license plate snapshot JPEG.


---

<!-- Section: 05_backend_api/parking_api.md -->


# Parking API (`backend/api/routers/parking.py`)

Provides control and monitoring for physical parking bays.

---

## Endpoints

- `GET /api/v1/parking/slots` — List all configured slots (`P01`–`P10`) with current states (`free`, `occupied`, `reserved`).
- `GET /api/v1/parking/occupancy` — Real-time lot capacity summary.
- `POST /api/v1/parking/slots/{slot_id}/reserve` — Manually mark a slot as reserved.
- `POST /api/v1/parking/slots/{slot_id}/release` — Release a reserved slot.
- `GET /api/v1/parking/sessions` — Query active and completed parking session logs.


---

<!-- Section: 05_backend_api/journey_api.md -->


# Multi-Camera Journey API (`backend/api/routers/journey.py`)

Coordinates end-to-end vehicle tracking across multiple discrete CCTV stations:
1. **Entry Station (`station_entry`)**: Captures arrival plate, assigns entry timestamp.
2. **Parking Lot (`station_parking`)**: Tracks bay occupancy and parking duration.
3. **Exit Station (`station_exit`)**: Captures departure plate, closes session, computes billing duration.

---

## Key Endpoints

- `POST /api/v1/journey/upload` — Upload video feeds from all 3 stations simultaneously.
- `GET /api/v1/journey/stats` — Summary of fleet status:
  ```json
  { "entering": 15, "parked": 13, "exited": 13, "total": 41 }
  ```


---

<!-- Section: 05_backend_api/auth_and_security.md -->


# Authentication & Security Architecture (`backend/auth/`)

ParkTwin AI uses a layered security model:

---

## 1. Development Mode Auth
In development (`ENVIRONMENT=development`), the backend accepts a static admin bearer token:
```
Authorization: Bearer dev_admin_token
```

---

## 2. Production Hardening Guide
For production deployment:
1. Enable `JWT_SECRET_KEY` and `JWT_ALGORITHM=HS256` in `.env.production`.
2. Implement OAuth2 Password Flow via `POST /api/v1/auth/token`.
3. Enforce Role-Based Access Control (RBAC):
   - `ROLE_ADMIN`: Configuration, camera management, system teardown.
   - `ROLE_OPERATOR`: Slot overrides, manual violation resolution, video upload.
   - `ROLE_VIEWER`: Read-only access to dashboard and analytics.


---

<!-- Section: 05_backend_api/database.md -->


# Database & SQLAlchemy Schema (`backend/database/`)

ParkTwin AI uses **SQLAlchemy 2.0** ORM supporting SQLite with Write-Ahead Logging (WAL) in development and PostgreSQL in production.

---

## Database Tables Entity Relationship Diagram

```mermaid
erDiagram
    VEHICLES ||--o{ PARKING_SESSIONS : "associated with"
    PARKING_SLOTS ||--o{ PARKING_SESSIONS : "hosts"
    CAMERA_STREAMS ||--o{ VEHICLES : "captures"
    
    VEHICLES {
        string record_id PK
        int tracking_id
        string camera_id FK
        string license_plate
        string vehicle_type
        string brand
        string color
        float confidence
        datetime timestamp
    }

    PARKING_SLOTS {
        string slot_id PK
        string camera_id FK
        string state
        string polygon_json
    }

    PARKING_SESSIONS {
        string session_id PK
        string license_plate FK
        string slot_id FK
        datetime entry_time
        datetime exit_time
        float duration_seconds
        string status
    }
```

---

## SQLite Performance Tuning
For high-concurrency event ingestion:
- `journal_mode = WAL` (Write-Ahead Logging allows concurrent reads while writing).
- `synchronous = NORMAL`.
- `busy_timeout = 5000` ms.


---

<!-- Section: 05_backend_api/configuration.md -->


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


---

<!-- Section: 06_integration_layer/README.md -->


# Section 06: Integration Layer & Real-Time Event Bus

The **Integration Layer** (`modules/integration_layer/`) decouples low-level computer vision processing from high-level API routers, WebSockets, and external microservices.

---

## Topology

```mermaid
graph TD
    AI[AI Inference Pipeline] --> PI[Parking Intelligence]
    
    PI --> EB[events/bus.py<br>EventBus Interface]
    EB --> MB[events/memory_bus.py<br>Asyncio In-Process Bus]
    EB --> RB[events/redis_bus.py<br>Distributed Redis Pub/Sub]
    
    EB --> WS[websocket/manager.py<br>WebSocket Real-Time Broadcast]
    WS --> Client[Next.js Frontend /ws/realtime]
    
    EB --> Adapters[adapters/ Transform Engine]
    Adapters --> VA[vehicle_adapter.py]
    Adapters --> PA[parking_adapter.py]
    Adapters --> EA[event_adapter.py]
    
    Adapters --> GW[gateway/router.py<br>Cached REST API Endpoints]
```

---

## Directory Reference

| Document | Component | Description |
| :--- | :--- | :--- |
| [`event_bus.md`](./event_bus.md) | `events/` | Pub/Sub messaging bus with Memory and Redis backends |
| [`websocket.md`](./websocket.md) | `websocket/` | Real-time WebSocket connection manager and multiplexed broadcasting |
| [`adapters.md`](./adapters.md) | `adapters/` | Domain entity to API DTO transformation layer |
| [`gateway.md`](./gateway.md) | `gateway/` | Unified caching REST integration gateway endpoints |


---

<!-- Section: 06_integration_layer/event_bus.md -->


# Event Bus Architecture (`modules/integration_layer/events/`)

Provides asynchronous, loosely coupled domain event propagation across the platform.

---

## Bus Implementations

1. **`MemoryBus` (Default)**: Uses Python `asyncio.Queue` for zero-dependency local development and single-container deployments.
2. **`RedisBus`**: Uses Redis Pub/Sub channels for multi-worker, clustered production scaling.

---

## Event Topics & Message Format

- `topic: vehicle.detected` — Fired when a vehicle is recognized.
- `topic: parking.slot_changed` — Fired when a slot changes occupancy state.
- `topic: parking.violation` — Fired when an overstay or unauthorized vehicle is detected.


---

<!-- Section: 06_integration_layer/websocket.md -->


# WebSocket Real-Time Manager (`modules/integration_layer/websocket/`)

Maintains persistent duplex connections with frontend browser clients at `/ws/realtime`.

---

## Connection Lifecycle & Message Broadcasting

```mermaid
sequenceDiagram
    participant UI as Next.js Web Client
    participant WS as WebSocketManager
    participant Bus as EventBus

    UI->>WS: Connect ws://localhost:8000/ws/realtime
    WS->>WS: Register client connection & assign channel
    WS-->>UI: Connected acknowledgment

    loop Event Broadcast Loop
        Bus->>WS: Domain Event (e.g. slot_occupied P03)
        WS->>UI: JSON Frame { type: "SLOT_UPDATE", data: { slot_id: "P03", state: "OCCUPIED" } }
    end

    UI->>WS: Heartbeat Ping
    WS-->>UI: Heartbeat Pong
```


---

<!-- Section: 06_integration_layer/adapters.md -->


# Data Adapters (`modules/integration_layer/adapters/`)

Translates internal domain dataclasses into standardized external API response schemas (Pydantic DTOs).

- **`VehicleAdapter`**: Converts `VehicleRecord` into `VehicleDTO`.
- **`ParkingAdapter`**: Converts `SlotState` into `SlotOccupancyDTO`.
- **`EventAdapter`**: Converts domain event tuples into JSON serializable messages.


---

<!-- Section: 06_integration_layer/gateway.md -->


# Integration Gateway (`modules/integration_layer/gateway/`)

Exposes high-speed, cached REST endpoints used by the dashboard and digital twin frontend.

---

## Key Endpoints

- `GET /integration/slots` — Current status of all 10 slots.
- `GET /integration/occupancy` — Instantaneous capacity utilization.
- `GET /integration/sessions` — Active parking session records.


---

<!-- Section: 07_frontend/README.md -->


# Section 07: Frontend Application Architecture

The **ParkTwin Frontend** (`apps/web/`) is built on **Next.js 15.5**, **React 19**, **TypeScript 5**, and **Tailwind CSS**, featuring real-time WebSocket state synchronizers, interactive charts, and a **Three.js 3D Digital Twin** representation of the parking lot.

---

## Page Route Directory

| Route | Page File | Purpose & UI Components |
| :--- | :--- | :--- |
| `/` | `app/page.tsx` | Landing page, platform features, quick navigation |
| `/dashboard` | `app/dashboard/page.tsx` | Real-time lot capacity, KPI summary cards, live slot occupancy grid |
| `/parking` | `app/parking/page.tsx` | Interactive slot layout (`P01`–`P10`), slot details, manual overrides |
| `/digital-twin` | `app/digital-twin/page.tsx` | 3D visual digital twin with Entry, Parking, and Exit CCTV upload stations |
| `/vehicles` | `app/vehicles/page.tsx` | Filterable and searchable table of observed vehicles and plate snapshots |
| `/video-processing` | `app/video-processing/page.tsx`| Live CCTV RTSP stream monitor and control room |
| `/anpr` | `app/anpr/page.tsx` | Drag-and-drop video benchmark uploader and license plate detection results table |
| `/analytics` | `app/analytics/page.tsx` | Operational charts, peak hours, turnover rates, traffic histograms |
| `/reports` | `app/reports/page.tsx` | Executive PDF and CSV report export generator |
| `/settings` | `app/settings/page.tsx` | System preferences, camera RTSP URLs, API token management |

---

## Architecture Reference Documents

| Document | Topic | Description |
| :--- | :--- | :--- |
| [`pages.md`](./pages.md) | Page Details | Detailed breakdown of all 10 frontend routes and user workflows |
| [`api_services.md`](./api_services.md) | Service Layer | Typed Axios API client wrappers (`anpr.ts`, `journey.ts`, `parking.ts`) |
| [`state_management.md`](./state_management.md) | State Management | Zustand store architecture and WebSocket real-time synchronization hooks |
| [`components.md`](./components.md) | UI Components | Reusable components, 3D Canvas, slot cards, metrics badges |


---

<!-- Section: 07_frontend/pages.md -->


# Frontend Pages Reference (`apps/web/app/`)

Detailed breakdown of all 10 application pages:

---

## 1. `/dashboard` — Master Operations Dashboard
- Displays total lot capacity, occupied count, free bays, and percentage rate.
- Interactive 10-slot grid (`P01`–`P10`) updating dynamically via WebSockets.
- Recent vehicle arrival feed with plate chips and brand logos.

---

## 2. `/digital-twin` — 3D Smart Lot Twin
- Three.js / WebGL canvas rendering the physical parking structure in real-time.
- 3 Multi-Station Upload Cards:
  - **Entry Station (`station_entry`)**: Ingests vehicle arrival footage.
  - **Parking Lot (`station_parking`)**: Visualizes bay occupation in 3D space.
  - **Exit Station (`station_exit`)**: Ingests departure footage and triggers session close.

---

## 3. `/anpr` — Automated Number Plate Recognition Lab
- Drag-and-drop zone accepting `.mp4` and `.avi` video clips.
- Real-time progress indicator during pipeline execution.
- Download links for annotated bounding-box video, CSV logs, and JSON data.
- Results table showing track ID, formatted plate, confidence %, vehicle type, brand, and color.


---

<!-- Section: 07_frontend/api_services.md -->


# API Service Layer (`apps/web/services/`)

TypeScript service wrappers utilizing `axios` for backend REST communication.

---

## Long-Running Video Upload Configuration

Standard HTTP API calls timeout after 15 seconds (`NEXT_PUBLIC_API_TIMEOUT = 15000`).
For video pipeline uploads (`/api/v1/anpr/upload` and `/api/v1/journey/upload`), the timeout is explicitly disabled:

```typescript
// apps/web/services/anpr.ts
export async function uploadAnprVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<AnprUploadResponse> {
  const formData = new FormData();
  formData.append('video', file);

  const response = await apiClient.post<AnprUploadResponse>(
    '/api/v1/anpr/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // Infinite timeout for long video processing on CPU
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    }
  );
  return response.data;
}
```


---

<!-- Section: 07_frontend/state_management.md -->


# State Management & WebSockets (`apps/web/store/`)

ParkTwin AI utilizes **Zustand** for lightweight, performant global state management.

---

## Store Architecture

```mermaid
graph TD
    WS[/ws/realtime WebSocket Feed] --> Hook[useWebSocket Hook]
    Hook --> Dispatch{Message Type}
    
    Dispatch -->|SLOT_UPDATE| PStore[useParkingStore<br>Slot States & Occupancy Rate]
    Dispatch -->|VEHICLE_DETECTED| VStore[useVehicleStore<br>Recent Vehicle Feed]
    Dispatch -->|SYSTEM_ALERT| AStore[useAlertStore<br>Violations & Notifications]
    
    PStore --> UI1[Dashboard Slot Grid]
    PStore --> UI2[3D Digital Twin]
    VStore --> UI3[Vehicles Table]
```


---

<!-- Section: 07_frontend/components.md -->


# Reusable UI Components (`apps/web/components/`)

---

## Component Catalog

- **`Layout`**: Sidebar navigation, top header, live system health indicator.
- **`SlotCard`**: Interactive parking bay card with green/red/yellow status badges.
- **`VehicleBadge`**: Formatted Indian license plate pill with confidence tooltip.
- **`VideoPlayerModal`**: In-browser video player for annotated pipeline MP4 outputs.
- **`DigitalTwinCanvas`**: Three.js viewport rendering cars in parking bays.


---

<!-- Section: 08_devops/README.md -->


# Section 08: DevOps & Container Architecture

ParkTwin AI uses multi-container **Docker Compose** topologies for hot-reloading development and scalable production deployments.

---

## Container Architecture

```mermaid
graph TD
    Client[Browser / Client] -->|Port 3000| WebCont["parktwin-web-dev (Next.js 15.5)"]
    Client -->|Port 8000| BackendCont["parktwin-dev (FastAPI & AI Pipeline)"]
    
    WebCont -->|Proxy API Requests| BackendCont
    
    subgraph Host_Filesystem [Host Filesystem Mounts]
        SourceCode["./ (Workspace Root)"]
        Outputs["./backend/outputs/ (Annotated MP4s & CSVs)"]
        Models["./models/ (YOLOv8m & DL Weights)"]
    end
    
    SourceCode -->|Volume Mount| WebCont
    SourceCode -->|Volume Mount| BackendCont
    Outputs -->|Persistent Storage| BackendCont
    Models -->|Cached Model Weights| BackendCont
```

---

## DevOps Reference Documents

| Document | Topic | Description |
| :--- | :--- | :--- |
| [`docker.md`](./docker.md) | Docker Specs | `docker-compose.hotdev.yml` breakdown, commands, and GPU setup |
| [`configuration.md`](./configuration.md) | Environment Config | Complete guide to `.env`, `.env.production`, and tuning knobs |
| [`deployment.md`](./deployment.md) | Production Guide | PostgreSQL migration, Redis EventBus, SSL/TLS with Caddy/Nginx |


---

<!-- Section: 08_devops/docker.md -->


# Docker Architecture & Operations (`docker/`)

---

## Service Specifications (`docker/compose/docker-compose.hotdev.yml`)

### 1. `parktwin-dev` (Backend Service)
- **Base Image**: Python 3.11 Slim with OpenCV, PyTorch, PaddleOCR, EasyOCR.
- **Port Mapping**: `8000:8000`
- **Volume Mounts**:
  - `../../:/app` (hot-code reloading).
  - `../../backend/outputs:/app/backend/outputs` (persistent outputs).
- **Health Check**: `curl -f http://localhost:8000/health`

### 2. `parktwin-web-dev` (Frontend Service)
- **Base Image**: Node.js 20 Alpine.
- **Port Mapping**: `3000:3000`
- **Command**: `npm run dev`

---

## Container Operations Quick Reference

```powershell
# 1. Start all services in background
docker compose -f docker/compose/docker-compose.hotdev.yml up -d

# 2. View live backend logs
docker logs -f parktwin-dev

# 3. View live frontend logs
docker logs -f parktwin-web-dev

# 4. Restart backend after configuration changes
docker restart parktwin-dev

# 5. Run full test suite inside container
docker exec parktwin-dev pytest tests/ -q
```

---

## NVIDIA GPU Passthrough Guide

To enable CUDA GPU acceleration in Docker:
1. Install **NVIDIA Container Toolkit**.
2. Add the `deploy.resources.reservations.devices` block to `docker-compose.hotdev.yml`:
```yaml
services:
  parktwin-dev:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```


---

<!-- Section: 08_devops/configuration.md -->


# Operational Tuning & Configuration Guide

---

## Tuning CPU vs GPU Throughput

### On CPU Environments:
- `tracking.track_buffer`: Set to `300` (prevents track fragmentation).
- `frame_skip`: Computed dynamically as `max(2, int(fps / 4))` (approx 4 FPS sampling).
- `ocr.enable_mkldnn`: Set to `False` in PaddleOCR initialization.

### On GPU Environments:
- Set `half=True` on `VehicleDetector` for FP16 inference.
- Reduce `frame_skip` to `1` (process every frame at 30 FPS).
- Set `tracking.track_buffer` to `60`.


---

<!-- Section: 08_devops/deployment.md -->


# Production Deployment Guide

---

## Architecture Transformation: Dev to Production

```mermaid
graph TD
    subgraph Development [Development Setup]
        DevDB[SQLite WAL Mode]
        DevBus[In-Memory Asyncio Queue]
        DevStatic[Static Dev Token]
    end

    subgraph Production [Production Enterprise Deployment]
        ProdDB[(PostgreSQL 16 High Availability)]
        ProdBus[Redis 7 Cluster EventBus]
        ProdAuth[OAuth2 / JWT Token Authority]
        Proxy[Caddy / Nginx Reverse Proxy with Auto HTTPS]
    end

    Proxy --> ProdDB & ProdBus & ProdAuth
```

---

## Production Checklist

1. **Database Migration**: Switch `DATABASE_URL` from `sqlite:///./data/parktwin.db` to `postgresql://user:pass@host:5432/parktwin`.
2. **Event Bus**: Set `EVENT_BUS_TYPE=redis` and configure `REDIS_URL=redis://host:6379/0`.
3. **Security**: Generate a 256-bit cryptographically secure `JWT_SECRET_KEY`.
4. **SSL / Reverse Proxy**: Deploy Caddy with automatic Let's Encrypt certificates.


---

# 10. Incident Post-Mortem & Stability Engineering Log

During real-world benchmarking and testing on complex CCTV footage (`WhatsApp Video 2026-08-21 at 9.20.13 AM.mp4`, 60 FPS, multiple moving vehicles, Indian license plates), critical architectural stability challenges were discovered, diagnosed, and permanently resolved in code.

---

### 10.1 Issue 1: PaddleOCR DBNet oneDNN Shape Broadcast Assertion Crash

#### Root Cause
PaddleOCR text detection utilizes a DBNet Feature Pyramid Network (FPN) backbone. The downsampling and upsampling convolutional stages require tensor spatial dimensions $(H, W)$ to be exact integer multiples of 32. When dynamic vehicle crops (e.g. $147 \times 49$) were passed to detection, oneDNN / MKL-DNN raised fatal shape broadcast mismatch exceptions:
`Operands could not be broadcast together with shape X = [1, 96, 80, 160] and Y = [1, 96, 48, 160]`

#### Solution Applied
1. In `modules/vehicle_recognition/ocr/ocr_engine.py`, disabled oneDNN CPU optimizations: `enable_mkldnn=False`.
2. In `modules/vehicle_recognition/plate_detection/plate_detector.py` and `ocr_engine.py`, enforced **32-pixel stride alignment** and contiguous memory buffers before tensor conversion:
```python
target_w = ((target_w + 31) // 32) * 32
target_h = ((target_h + 31) // 32) * 32
scaled_img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
scaled_img = np.ascontiguousarray(scaled_img)
```

---

### 10.2 Issue 2: Track Fragmentation Bug on Frame-Skipped Video

#### Root Cause
To run 60 FPS video on CPU without taking hours, adaptive frame skipping was implemented (`frame_skip = 30` or `15`). However, ByteTrack defaults to `track_buffer = 60` frames. In normal 30 FPS video, 60 frames equals 2 seconds of occlusion tolerance. But with `frame_skip = 30`, 1 sampled frame represents 0.5s of real time. Any temporary occlusion or panning lasting >2 sampled frames caused the Kalman tracker to declare the track "lost" and delete it. When the vehicle reappeared, ByteTrack assigned a **brand new track ID**. Consequently, a video with **4 real cars** generated **11 fragmented vehicle IDs**.

#### Solution Applied
1. Scaled `track_buffer` in `configs/settings.yaml` from `60` to **`300`**.
   - With `frame_skip = 15` on 60 FPS video (4 sampled frames/second), a buffer of 300 sampled frames keeps lost tracks alive for **75 seconds of real-world occlusion**.
2. Calibrated CPU frame skip to `max(2, int(fps / 4))` (~4 FPS sampling), providing optimal spatial continuity for Kalman trajectory interpolation while maintaining ~15-minute CPU processing time.

---

### 10.3 Issue 3: Axios Frontend Upload Timeout

#### Root Cause
Next.js Axios client config in `apps/web/utils/env.ts` enforced a default 15-second timeout (`NEXT_PUBLIC_API_TIMEOUT = 15000`). When uploading an MP4 video to `/api/v1/anpr/upload` or `/api/v1/journey/upload`, inference on CPU takes several minutes, causing Axios to abort the request with `ECONNABORTED` despite the backend running smoothly.

#### Solution Applied
In `apps/web/services/anpr.ts` and `apps/web/services/journey.ts`, explicitly configured `timeout: 0` (no timeout) on multipart video upload requests, allowing long-running CPU background tasks to stream progress and return results safely.

---

### 10.4 Issue 4: Disk Bloat from Stale Video & Benchmark Outputs

#### Root Cause
Every ANPR upload produces annotated `.mp4` video files, CSV logs, and JSON dumps in `backend/outputs/`. Continuous testing generated hundreds of files totaling 1.66 GB of disk space.

#### Solution Applied
Implemented automated time-to-live (TTL) pruning in `backend/services/anpr_service.py` via `cleanup_old_outputs(keep_latest=10, max_age_days=3)`. Automatically invoked at the end of every upload pipeline run, keeping storage bounded to <100 MB.
