"""
ParkTwin AI — Analytics API Schemas (Module 4)
==============================================
Typed Pydantic response models for the Analytics Engine (`/analytics` API).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


# ─── Occupancy Analytics Schemas ─────────────────────────────────────────────

class OccupancyTimelinePoint(BaseModel):
    """A single occupancy snapshot point on a timeline."""
    timestamp: Optional[str] = None
    occupancy_percentage: Optional[float] = None
    current_occupancy: Optional[int] = None
    occupied: Optional[int] = None
    free_slots: Optional[int] = None
    free: Optional[int] = None
    reserved_slots: Optional[int] = None


class OccupancyAnalyticsResponse(BaseModel):
    """Response model for `GET /analytics/occupancy`."""
    current_occupancy: Optional[int] = None
    occupancy_percentage: Optional[float] = None
    average_occupancy: Optional[float] = None
    average_occupancy_percentage: Optional[float] = None
    free_slots: Optional[int] = None
    reserved_slots: Optional[int] = None
    unknown_slots: Optional[int] = None
    total_slots: Optional[int] = None
    per_camera: Optional[Dict[str, Any]] = None
    occupancy_timeline: Optional[List[OccupancyTimelinePoint]] = None
    query_start: Optional[str] = None
    query_end: Optional[str] = None


# ─── Traffic Analytics Schemas ───────────────────────────────────────────────

class HourlyTrafficPoint(BaseModel):
    """Hourly traffic breakdown point."""
    hour: Optional[int] = None
    count: Optional[int] = None
    entries: Optional[int] = None
    exits: Optional[int] = None


class TrafficAnalyticsResponse(BaseModel):
    """Response model for `GET /analytics/traffic`."""
    vehicle_entries: Optional[int] = None
    vehicle_exits: Optional[int] = None
    active_vehicles: Optional[int] = None
    peak_hours: Optional[List[Optional[int]]] = None
    peak_hour: Optional[int] = None
    peak_hour_entries: Optional[int] = None
    hourly_traffic: Optional[Union[Dict[Union[int, str], int], List[HourlyTrafficPoint]]] = None
    daily_traffic: Optional[List[Dict[str, Any]]] = None
    vehicle_counts: Optional[Dict[str, int]] = None
    event_crosscheck: Optional[Dict[str, int]] = None
    query_start: Optional[str] = None
    query_end: Optional[str] = None


# ─── Utilization Analytics Schemas ───────────────────────────────────────────

class SlotUsage(BaseModel):
    """Slot usage item for most/least used slots."""
    slot_id: Optional[Union[str, int]] = None
    usage_count: Optional[int] = None
    utilization_percentage: Optional[float] = None


class UtilizationAnalyticsResponse(BaseModel):
    """Response model for `GET /analytics/utilization`."""
    slot_utilization: Optional[float] = None
    slot_utilization_percentage: Optional[float] = None
    used_slots: Optional[int] = None
    total_slots: Optional[int] = None
    average_parking_duration_seconds: Optional[float] = None
    average_parking_duration: Optional[str] = None
    turnover_rate: Optional[float] = None
    most_used_slots: Optional[List[SlotUsage]] = None
    least_used_slots: Optional[List[SlotUsage]] = None
    statistics_crosscheck: Optional[Dict[str, Any]] = None
    query_start: Optional[str] = None
    query_end: Optional[str] = None


# ─── Trends Analytics Schemas ────────────────────────────────────────────────

class TrafficTimelinePoint(BaseModel):
    """A single traffic snapshot point on a timeline."""
    timestamp: Optional[str] = None
    vehicle_entries: Optional[int] = None
    vehicle_exits: Optional[int] = None
    active_vehicles: Optional[int] = None


class TrendsAnalyticsResponse(BaseModel):
    """Response model for `GET /analytics/trends`."""
    occupancy_timeline: Optional[List[OccupancyTimelinePoint]] = None
    traffic_timeline: Optional[List[TrafficTimelinePoint]] = None
    session_statistics: Optional[Dict[str, Any]] = None
    duration_statistics: Optional[Dict[str, Any]] = None
    query_start: Optional[str] = None
    query_end: Optional[str] = None
    generated_at: Optional[str] = None


# ─── Analytics Dashboard Schemas ─────────────────────────────────────────────

class AnalyticsDashboardResponse(BaseModel):
    """Response model for `GET /analytics/dashboard`."""
    occupancy: Optional[OccupancyAnalyticsResponse] = None
    traffic: Optional[TrafficAnalyticsResponse] = None
    utilization: Optional[UtilizationAnalyticsResponse] = None
    trends: Optional[TrendsAnalyticsResponse] = None
    query_start: Optional[str] = None
    query_end: Optional[str] = None
    generated_at: Optional[str] = None



__all__ = [
    "OccupancyTimelinePoint",
    "OccupancyAnalyticsResponse",
    "HourlyTrafficPoint",
    "TrafficAnalyticsResponse",
    "SlotUsage",
    "UtilizationAnalyticsResponse",
    "TrafficTimelinePoint",
    "TrendsAnalyticsResponse",
    "AnalyticsDashboardResponse",
]
