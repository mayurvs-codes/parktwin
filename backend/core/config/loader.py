"""
ParkTwin AI — Configuration Loader
===================================
Loads settings from YAML + environment variable overrides.
Uses Pydantic v2 for validation and type safety.

The YAML file is resolved from the repository root (``configs/settings.yaml``),
falling back to a local copy next to this file if the repo layout differs.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present (from current working directory upward)
load_dotenv()

# ─── Config file location ─────────────────────────────────────────────────────
# backend/core/config/loader.py  →  parents[3] is the repository root.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_SETTINGS_FILE = _PROJECT_ROOT / "configs" / "settings.yaml"
if not _SETTINGS_FILE.exists():
    # Fallback: sibling settings.yaml inside the package (editable install)
    _SETTINGS_FILE = Path(__file__).parent / "settings.yaml"


def _load_yaml(path: Path) -> Dict[str, Any]:
    """Load and parse a YAML configuration file."""
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# ─── Sub-models ───────────────────────────────────────────────────────────────

class AppConfig(BaseModel):
    name: str = "ParkTwin AI"
    version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False
    secret_key: str = "changeme"


class APIConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    reload: bool = False
    cors_origins: List[str] = ["*"]
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"


class DatabaseConfig(BaseModel):
    url: str = "sqlite+aiosqlite:///./parktwin.db"
    echo: bool = False


class RedisConfig(BaseModel):
    url: str = "redis://localhost:6379/0"
    max_connections: int = 50


class DetectorModelConfig(BaseModel):
    name: str = "yolov8m"
    weights_path: str = "models/vehicle_detection/yolov8m.pt"
    device: str = "auto"
    confidence_threshold: float = 0.45
    iou_threshold: float = 0.45
    input_size: int = 640
    half_precision: bool = False


class PlateDetectorConfig(BaseModel):
    weights_path: str = "models/plate_detection/plate_detector.pt"
    confidence_threshold: float = 0.40
    iou_threshold: float = 0.45
    input_size: int = 640
    device: str = "auto"


class ClassifierModelConfig(BaseModel):
    weights_path: str = "models/vehicle_classification/vehicle_classifier.pt"
    device: str = "auto"
    confidence_threshold: float = 0.60
    num_classes: int = 30


class ModelsConfig(BaseModel):
    detector: DetectorModelConfig = DetectorModelConfig()
    plate_detector: PlateDetectorConfig = PlateDetectorConfig()
    classifier: ClassifierModelConfig = ClassifierModelConfig()


class TrackingConfig(BaseModel):
    algorithm: str = "bytetrack"
    track_high_thresh: float = 0.5
    track_low_thresh: float = 0.1
    new_track_thresh: float = 0.6
    track_buffer: int = 30
    match_thresh: float = 0.8
    min_box_area: float = 100.0


class EnhancementConfig(BaseModel):
    super_resolution: bool = False
    clahe: bool = True
    clahe_clip_limit: float = 2.0
    clahe_tile_grid: int = 8
    sharpening: bool = True
    denoising: bool = True
    perspective_correction: bool = True


class OCRConfig(BaseModel):
    engine: str = "paddleocr"
    language: str = "en"
    use_gpu: bool = False
    use_angle_cls: bool = True
    det_db_thresh: float = 0.3
    rec_char_dict_path: Optional[str] = None
    confidence_threshold: float = 0.70
    fallback_engine: str = "easyocr"
    enhancement: EnhancementConfig = EnhancementConfig()


class ColorRange(BaseModel):
    name: str
    hsv_lower: List[int]
    hsv_upper: List[int]


class ColorDetectionConfig(BaseModel):
    colors: List[ColorRange] = []


class CameraSource(BaseModel):
    id: str
    name: str
    url: Any  # int (webcam index) or str (RTSP URL)
    enabled: bool = True
    fps_target: int = 25
    zone: str = "general"
    parking_slots: List[str] = []


class CamerasConfig(BaseModel):
    max_concurrent: int = 8
    frame_skip: int = 2
    reconnect_delay: int = 5
    sources: List[CameraSource] = []


class ParkingConfig(BaseModel):
    total_slots: int = 100
    slot_prefix: str = "P"
    auto_assign: bool = True
    max_duration_hours: int = 24
    # Optional per-camera slot geometry: camera_id -> {slot_id: [x1,y1,x2,y2]}.
    layout: Dict[str, Dict[str, List[float]]] = {}


class StorageConfig(BaseModel):
    snapshots_dir: str = "snapshots"
    logs_dir: str = "logs"
    weights_dir: str = "models"
    datasets_dir: str = "datasets"
    max_snapshot_age_days: int = 30


class LoggingConfig(BaseModel):
    level: str = "INFO"
    format: str = "json"
    file: str = "logs/parktwin.log"
    max_size_mb: int = 100
    backup_count: int = 5
    log_detections: bool = True
    log_ocr: bool = True
    log_tracking: bool = True
    log_api: bool = True
    log_gpu: bool = True


class VehicleClassesConfig(BaseModel):
    yolo_vehicle_ids: List[int] = [2, 3, 5, 7]
    custom_classes: List[str] = []


# ─── Main Settings Class ──────────────────────────────────────────────────────

class Settings(BaseModel):
    """Root settings model combining all sub-configs."""
    app: AppConfig = AppConfig()
    api: APIConfig = APIConfig()
    database: DatabaseConfig = DatabaseConfig()
    redis: RedisConfig = RedisConfig()
    models: ModelsConfig = ModelsConfig()
    tracking: TrackingConfig = TrackingConfig()
    ocr: OCRConfig = OCRConfig()
    color_detection: ColorDetectionConfig = ColorDetectionConfig()
    vehicle_classes: VehicleClassesConfig = VehicleClassesConfig()
    vehicle_brands: List[str] = []
    cameras: CamerasConfig = CamerasConfig()
    parking: ParkingConfig = ParkingConfig()
    storage: StorageConfig = StorageConfig()
    logging: LoggingConfig = LoggingConfig()

    # ── Allow env overrides ──────────────────────────────────────────
    @classmethod
    def from_yaml(cls, path: Path = _SETTINGS_FILE) -> "Settings":
        """Load settings from YAML file with env variable overrides."""
        data = _load_yaml(path)

        # Environment variable overrides (highest priority)
        if db_url := os.getenv("DATABASE_URL"):
            data.setdefault("database", {})["url"] = db_url
        if redis_url := os.getenv("REDIS_URL"):
            data.setdefault("redis", {})["url"] = redis_url
        if secret_key := os.getenv("SECRET_KEY"):
            data.setdefault("app", {})["secret_key"] = secret_key
        if log_level := os.getenv("LOG_LEVEL"):
            data.setdefault("logging", {})["level"] = log_level
        if env := os.getenv("ENVIRONMENT"):
            data.setdefault("app", {})["environment"] = env

        return cls(**data)

    def get_device(self, device_str: str = "auto") -> str:
        """Resolve 'auto' to the best available device."""
        if device_str != "auto":
            return device_str
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        return "cpu"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached Settings instance (loaded once at startup)."""
    return Settings.from_yaml()
