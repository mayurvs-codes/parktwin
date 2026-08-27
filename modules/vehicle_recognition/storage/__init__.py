"""
ParkTwin AI — Vehicle Recognition storage (Module 1)
====================================================
Persistence of vehicle-recognition results. CRUD operations are the business
logic of this capability; the database engine/session and ORM models live in
``backend.database`` and the API schemas in ``backend.schemas``.
"""

from . import crud
from .crud import (
    get_camera,
    get_all_cameras,
    create_camera,
    update_camera_status,
    get_vehicle_by_plate,
    get_vehicle_by_tracking_id,
    create_vehicle,
    update_vehicle,
    create_or_update_vehicle,
    get_all_vehicles,
    log_detection,
)

__all__ = [
    "crud",
    "get_camera",
    "get_all_cameras",
    "create_camera",
    "update_camera_status",
    "get_vehicle_by_plate",
    "get_vehicle_by_tracking_id",
    "create_vehicle",
    "update_vehicle",
    "create_or_update_vehicle",
    "get_all_vehicles",
    "log_detection",
]
