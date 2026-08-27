"""
ParkTwin AI — Integration Service Registry
=========================================
Process-wide singleton accessor for the :class:`IntegrationService`, plus a
FastAPI dependency that lazily ensures Module 2 is bootstrapped.

``make_integration_service`` is exported so tests can build a *fresh* service
(with a clean engine/mapper) and install it via ``reset_integration_service``.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from backend.api.dependencies import get_db

from shared.helpers.registry import make_singleton
from ..events.factory import get_event_bus
from ..websocket.manager import manager
from ..sync import Synchronizer
from .integration_service import IntegrationService


def _create_integration_service() -> IntegrationService:
    """Construct a default IntegrationService (fresh engine + in-memory bus)."""
    return IntegrationService(
        event_bus=get_event_bus(),
        ws_manager=manager,
        synchronizer=Synchronizer(),
    )


make_integration_service, get_integration_service, reset_integration_service = make_singleton(_create_integration_service)


async def get_integration_service_dep(
    db: AsyncSession = Depends(get_db),
) -> IntegrationService:
    """FastAPI dependency: the singleton service, with Module 2 bootstrapped."""
    svc = get_integration_service()
    await svc.ensure_initialized(db)
    return svc
