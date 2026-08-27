"""
ParkTwin AI — Health & System Router
=====================================
Service health, database connectivity, and pipeline statistics. GPU monitoring
is out of scope. The event bus (Integration Layer) is env-selectable
(``INTEGRATION_EVENT_BUS=memory|redis``) and reported truthfully below.
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, get_pipeline, get_frame_processor, require_viewer
from backend.core.config import get_settings

router = APIRouter(prefix="/health", tags=["Health & System"])

# Process start time (set once at import) for uptime reporting.
_START_TIME = time.time()


@router.get("", response_model=Dict[str, Any])
async def health_check(
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    fp=Depends(get_frame_processor),
) -> Dict[str, Any]:
    """Overall service health: version, DB, active cameras, uptime."""

    settings = get_settings()
    try:
        await db.execute(text("SELECT 1"))
        database = "connected"
    except Exception:
        database = "disconnected"

    bus_kind = os.getenv("INTEGRATION_EVENT_BUS", "memory").lower()
    
    # Model statuses
    type_stat = "ready (deep_learning)" if getattr(pipeline, "_type_classifier", None) and getattr(pipeline._type_classifier, "is_loaded", False) else ("ready (yolo_mapping)" if getattr(pipeline, "_type_classifier", None) else "unavailable")
    brand_stat = "ready (deep_learning)" if getattr(pipeline, "_brand_classifier", None) and getattr(pipeline._brand_classifier, "is_loaded", False) else ("ready (heuristic)" if getattr(pipeline, "_brand_classifier", None) else "unavailable")

    models_status = {
        "vehicle_detector": "ready" if getattr(pipeline, "_detector", None) and pipeline._detector._model is not None else "degraded",
        "plate_detector": "ready (classical_fallback)" if getattr(pipeline, "_plate_detector", None) and getattr(pipeline._plate_detector, "_use_classical_fallback", False) else ("ready" if getattr(pipeline, "_plate_detector", None) and getattr(pipeline._plate_detector, "_model", None) else "unavailable"),
        "ocr_engine": "ready" if getattr(pipeline, "_ocr", None) and (getattr(pipeline._ocr, "_paddle", None) is not None or getattr(pipeline._ocr, "_easyocr", None) is not None) else "unavailable",
        "type_classifier": type_stat,
        "brand_classifier": brand_stat,
    }

    return {
        "status": "healthy" if database == "connected" else "degraded",
        "version": settings.app.version,
        "environment": settings.app.environment,
        "database": database,
        "event_bus": bus_kind,
        "gpu": "disabled",
        "active_cameras": fp.active_cameras,
        "uptime_seconds": round(time.time() - _START_TIME, 1),
        "pipeline_ready": pipeline.is_ready,
        "models": models_status,
    }


@router.get("/models", response_model=Dict[str, Any])
async def health_models(
    pipeline=Depends(get_pipeline),
) -> Dict[str, Any]:
    """Detailed model status endpoint."""
    settings = get_settings()
    return {
        "pipeline_ready": pipeline.is_ready,
        "vehicle_detector": {
            "loaded": getattr(pipeline, "_detector", None) is not None and pipeline._detector._model is not None,
            "model_name": getattr(getattr(settings, "models", None), "detector", None).name if hasattr(settings, "models") else "yolov8m",
        },
        "plate_detector": {
            "loaded": getattr(pipeline, "_plate_detector", None) is not None,
            "mode": "classical_contour" if getattr(getattr(pipeline, "_plate_detector", None), "_use_classical_fallback", True) else "yolo_deep_learning",
        },
        "ocr": {
            "engine": settings.ocr.engine if hasattr(settings, "ocr") else "paddleocr",
            "loaded": getattr(pipeline, "_ocr", None) is not None,
        },
    }


@router.get("/db", response_model=Dict[str, Any])
async def health_db(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Verify database connectivity with a trivial query."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


@router.get("/stats", response_model=Dict[str, Any])
async def health_stats(
    pipeline=Depends(get_pipeline),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Internal pipeline + tracker statistics + telemetry."""
    stats = pipeline.get_stats()

    from prometheus_client import REGISTRY
    request_count = 0
    error_count = 0
    try:
        for metric in REGISTRY.collect():
            if "http_request" in metric.name:
                for sample in metric.samples:
                    if sample.name.endswith("_total"):
                        request_count += int(sample.value)
                        status_str = str(sample.labels.get("status", ""))
                        if status_str.startswith(("4", "5")):
                            error_count += int(sample.value)
    except Exception:
        pass

    stats["uptime_seconds"] = round(time.time() - _START_TIME, 1)
    stats["request_count_last_minute"] = request_count
    stats["error_count_last_minute"] = error_count
    return stats

