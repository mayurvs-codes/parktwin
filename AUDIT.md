# ParkTwin AI — Repository Audit

**Date:** 2026-09-04
**Performed by:** Autonomous Engineering Session
**Branch:** prototype-3day
**Commit:** 5e2375a

---

## 1. DIRECTORY STRUCTURE (OBSERVED)

```
/c/Users/ASUS/Desktop/parktwin/
├── .claude/                    # Claude Code settings
├── .github/                    # GitHub workflows/templates
├── .playwright-mcp/            # Playwright MCP artifacts
├── .pytest_cache/              # Pytest cache
├── 27-Aug-2026/                # Additional video directory
├── alembic/                    # Database migrations
├── apps/
│   ├── mobile/                 # Expo React Native app
│   └── web/                    # Next.js 15 frontend (App Router)
├── backend/                    # FastAPI backend (Module 1)
│   ├── api/                    # API routers
│   ├── app/                    # App factory
│   ├── auth/                   # Authentication
│   ├── core/                   # Configuration
│   ├── database/               # SQLAlchemy models + session
│   ├── pipelines/              # CV pipelines
│   ├── schemas/                # Pydantic schemas
│   ├── services/               # Business logic services
│   ├── utils/                  # Utilities
│   └── main.py                 # Entry point
├── configs/                    # Configuration files
├── data/                       # Runtime data (empty)
├── datasets/                   # Reference datasets
├── docker/
│   ├── backend/Dockerfile      # Backend container
│   └── compose/                # Docker Compose files
│       ├── docker-compose.prod.yml
│       ├── docker-compose.hotdev.yml
│       ├── docker-compose.dev.yml
│       └── docker-compose.prod.caddy.yml
├── engine/                     # Core engine modules
├── evidence/                   # Evidence artifacts
│   └── real_cctv/              # Real CCTV acceptance outputs
├── logs/                       # Application logs
├── models/                     # ML model storage (empty)
├── modules/                    # Feature modules (M2-M5)
│   ├── analytics/              # Analytics Engine (M4)
│   ├── integration_layer/      # Integration Layer (M3)
│   ├── parking_intelligence/   # Parking Intelligence (M2)
│   └── reporting/              # Reporting Engine (M5)
├── reports_output/             # Generated reports
├── scripts/                    # Operational scripts
│   └── run_real_cctv_acceptance.py
├── shared/                     # Shared utilities
├── snapshots/                  # Detection snapshots
├── videos/                     # CCTV video files
├── tests/                      # Test suite
│   ├── unit/                   # Unit tests (~30 files)
│   └── integration/            # Integration tests (~10 files)
├── .env.docker                 # Docker environment
├── .env.production             # Production environment
├── .env.production.example     # Production env template
├── .env.test.example           # Test env template
├── alembic.ini                 # Alembic config
├── BUILD_STATUS.md             # Build status
├── DIGITAL_TWIN_GEOMETRY.md    # Geometry spec
├── DIGITAL_TWIN_INTEGRATION.md # Integration docs
├── DIGITAL_TWIN_VALIDATION.md  # Validation docs
├── DUPLICATE_REGISTRY.md       # Duplicate tracking
├── FULL_PROJECT_DOCUMENTATION.md
├── PROJECT_DIGITALTWIN.md
├── PROJECT_FUTURE.md
├── PROJECT_MEMORY.md
├── pyproject.toml              # Python project config
├── README.md
├── REAL_CCTV_ACCEPTANCE_TEST.md
├── requirements.txt            # Python requirements
├── run_demo.py                 # Demo runner
├── parktwin.db                 # SQLite database (208KB)
├── test_parktwin.db            # Test database (274KB)
├── VALIDATION_REPORT.md
├── DEV_QUICKSTART.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── MIGRATION_REPORT.md
├── SECURITY.md
├── SUPPORT.md
└── dev.ps1                     # PowerShell dev script
```

---

## 2. BACKEND STRUCTURE (OBSERVED)

### 2.1 API Routers (`backend/api/routers/`)
| Router | Prefix | Purpose |
|--------|--------|---------|
| `health.py` | `/health` | Health checks |
| `cameras.py` | `/cameras` | Camera registry + designation |
| `vehicles.py` | `/vehicles` | Vehicle detection/tracking |
| `parking.py` | `/parking` | Slot/session management |
| `anpr.py` | `/anpr` | Batch ANPR processing |
| `prototype.py` | `/prototype` | Prototype contract APIs |
| `videos.py` | `/videos` | Video Library & Processing |
| `journey.py` | `/journey` | Multi-camera vehicle journeys |
| `streams.py` | `/streams` | Live RTSP/USB streams |
| `settings.py` | `/settings` | Platform configuration |

### 2.2 Core Services (`backend/services/`)
| Service | Purpose |
|---------|---------|
| `video_library_service.py` | Discovers, indexes, extracts metadata from CCTV videos |
| `video_processing_service.py` | Real CV pipeline execution (YOLO + ByteTrack + OCR) |
| `anpr_service.py` | Batch ANPR on uploaded videos |
| `camera_designation_service.py` | Camera role management |

### 2.3 Database Models (`backend/database/models.py`)
- **Camera** — CCTV registry with role (ENTRY/PARKING_LOT/EXIT/UNKNOWN)
- **Vehicle** — Detected vehicles with plate, tracking_id, type, brand, color
- **DetectionLog** — Raw AI detection events
- **VehicleJourney** — 3-camera lifecycle (entry → parked → exited)
- **Video** — Video file registry with processing status
- **CameraDesignation** — Audit log of role assignments

### 2.4 CV Pipeline (`engine/`, `modules/vehicle_recognition/`)
- YOLOv8m vehicle detection (ultralytics)
- ByteTrack tracking
- PaddleOCR + EasyOCR for ANPR
- Plate normalization with provenance tracking

---

## 3. FRONTEND STRUCTURE (OBSERVED)

### 3.1 Next.js App Router Pages (`apps/web/app/`)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Landing redirect |
| `/dashboard` | `dashboard/page.tsx` | Operations dashboard |
| `/digital-twin` | `digital-twin/page.tsx` | Digital Twin view |
| `/video-library` | `video-library/page.tsx` | Video Library |
| `/vehicles` | `vehicles/page.tsx` | Vehicle management |
| `/parking` | `parking/page.tsx` | Parking management |
| `/analytics` | `analytics/page.tsx` | Analytics |
| `/reports` | `reports/page.tsx` | Reporting |
| `/settings` | `settings/page.tsx` | Settings |
| `/anpr` | `anpr/page.tsx` | ANPR workspace |
| `/video-processing` | `video-processing/page.tsx` | Video processing |

### 3.2 Key Components

**Digital Twin** (`apps/web/components/digital-twin/`):
- `DigitalTwinView.tsx` — Main orchestration
- `FacilityMap.tsx` — Interactive 2D map (Konva)
- `VehicleDrawer.tsx` — Vehicle detail drawer
- `SlotDrawer.tsx` — Slot detail drawer
- `CameraDrawer.tsx` — Camera detail modal
- `VehicleMarker.tsx`, `ParkingSlotMarker.tsx`, `CameraMarker.tsx` — Map markers
- `NavigationRoute.tsx` — Dijkstra route rendering
- `TwinKPIs.tsx`, `TwinControls.tsx`, `TwinLegend.tsx` — UI chrome

**Video Library** (`apps/web/components/video-library/`):
- `VideoLibraryView.tsx` — Full CCTV operations interface

### 3.3 State Management (`apps/web/store/`)
- `useDigitalTwinStore.ts` — Zustand store for slots/vehicles/cameras
- `useGlobalProcessingStore.ts` — Processing job tracking
- `useJourneyStationStore.ts` — Multi-camera journey feeds

---

## 4. DATABASE / STORAGE (OBSERVED)

### 4.1 Engine
- **SQLite** (aiosqlite) — default, file-based at `/app/data/parktwin.db`
- **PostgreSQL** (asyncpg) — optional via `--profile postgres`

### 4.2 Persistence (Docker Volumes)
| Volume | Mount Path | Purpose |
|--------|------------|---------|
| `parktwin_db` | `/app/data` | SQLite database |
| `parktwin_models` | `/app/models` | ML weights |
| `parktwin_paddleocr` | `/home/appuser/.paddleocr` | PaddleOCR cache |
| `parktwin_easyocr` | `/home/appuser/.EasyOCR` | EasyOCR cache |
| `parktwin_ultralytics` | `/home/appuser/.config/Ultralytics` | YOLO cache |
| `parktwin_logs` | `/app/backend/logs` | Application logs |
| `parktwin_reports` | `/app/reports_output` | Generated reports |
| `parktwin_uploads` | `/app/backend/uploads` | User uploads |
| `parktwin_snapshots` | `/app/backend/snapshots` | Detection snapshots |

### 4.3 Video Storage
- **Source videos:** `./videos/` and `./27-Aug-2026/` (bind-mounted read-only)
- **Key files:** `cam1_entry_gate.mp4`, `cam2_parking_bay.mp4`, `cam3_exit_ramp.mp4`

---

## 5. DOCKER ARCHITECTURE (OBSERVED)

### 5.1 Production Compose (`docker/compose/docker-compose.prod.yml`)
Services:
- **backend** — FastAPI on internal port 8000
- **frontend** — Next.js on internal port 3000
- **proxy** — Nginx on 8080/8443 (host ports)
- **db** (profile: postgres) — PostgreSQL
- **cache** (profile: redis) — Redis
- **prometheus/grafana** (profile: monitoring)

Networks:
- `parktwin-edge` — proxy only (published ports)
- `parktwin-internal` — backend, frontend, infra (no published ports)

### 5.2 Hot-Dev Compose (`docker/compose/docker-compose.hotdev.yml`)
- Backend: binds source code for hot reload (`uvicorn --reload`)
- Frontend: binds source code for Next.js dev server
- Uses pre-built images (`parktwin-ai/backend:dev`, `parktwin-ai/web:hotdev`)
- Named volumes for all persistent data (models, DB, caches)

### 5.3 Backend Dockerfile
- Python 3.12-slim
- Non-root user (uid 10001)
- BuildKit cache mounts for pip
- Editable install (`pip install -e .`)
- Health check: `/health/db` endpoint

---

## 6. CV PIPELINE (OBSERVED)

### 6.1 Video Processing Flow (`video_processing_service.py`)
1. OpenCV reads video file
2. Frame sampling (~3 FPS target via `frame_skip = max(1, int(fps / 3))`)
3. `pipeline.process_frame(frame, camera_id)` → YOLO + ByteTrack + OCR
4. Results processed by camera role:
   - **ENTRY:** `VEHICLE_ENTERED` event
   - **PARKING_LOT:** Slot assignment via `ParkingIntelligenceEngine`, `SLOT_OCCUPIED`
   - **EXIT:** Session closure, `VEHICLE_EXITED`, `SLOT_FREED`
5. Events persisted to DB + broadcast via WebSocket
6. Progress tracked in `_task_progress` dict

### 6.2 Parking Intelligence Engine (`modules/parking_intelligence/engine.py`)
- `SlotMapper` — stable vehicle↔slot assignment (IoU + distance)
- `OccupancyManager` — FREE/OCCUPIED/RESERVED/UNKNOWN states
- `SessionManager` — open/close parking sessions
- `DurationTracker` — accurate seconds + HH:MM:SS
- `ViolationEngine` — overstay/reserved/unauthorized
- `EventEngine` — 6 lifecycle events

### 6.3 Slot Configuration
From `DIGITAL_TWIN_GEOMETRY.md` (specification):
- **Canonical geometry:** 1255 × 2155 units
- **Scale:** 1 unit ≈ 0.05 m
- **Boundary:** L-shaped polygon
- **Obstacle:** x=345-1245, y=1585-2145
- **Slots P01-P05:** X=560,650,740,830,920; Y=720; W=62; H=95; orientation=180°
- **Slots P06-P10:** X=560,650,740,830,920; Y=1480; W=62; H=95; orientation=0°
- **Cameras:** CAM-01(310,750,35°), CAM-02(480,860,-35°), CAM-03(1100,900,195°)
- **Nav nodes:** ENTRY_GATE, MAIN_LANE, JUNCTION_A, AISLE_A, JUNCTION_B, AISLE_B, EXIT_RAMP

---

## 7. WEBSOCKET (OBSERVED)

### 7.1 Implementation
- `modules/integration_layer/websocket/manager.py` — Connection manager
- Channels: `events`, `slots`, `occupancy`, `sessions`, `vehicles`, `cameras`
- Endpoint: `/integration/ws?channel=<channel>`
- Events broadcast from `emit_digital_twin_event()` in video processing

### 7.2 Event Types
- `VIDEO_STARTED`, `VIDEO_STOPPED`
- `VEHICLE_ENTERED`, `VEHICLE_PARKED`, `VEHICLE_LEFT`, `VEHICLE_EXITED`
- `SLOT_OCCUPIED`, `SLOT_FREED`, `SLOT_RESERVED`
- `SESSION_STARTED`, `SESSION_ENDED`
- `CAMERA_DESIGNATED`
- Detection/Tracking/OCR frame telemetry

---

## 8. VIDEO LIBRARY WORKFLOW (OBSERVED)

### 8.1 Backend API (`/videos`)
- `GET /videos?hierarchical=true` — Date → Camera → Video tree
- `GET /videos/{video_id}` — Metadata + live progress
- `POST /videos/{video_id}/process` — Start CV processing
- `POST /videos/{video_id}/stop` — Stop processing
- `GET /videos/{video_id}/stream` — Stream MP4

### 8.2 Frontend (`VideoLibraryView.tsx`)
- Hierarchical tree browser (left panel)
- Video player with HTML5 `<video>`
- Camera Role Designation panel (ENTRY/PARKING_LOT/EXIT/UNKNOWN)
- Live processing telemetry bar (progress, FPS, detections)
- Video metadata panel

### 8.3 Camera Role Inference (`video_library_service.py:_infer_camera_id`)
| Filename Pattern | Camera ID |
|-----------------|-----------|
| cam1, cam-01, entry | CAM-01 |
| cam2, cam-02, parking_bay | CAM-02 |
| cam3, cam-03, exit | CAM-03 |

---

## 9. TESTS (OBSERVED)

### 9.1 Unit Tests (~30 files)
Key tests:
- `test_video_library.py` — Video hierarchy, metadata extraction
- `test_anpr_sota.py` — OCR accuracy
- `test_slot_mapper.py` — Slot assignment logic
- `test_vehicle_detector.py` — YOLO detection
- `test_tracker.py` — ByteTrack
- `test_ocr_engine.py` — PaddleOCR/EasyOCR
- `test_camera_designation.py` — Role assignment
- `test_navigation.py` — Dijkstra routing
- `test_vehicle_navigation.py` — Vehicle-specific routing

### 9.2 Integration Tests (~10 files)
- `test_pipeline.py` — Full CV pipeline
- `test_parking_api.py` — Parking REST API
- `test_integration_layer.py` — WebSocket + events
- `test_analytics_api.py` — Analytics endpoints
- `test_reporting_api.py` — Reporting endpoints

---

## 10. REAL CCTV ACCEPTANCE TEST (OBSERVED)

### 10.1 Script: `scripts/run_real_cctv_acceptance.py`
- Target video: `cam2_parking_bay.mp4` (VIDEO_ID: `vid_cam2_parking_bay_21856a523d79`)
- Expected: CAM-02 → PARKING_LOT role
- Historical metadata: 1280×720, 25 FPS, 374 frames
- Historical OCR: raw="KA05NO1565", normalized="KA05ND1565"
- Historical slot: P02

### 10.2 Validation Steps
1. Health check
2. Camera designation verification
3. State reset (`/prototype/replay/reset`)
4. WebSocket connection (`/integration/ws?channel=events`)
5. Start processing (`POST /videos/{id}/process`)
6. Poll progress until COMPLETED/STOPPED/ERROR
6. Collect REST API results (vehicles, slots, sessions, events)
7. Navigation route lookup
8. Generate JSON report to `evidence/real_cctv/acceptance_test_report.json`

---

## 11. INFERRED (NOT YET VERIFIED)

| Area | Inference | Verification Needed |
|------|-----------|---------------------|
| Docker containers running | Not currently running | `docker compose up` |
| Backend health endpoint | Returns 200 when running | `curl /health` |
| Frontend accessible | Port 3000 in dev, 8080 in prod | Browser test |
| Database migrations | Alembic configured | `alembic upgrade head` |
| Real CCTV processing | Script exists, not run in this session | Execute script |
| Unit tests passing | Historical claim: 176 passing | Run `pytest` in Docker |
| Frontend typecheck | Historical claim: passing | Run `npm run typecheck` |
| Frontend lint | Historical claim: passing | Run `npm run lint` |
| Frontend build | Historical claim: passing | Run `npm run build` |
| Slot geometry accuracy | Spec in docs, not verified in code | Inspect `SlotConfig` |
| Navigation graph | Defined in spec, verify implementation | Check `navigation` module |
| OCR provenance tracking | Code stores raw/normalized, verify UI | Check `VehicleDrawer` |
| WebSocket reconnection | Not inspected | Test disconnect/reconnect |

---

## 12. UNKNOWN

| Area | Question |
|------|----------|
| Current Docker container status | Need `docker ps` |
| Existing data in SQLite DB | Need to query `parktwin.db` |
| ML model download status | Models download at runtime |
| PaddleOCR/EasyOCR cache state | Need to check volumes |
| Real video metadata (measured) | Need OpenCV inspection |
| Frontend route mapping | Need to verify all routes work |
| Authentication state | Dev token in localStorage |
| CORS configuration | `allow_origins=[\"*\"]` in app.py |

---

## 13. CRITICAL ISSUES TO VERIFY

1. **Docker Compose startup** — Both backend and frontend containers healthy
2. **Database persistence** — SQLite survives container restart (named volume)
3. **Model downloads** — YOLO/PaddleOCR weights download on first run
4. **Real CCTV processing** — `cam2_parking_bay.mp4` processes end-to-end
5. **Slot assignment accuracy** — Geometric mapping produces correct P01-P10
6. **WebSocket events** — Real-time events received by frontend
7. **Navigation routing** — Dijkstra returns valid paths
8. **Frontend build** — Next.js production build succeeds
9. **No hardcoded runtime state** — No fallback "P02", "KA05ND1565" in acceptance
10. **OCR provenance** — Raw vs normalized plates displayed separately

---

## 14. NEXT ACTIONS (BASELINE PHASE)

1. Start Docker hot-dev environment: `docker compose -f docker/compose/docker-compose.hotdev.yml up -d`
2. Wait for health checks (backend: 90s start_period, frontend: 30s)
3. Verify backend `/health` and `/health/db`
4. Verify frontend loads at `http://localhost:3000`
5. Run backend unit tests inside container: `docker exec parktwin-dev pytest tests/unit -v`
6. Run backend integration tests: `docker exec parktwin-dev pytest tests/integration -v`
7. Run frontend typecheck: `docker exec parktwin-web-dev npm run typecheck`
8. Run frontend lint: `docker exec parktwin-web-dev npm run lint`
9. Run frontend build: `docker exec parktwin-web-dev npm run build`
10. Execute real CCTV acceptance script
11. Record all outputs in `baseline/`