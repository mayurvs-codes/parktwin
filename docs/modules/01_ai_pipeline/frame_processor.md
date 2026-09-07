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
