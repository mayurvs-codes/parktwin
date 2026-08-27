"""
ParkTwin AI — API Dependencies
===============================
Provides shared FastAPI dependencies, including the database session,
active AI pipeline instance, and Frame Processor singleton.
"""

from typing import Generator
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db as db_generator
from engine.pipeline import ParkTwinPipeline
from engine.frame_processor import FrameProcessor

# Singleton instances of the AI components
_pipeline_instance = ParkTwinPipeline()
_frame_processor_instance = FrameProcessor()


async def get_db() -> Generator[AsyncSession, None, None]:
    """Dependency injection wrapper for database sessions."""
    async for session in db_generator():
        yield session


def get_pipeline() -> ParkTwinPipeline:
    """Dependency injection to retrieve the initialized AI pipeline instance."""
    if not _pipeline_instance.is_ready:
        _pipeline_instance.initialize()
    return _pipeline_instance


def get_frame_processor() -> FrameProcessor:
    """Dependency injection to retrieve the frame processor instance."""
    return _frame_processor_instance


# Late import kept at the bottom to avoid a module-load cycle: the integration
# registry imports API dependencies (``get_db``) above, so importing it here,
# after the locals are defined, is safe. This is the sanctioned cross-layer
# wiring point (PROJECT_MEMORY.md §10) — routers resolve the Module 3
# IntegrationService through this accessor rather than importing M3 directly.
def get_integration_service():  # noqa: D401 - accessor, not a factory
    """Return the process-wide IntegrationService (Module 3 orchestrator)."""
    from modules.integration_layer.services.registry import get_integration_service as _get

    return _get()


# ── Authentication Exports ───────────────────────────────────────────────────
from backend.auth.dependencies import (
    get_current_user,
    get_admin_only as require_admin,
    get_viewer_or_above as require_viewer,
)

__all__ = [
    "get_db",
    "get_pipeline",
    "get_frame_processor",
    "get_integration_service",
    "get_current_user",
    "require_admin",
    "require_viewer",
]

