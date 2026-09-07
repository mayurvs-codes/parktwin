"""
ParkTwin AI — SQLAlchemy ORM Models (Module 1)
================================================
Defines the database tables needed by Module 1 (Vehicle Recognition & ANPR):

  - cameras        : CCTV camera registry
  - vehicles       : Detected vehicle records
  - detection_logs : Raw AI detection log entries

Tables that belong to later modules (owners, parking_slots, parking_events,
analytics) are intentionally omitted here; they will be added by their
respective modules, keeping each module's responsibility single-purpose.
"""

from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Enum as SAEnum,
    func,
)
from sqlalchemy import Uuid, JSON
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


# ─── Base ─────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


# ─── Enums ────────────────────────────────────────────────────────────────────

class CameraStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    RECONNECTING = "reconnecting"


class CameraRole(str, enum.Enum):
    ENTRY = "ENTRY"
    PARKING_LOT = "PARKING_LOT"
    PATH_PARKING = "PATH_PARKING"
    EXIT = "EXIT"
    UNKNOWN = "UNKNOWN"


# ─── Camera ───────────────────────────────────────────────────────────────────

class Camera(Base):
    """CCTV Camera registry."""

    __tablename__ = "cameras"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    url = Column(Text, nullable=False)              # RTSP / USB index / file path
    zone = Column(String(64), default="general")
    role = Column(String(32), default=CameraRole.UNKNOWN.value, index=True)
    parking_area = Column(String(64), nullable=True)
    slot_group = Column(String(64), nullable=True)
    status = Column(SAEnum(CameraStatus), default=CameraStatus.OFFLINE)
    fps_target = Column(Integer, default=25)
    is_enabled = Column(Boolean, default=True)
    meta = Column(JSON, default={})                 # extra config (resolution, codec…)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    detection_logs = relationship("DetectionLog", back_populates="camera", lazy="dynamic")


# ─── Vehicle ──────────────────────────────────────────────────────────────────

class Vehicle(Base):
    """Detected / known vehicle record."""

    __tablename__ = "vehicles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prototype_id = Column(String(32), nullable=True, index=True)
    license_plate = Column(String(32), nullable=True, index=True)
    plate_confidence = Column(Float, default=0.0)
    vehicle_type = Column(String(64), nullable=True)     # suv | sedan | hatchback …
    brand = Column(String(64), nullable=True)            # Toyota | Honda …
    model = Column(String(64), nullable=True)
    color = Column(String(32), nullable=True)
    color_confidence = Column(Float, default=0.0)
    status = Column(String(32), default="parked")
    tracking_id = Column(Integer, nullable=True, index=True)  # ByteTrack ID
    bounding_box = Column(JSON, nullable=True)          # {x1,y1,x2,y2}
    detection_confidence = Column(Float, default=0.0)
    is_registered = Column(Boolean, default=False)        # found in owners table
    snapshots = Column(JSON, default=[])                # list of snapshot paths
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    detection_logs = relationship("DetectionLog", back_populates="vehicle")


# ─── Detection Log ────────────────────────────────────────────────────────────

class DetectionLog(Base):
    """Raw detection event logged by the AI pipeline."""

    __tablename__ = "detection_logs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(Uuid(as_uuid=True), ForeignKey("cameras.id"), nullable=True)
    vehicle_id = Column(Uuid(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    tracking_id = Column(Integer, nullable=True)
    frame_number = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    detection_type = Column(String(32))              # vehicle | plate | classification
    detected_class = Column(String(64))
    confidence = Column(Float)
    bounding_box = Column(JSON)
    license_plate_raw = Column(String(32), nullable=True)
    license_plate_confidence = Column(Float, nullable=True)
    ocr_engine = Column(String(32), nullable=True)
    inference_time_ms = Column(Float, nullable=True)
    meta = Column(JSON, default={})

    # Relationships
    camera = relationship("Camera", back_populates="detection_logs")
    vehicle = relationship("Vehicle", back_populates="detection_logs")


# ─── Vehicle Journey (3-Camera Lifecycle) ────────────────────────────────────

class JourneyStatus(str, enum.Enum):
    ENTERING = "entering"
    PARKED = "parked"
    EXITED = "exited"


class VehicleJourney(Base):
    """End-to-end vehicle journey across Entry, Parking, and Exit cameras."""

    __tablename__ = "vehicle_journeys"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    license_plate = Column(String(32), nullable=False, index=True)
    vehicle_type = Column(String(64), default="Vehicle")
    color = Column(String(32), default="Unknown")
    brand = Column(String(64), default="Unknown")
    vehicle_snapshot_path = Column(String(256), nullable=True)

    # Entry camera details
    entry_time = Column(DateTime(timezone=True), nullable=True)
    entry_camera_id = Column(String(64), nullable=True)
    entry_confidence = Column(Float, default=0.0)

    # Parking camera details
    parked_at = Column(DateTime(timezone=True), nullable=True)
    parking_camera_id = Column(String(64), nullable=True)
    parking_slot = Column(String(32), nullable=True)  # e.g., "A-01"

    # Exit camera details
    exit_time = Column(DateTime(timezone=True), nullable=True)
    exit_camera_id = Column(String(64), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Lifecycle state: entering -> parked -> exited
    status = Column(String(32), default="entering", index=True)
    meta = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Video File Registry ──────────────────────────────────────────────────────

class Video(Base):
    """CCTV Video file registry and processing state."""

    __tablename__ = "videos"

    id = Column(String(64), primary_key=True)               # unique file hash or slug
    filename = Column(String(256), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    date = Column(String(32), index=True)                    # e.g., "27-Aug-2026"
    camera_id = Column(String(64), nullable=True, index=True)# associated camera ID
    duration_seconds = Column(Float, default=0.0)
    fps = Column(Float, default=25.0)
    resolution = Column(String(32), default="1280x720")
    file_size_bytes = Column(Integer, default=0)
    processing_status = Column(String(32), default="IDLE", index=True) # IDLE, PROCESSING, COMPLETED, STOPPED, ERROR
    processed_at = Column(DateTime(timezone=True), nullable=True)
    meta = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Camera Designation Audit ─────────────────────────────────────────────────

class CameraDesignation(Base):
    """Audit log of camera role designations."""

    __tablename__ = "camera_designations"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id = Column(String(64), nullable=False, index=True)
    role = Column(String(32), nullable=False)               # ENTRY, PARKING_LOT, EXIT, UNKNOWN
    parking_area = Column(String(64), nullable=True)
    slot_group = Column(String(64), nullable=True)
    coverage_meta = Column(JSON, default={})
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())


