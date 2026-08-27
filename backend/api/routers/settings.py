"""
ParkTwin AI — Settings Router
==============================
Safe, read-only endpoint exposing platform configuration to viewers
without revealing sensitive keys, credentials, or internal secrets.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, get_frame_processor, get_pipeline, require_viewer
from backend.core.config import get_settings
from backend.schemas import (
    ApiPublicSettings,
    AppPublicSettings,
    HealthExtendedResponse,
    LoggingPublicSettings,
    ModelsPublicSettings,
    ParkingPublicSettings,
    PublicSettings,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/public", response_model=PublicSettings)
async def get_public_settings(
    _user=Depends(require_viewer),
) -> PublicSettings:
    """Return safe public platform settings (read-only, no credentials)."""
    settings = get_settings()

    camera_ids = [c.id for c in settings.cameras.sources]

    return PublicSettings(
        app=AppPublicSettings(
            name=settings.app.name,
            version=settings.app.version,
            environment=settings.app.environment,
            debug=settings.app.debug,
        ),
        api=ApiPublicSettings(
            host=settings.api.host,
            port=settings.api.port,
            cors_origins=list(settings.api.cors_origins),
        ),
        models=ModelsPublicSettings(
            device=settings.get_device(settings.models.detector.device),
            confidence_threshold=settings.models.detector.confidence_threshold,
            tracking_algorithms=[settings.tracking.algorithm],
        ),
        parking=ParkingPublicSettings(
            max_session_duration_hours=settings.parking.max_duration_hours,
            violation_threshold_minutes=30,
            camera_ids=camera_ids,
        ),
        logging=LoggingPublicSettings(
            level=settings.logging.level,
            format=settings.logging.format,
        ),
    )


@router.get("/health-extended", response_model=HealthExtendedResponse)
async def get_health_extended(
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    fp=Depends(get_frame_processor),
    _user=Depends(require_viewer),
) -> HealthExtendedResponse:
    """Extended health endpoint including model device, camera count, and pipeline status."""
    settings = get_settings()

    try:
        await db.execute(text("SELECT 1"))
        database = "connected"
    except Exception:
        database = "disconnected"

    device = settings.get_device(settings.models.detector.device)
    camera_count = len(settings.cameras.sources)

    return HealthExtendedResponse(
        status="healthy" if database == "connected" else "degraded",
        version=settings.app.version,
        environment=settings.app.environment,
        device=device,
        camera_count=camera_count,
        database=database,
        active_cameras=fp.active_cameras,
        pipeline_ready=pipeline.is_ready,
    )
