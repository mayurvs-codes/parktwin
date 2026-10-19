"""
ParkTwin AI — Module 2 ORM Models (Parking Intelligence)
============================================================
SQLAlchemy tables owned by Module 2. They register against the SAME
``Base`` as Module 1 (``backend.database.models``) so a single
``Base.metadata.create_all`` provisions every table, but the definitions
live here to keep each module's data model single-purpose.

  - parking_slots    : physical slot registry + live occupancy state
  - parking_sessions : a vehicle's stay in a slot (entry/exit/duration)
  - parking_events    : immutable lifecycle events for analytics
"""

from __future__ import annotations

import enum
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
    JSON,
    Enum as SAEnum,
    UniqueConstraint,
    func,
)
from sqlalchemy import Uuid

from backend.database.models import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class SlotState(str, enum.Enum):
    """Occupancy state of a single parking slot."""

    FREE = "free"
    OCCUPIED = "occupied"      # spec spelling preserved: OCCUPIED
    RESERVED = "reserved"
    UNKNOWN = "unknown"


# ─── Parking Slot ─────────────────────────────────────────────────────────────

class ParkingSlot(Base):
    """Physical parking slot + its current occupancy state."""

    __tablename__ = "parking_slots"
    __table_args__ = (
        UniqueConstraint("slot_id", "camera_id", name="uq_slot_camera"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slot_id = Column(String(32), nullable=False, index=True)
    camera_id = Column(String(64), nullable=False, index=True)
    zone = Column(String(64), default="general")
    state = Column(SAEnum(SlotState), default=SlotState.UNKNOWN)
    is_reserved = Column(Boolean, default=False)
    reserved_for = Column(String(128), nullable=True)
    # Normalized slot footprint {x1,y1,x2,y2}; null when unknown.
    position = Column(JSON, nullable=True)
    meta = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Parking Session ──────────────────────────────────────────────────────────

class ParkingSession(Base):
    """A vehicle's continuous stay in a slot."""

    __tablename__ = "parking_sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_uid = Column(String(64), unique=True, nullable=False, index=True)
    camera_id = Column(String(64), nullable=False, index=True)
    slot_id = Column(String(32), nullable=True, index=True)
    vehicle_id = Column(Uuid(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    license_plate = Column(String(32), nullable=True, index=True)
    tracking_id = Column(Integer, nullable=True, index=True)
    entry_time = Column(DateTime(timezone=True), nullable=False)
    exit_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    violation_flags = Column(JSON, default=[])
    meta = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Parking Event ─────────────────────────────────────────────────────────────

class ParkingEvent(Base):
    """Immutable lifecycle event emitted by the engine."""

    __tablename__ = "parking_events"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_uid = Column(String(64), unique=True, nullable=False, index=True)
    event_type = Column(String(48), nullable=False, index=True)
    camera_id = Column(String(64), nullable=True, index=True)
    slot_id = Column(String(32), nullable=True, index=True)
    vehicle_id = Column(Uuid(as_uuid=True), nullable=True)
    tracking_id = Column(Integer, nullable=True, index=True)
    license_plate = Column(String(32), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    meta = Column(JSON, default={})


# ─── Violation Episode (Phase 3) ──────────────────────────────────────────────

class ViolationEpisode(Base):
    """Tracks a vehicle's wrong-bay or policy violation episode."""

    __tablename__ = "violation_episodes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    episode_id = Column(String(64), unique=True, nullable=False, index=True)
    vehicle_id = Column(String(64), nullable=True, index=True)
    license_plate = Column(String(32), nullable=True, index=True)
    assigned_bay = Column(String(32), nullable=True)
    actual_bay = Column(String(32), nullable=False, index=True)
    state = Column(String(32), default="WARNED")  # WARNED | ESCALATED | RESOLVED
    resolution_reason = Column(String(64), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    source = Column(String(32), default="live")
    meta = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
