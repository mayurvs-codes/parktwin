"""
Prometheus custom business metrics for Module 3 (Integration Layer).
"""

from prometheus_client import Counter, Gauge, Histogram

# Occupancy rate per camera (0.0 to 1.0)
parking_occupancy_rate = Gauge(
    "parktwin_parking_occupancy_rate",
    "Parking occupancy rate (0.0 to 1.0) per camera",
    ["camera_id"],
)

# Total vehicles detected counter per camera
vehicles_detected_total = Counter(
    "parktwin_vehicles_detected_total",
    "Total count of vehicles detected per camera",
    ["camera_id"],
)

# Frame processing duration histogram
frame_processing_duration = Histogram(
    "parktwin_frame_processing_duration_seconds",
    "Time spent processing a video frame in seconds",
)


def record_frame_processing_duration(seconds: float) -> None:
    """Record frame processing duration in histogram."""
    frame_processing_duration.observe(seconds)


def record_vehicles_detected(camera_id: str, count: int = 1) -> None:
    """Increment vehicle detection counter for a camera."""
    if count > 0:
        vehicles_detected_total.labels(camera_id=camera_id).inc(count)


def set_parking_occupancy_rate(camera_id: str, rate: float) -> None:
    """Set occupancy rate gauge for a camera."""
    parking_occupancy_rate.labels(camera_id=camera_id).set(rate)
