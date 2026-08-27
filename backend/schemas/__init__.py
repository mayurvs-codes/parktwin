"""
ParkTwin AI — Pydantic Schemas (API serialization) — Module 1
==============================================================
Request / Response models for the Module 1 endpoints.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Camera Schemas ───────────────────────────────────────────────────────────

class CameraBase(BaseModel):
    camera_id: str
    name: str
    url: Any
    zone: str = "general"
    fps_target: int = 25
    is_enabled: bool = True


class CameraCreate(CameraBase):
    pass


class CameraResponse(CameraBase):
    id: UUID
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Vehicle Schemas ──────────────────────────────────────────────────────────

class VehicleBase(BaseModel):
    license_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None


class VehicleResponse(VehicleBase):
    id: UUID
    tracking_id: Optional[int] = None
    plate_confidence: float
    detection_confidence: float
    color_confidence: float
    is_registered: bool
    last_seen: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Detection Log Schema ─────────────────────────────────────────────────────

class DetectionLogResponse(BaseModel):
    id: UUID
    tracking_id: Optional[int] = None
    timestamp: datetime
    detection_type: str
    detected_class: str
    confidence: float
    license_plate_raw: Optional[str] = None
    license_plate_confidence: Optional[float] = None
    inference_time_ms: Optional[float] = None

    model_config = {"from_attributes": True}


# ─── Live Detection Event (WebSocket) ─────────────────────────────────────────

class LiveDetectionEvent(BaseModel):
    """Real-time event broadcast over WebSocket."""
    event_type: str                         # detection | entry | exit | update
    slot: Optional[str] = None
    occupied: bool = False
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    entry_time: Optional[str] = None
    duration: Optional[str] = None
    camera: Optional[str] = None
    confidence: Optional[float] = None
    tracking_id: Optional[int] = None
    bounding_box: Optional[Dict[str, float]] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── Recognition Request ──────────────────────────────────────────────────────

class RecognizeRequest(BaseModel):
    """POST /recognize — submit a base64 image for immediate recognition."""
    image_base64: str
    camera_id: Optional[str] = None
    enhance: bool = True


class RecognizeResponse(BaseModel):
    success: bool
    vehicles: List[Dict[str, Any]] = []
    inference_time_ms: float
    frame_id: Optional[str] = None


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str
    redis: str
    gpu: Optional[Dict[str, Any]] = None
    active_cameras: int
    uptime_seconds: float


# ─── Error Schema ─────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    """Shared error response schema."""
    detail: str
    code: str = "ERROR"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ─── Settings Schemas ─────────────────────────────────────────────────────────

class AppPublicSettings(BaseModel):
    name: str
    version: str
    environment: str
    debug: bool


class ApiPublicSettings(BaseModel):
    host: str
    port: int
    cors_origins: List[str]


class ModelsPublicSettings(BaseModel):
    device: str
    confidence_threshold: float
    tracking_algorithms: List[str]


class ParkingPublicSettings(BaseModel):
    max_session_duration_hours: int
    violation_threshold_minutes: int
    camera_ids: List[str]


class LoggingPublicSettings(BaseModel):
    level: str
    format: str


class PublicSettings(BaseModel):
    app: AppPublicSettings
    api: ApiPublicSettings
    models: ModelsPublicSettings
    parking: ParkingPublicSettings
    logging: LoggingPublicSettings


class HealthExtendedResponse(BaseModel):
    status: str
    version: str
    environment: str
    device: str
    camera_count: int
    database: str
    active_cameras: int
    pipeline_ready: bool


