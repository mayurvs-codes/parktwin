"""
Structural API test (ParkTwin AI — full platform)
===================================================
Verifies the FastAPI app wires every module router (health, cameras, vehicles,
parking, integration, analytics, reporting) and that no legacy real-time/
single-module endpoints leak in. No lifespan/model loading is triggered.
"""

import backend.app.app as app_module
from backend.app.app import app


def _routes():
    return {r.path: {m for m in getattr(r, "methods", []) if m not in ("HEAD", "OPTIONS")}
            for r in app.routes if hasattr(r, "path")}


def test_app_imports_cleanly():
    assert app is not None
    assert app.title == "ParkTwin AI API"


def test_module_routes_present():
    """Every implemented module surface is mounted at its documented prefix."""
    routes = _routes()
    for expected in (
        # Health & System
        "/health",
        "/health/db",
        "/health/stats",
        # Cameras
        "/cameras",
        "/cameras/add",
        "/cameras/{camera_id}",
        # Vehicles (Module 1)
        "/vehicles",
        "/vehicles/{vehicle_id}",
        "/vehicles/recognize",
        "/vehicles/process-frame",
        "/vehicles/process-video",
        # Parking Intelligence (Module 2)
        "/parking/slots",
        "/parking/sessions",
        "/parking/events",
        "/parking/occupancy",
        "/parking/statistics",
        # Integration Layer (Module 3)
        "/integration/health",
        "/integration/vehicles",
        "/integration/slots",
        "/integration/sessions",
        "/integration/occupancy",
        "/integration/statistics",
        "/integration/events",
        "/integration/sync",
        "/integration/process-frame",
        "/integration/process-video",
        "/integration/ws",
        # Analytics Engine (Module 4)
        "/analytics/occupancy",
        "/analytics/traffic",
        "/analytics/utilization",
        "/analytics/trends",
        "/analytics/dashboard",
        # Reporting Engine (Module 5)
        "/reports",
        "/reports/history",
        "/reports/generate",
        "/reports/download",
        "/reports/{report_id}",
    ):
        assert expected in routes, f"Missing expected route: {expected}"


def test_realtime_routes_absent():
    """Legacy real-time/MJPEG endpoints from the Module-1 era remain out of scope."""
    routes = _routes()
    for excluded in (
        "/live",
        "/live/{camera_id}",
        "/cameras/{camera_id}/stream",
        "/cameras/{camera_id}/update_frame",
        "/health/gpu",
    ):
        assert excluded not in routes, f"Forbidden real-time route present: {excluded}"


def test_forbidden_routes_absent():
    """Endpoints that are intentionally not part of the platform must not exist."""
    routes = _routes()
    for excluded in (
        "/owners",
        "/digital-twin",
        "/vehicles/reset",
        "/vehicles/find-vehicle",
    ):
        assert excluded not in routes, f"Forbidden route present: {excluded}"


def test_openapi_describes_modules():
    spec = app.openapi()
    assert spec["info"]["title"] == "ParkTwin AI API"
    # Tags are declared per-operation; collect them from the paths.
    tags = set()
    for path_item in spec.get("paths", {}).values():
        for operation in path_item.values():
            tags.update(operation.get("tags", []))
    assert {
        "Cameras",
        "Vehicles",
        "Health & System",
        "Parking Intelligence",
        "Integration Layer",
        "Analytics Engine",
        "Reporting Engine",
    } <= tags
