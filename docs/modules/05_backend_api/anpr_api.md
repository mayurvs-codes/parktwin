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
