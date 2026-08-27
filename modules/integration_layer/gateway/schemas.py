"""
ParkTwin AI — Gateway Schemas (Integration Layer)
=============================================
Unified request/response DTOs exposed by the integration gateway. These are
independent of the per-module schemas: clients consume the integration
vocabulary, not the internal Module 1/2 models.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, RootModel


# ─── Live / read DTOs ───────────────────────────────────────────────────────

class GatewayVehicle(BaseModel):
    id: Optional[str] = None
    license_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    tracking_id: Optional[int] = None
    plate_confidence: float = 0.0
    detection_confidence: float = 0.0
    color_confidence: float = 0.0
    is_registered: bool = False
    last_seen: Optional[str] = None
    created_at: Optional[str] = None


class GatewaySlot(BaseModel):
    id: Optional[str] = None
    slot_id: str
    camera_id: str
    zone: str = "general"
    state: Optional[str] = None
    is_reserved: bool = False
    reserved_for: Optional[str] = None
    position: Optional[Any] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class GatewaySession(BaseModel):
    session_uid: Optional[str] = None
    camera_id: Optional[str] = None
    slot_id: Optional[str] = None
    license_plate: Optional[str] = None
    tracking_id: Optional[int] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    duration_seconds: float = 0.0
    is_active: bool = True
    violation_flags: List[str] = []


class GatewayEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    camera_id: Optional[str] = None
    payload: Dict[str, Any] = {}


class GatewayOccupancy(BaseModel):
    total_slots: int = 0
    free: int = 0
    occupied: int = 0
    reserved: int = 0
    unknown: int = 0
    occupancy_rate: float = 0.0
    per_camera: Dict[str, Any] = {}


# ─── Response List Wrappers ──────────────────────────────────────────────────

class VehicleListResponse(RootModel[List[GatewayVehicle]]):
    """Response list wrapper for `/integration/vehicles`."""
    pass


class SlotListResponse(RootModel[List[GatewaySlot]]):
    """Response list wrapper for `/integration/slots`."""
    pass


class SessionListResponse(RootModel[List[GatewaySession]]):
    """Response list wrapper for `/integration/sessions`."""
    pass


class EventListResponse(BaseModel):
    """Response envelope for `/integration/events`."""
    source: str = "integration"
    events: List[GatewayEvent] = Field(default_factory=list)
    counts_by_type: Optional[Dict[str, int]] = None


class StatisticsResponse(BaseModel):
    """Aggregate parking statistics response for `/integration/statistics`."""
    active_sessions: int = 0
    total_sessions: int = 0
    closed_sessions: int = 0
    average_duration_seconds: float = 0.0
    average_duration: str = "00:00:00"
    max_duration_seconds: float = 0.0
    max_duration: str = "00:00:00"
    events: Dict[str, int] = Field(default_factory=dict)
    total_events: int = 0
    top_plates: List[Dict[str, Any]] = Field(default_factory=list)
    violations: Dict[str, int] = Field(default_factory=dict)


# ─── Request DTOs ───────────────────────────────────────────────────────────

class ProcessFrameRequest(BaseModel):
    image_base64: str
    camera_id: str = "camera_01"
    frame_id: int = 0


# ─── Health / meta ──────────────────────────────────────────────────────────

class GatewayHealth(BaseModel):
    status: str = "ok"
    integration: str = "ok"
    parking_engine_initialized: bool = False
    event_bus: str = "InMemoryEventBus"
    event_counts: Dict[str, int] = {}
    websocket_subscribers: Dict[str, int] = {}
    occupancy: GatewayOccupancy = Field(default_factory=GatewayOccupancy)


__all__ = [
    "GatewayVehicle",
    "GatewaySlot",
    "GatewaySession",
    "GatewayEvent",
    "GatewayOccupancy",
    "VehicleListResponse",
    "SlotListResponse",
    "SessionListResponse",
    "EventListResponse",
    "StatisticsResponse",
    "ProcessFrameRequest",
    "GatewayHealth",
]
