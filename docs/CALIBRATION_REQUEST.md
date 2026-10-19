# ParkTwin AI — Camera Calibration Data Request

**Document Status:** PENDING DATA  
**Target File:** `configs/camera_calibration.yaml`  
**Purpose:** Formal request for ground-truth physical survey points required to compute valid camera-to-floor perspective homographies ($H \in \mathbb{R}^{3 \times 3}$).

---

## 1. Background & Current Status

As of Task 1, all 16 cameras (`CAM-01` through `CAM-16`) are marked with status `unconfigured` in `configs/camera_calibration.yaml`. Synthetic matrices previously used for early prototyping have been moved under `_synthetic_test_only` and are prohibited from runtime execution.

At runtime, `BayEntryDetector`:
- Reports `"unconfigured"` for all cameras lacking verified calibration.
- Rejects floor projection (returns `None`).
- Emits **zero** bay entry/exit events for unconfigured cameras, preventing false or hallucinated vehicle coordinates.

---

## 2. What Must Be Supplied Per Camera

To upgrade a camera from `unconfigured` to `calibrated`, provide the following surveyed ground-truth data:

### Option A: Floor-Plan Metre Calibration (Recommended for Fixed CCTV)
For each camera covering driving aisles or bays:
1. **Camera Identifier:** (e.g., `CAM-01`, `CAM-02`, etc.)
2. **Camera Sensor Resolution:** Width $\times$ Height in pixels (e.g., `[1920, 1080]`).
3. **Reference Points ($\ge 4$ non-collinear coplanar points):**
   - **Image Pixel Coordinates:** $[u, v]$ where $(0, 0)$ is top-left and $(W, H)$ is bottom-right.
   - **Floor-Plan Coordinates (Meters):** $[x, y]$ in the canonical facility coordinate frame (matching `shared/facility_geometry.json`).
   - *Example physical markers:* Bay painted line corners, column base corners, ramp threshold lines.

#### Template:
```yaml
cameras:
  CAM-XX:
    name: "Camera Display Name"
    status: "calibrated"
    image_resolution: [1920, 1080]
    ground_reference_points:
      image_points:
        - [u1, v1]  # Point 1 (e.g. Bay SP-07 front-left corner)
        - [u2, v2]  # Point 2 (e.g. Bay SP-07 front-right corner)
        - [u3, v3]  # Point 3 (e.g. Bay SP-07 back-right corner)
        - [u4, v4]  # Point 4 (e.g. Bay SP-07 back-left corner)
      floor_points_meters:
        - [x1, y1]
        - [x2, y2]
        - [x3, y3]
        - [x4, y4]
```
The homography matrix $H$ will then be computed via OpenCV `cv2.findHomography(src_pts, dst_pts, cv2.RANSAC)`.

---

### Option B: Image-Space Bay Polygons (Fallback for Video Replay Clips)
If surveyed floor metre coordinates are not available for a specific recorded video clip:
1. Provide the pixel bounding polygon (4 vertices $[(u_1, v_1), (u_2, v_2), (u_3, v_3), (u_4, v_4)]$) for each visible parking bay directly on the camera frame.
2. In this mode, the detector computes IoU / overlap directly in image space.
3. **Data Provenance Rule:** All events produced via this fallback must be strictly tagged with `source: "replay"` (never `"live"`).

---

## 3. Camera Inventory Requiring Calibration

| Camera ID | Planned Location / Field of View | Primary Purpose | Status | Calibration Needed |
| :--- | :--- | :--- | :--- | :--- |
| **CAM-01** | B2 Entrance Gate | ANPR / Access control | `unconfigured` | 4+ ground reference points at entry lane |
| **CAM-02** | B2 Parking Bays (Aisle 1) | Bay entry / occupancy monitoring | `unconfigured` | 4+ ground reference points at bays SP-01..SP-10 |
| **CAM-03** | Southeast Drive Corridor | Internal vehicle routing | `unconfigured` | 4+ corridor reference points |
| **CAM-04** | South Perimeter Corridor East | Vehicle tracking | `unconfigured` | Aisle junction points |
| **CAM-05** | 3rd Horizontal Aisle East | Bay monitoring | `unconfigured` | Bay markings |
| **CAM-06** | 3rd Horizontal Aisle West | Bay monitoring | `unconfigured` | Bay markings |
| **CAM-07** | Southwest Corridor Junction | Junction navigation | `unconfigured` | Junction markings |
| **CAM-08** | West Lift Core 02 Junction | Pedestrian / vehicle interface | `unconfigured` | Column corners |
| **CAM-09** | 2nd Horizontal Aisle West | Bay monitoring | `unconfigured` | Bay markings |
| **CAM-10** | 2nd Horizontal Aisle Center | Bay monitoring | `unconfigured` | Bay markings |
| **CAM-11** | East Services Corridor | Service lane tracking | `unconfigured` | Corridor markers |
| **CAM-12** | Top Horizontal Aisle Center | Bay monitoring | `unconfigured` | Bay markings |
| **CAM-13** | West Entry Ramp Junction | Ramp entry detection | `unconfigured` | Ramp markings |
| **CAM-14** | West Lift Core 01 Junction | Core navigation | `unconfigured` | Column corners |
| **CAM-15** | Northwest Perimeter Junction | Perimeter tracking | `unconfigured` | Perimeter markings |
| **CAM-16** | Exit Gate / Access Point B2 | Exit ANPR / Departure confirmation | `unconfigured` | 4+ ground reference points at exit barrier |

---

## 4. Replay Fallback Mode in Task 2 Pipeline

While physical calibration survey data is pending:
- The real pipeline (Task 2) falls back to image-space polygon evaluation for recorded replay clips (`source: "replay"`), or canonical facility simulation tracks (`source: "demo"`).
- At no point will synthetic or invented homography values be labeled as `"live"` or `"calibrated"`.
