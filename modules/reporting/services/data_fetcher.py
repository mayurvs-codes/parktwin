"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
DataFetcher — the **single** bridge between report generators and the two
layers Reporting is allowed to consume:

  * the Analytics Engine (Module 4)  -> :class:`AnalyticsService`
  * the Integration Layer (Module 3) -> :class:`IntegrationService`

Generators receive a ``DataFetcher`` and only ever call its methods. They never
import or call Module 1 / Module 2 code, and never touch the database directly.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession


class DataFetcher:
    """Convenience facade over the Analytics + Integration services."""

    def __init__(self, db: AsyncSession, analytics: Any, integration: Any) -> None:
        self.db = db
        self.analytics = analytics
        self.integration = integration

    # ── Integration Layer (Module 3) ──────────────────────────────────────────

    async def occupancy(self, camera_id: Optional[str] = None) -> Dict[str, Any]:
        return await self.integration.occupancy(self.db, camera_id=camera_id)

    async def slots(
        self, camera_id: Optional[str] = None, state: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return await self.integration.list_slots(self.db, camera_id=camera_id, state=state)

    async def sessions(
        self,
        *,
        active_only: bool = False,
        camera_id: Optional[str] = None,
        plate: Optional[str] = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        return await self.integration.list_sessions(
            self.db, active_only=active_only, camera_id=camera_id, plate=plate, limit=limit
        )

    async def vehicles(
        self, skip: int = 0, limit: int = 200, plate: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return await self.integration.list_vehicles(self.db, skip=skip, limit=limit, plate=plate)

    async def events(
        self,
        *,
        source: str = "module",
        event_type: Optional[str] = None,
        camera_id: Optional[str] = None,
        limit: int = 500,
    ) -> Dict[str, Any]:
        return await self.integration.list_events(
            self.db, source=source, event_type=event_type, camera_id=camera_id, limit=limit
        )

    async def statistics(self) -> Dict[str, Any]:
        return await self.integration.statistics(self.db)

    # ── Analytics Engine (Module 4) ───────────────────────────────────────────

    async def analytics_dashboard(self) -> Dict[str, Any]:
        return await self.analytics.dashboard(self.db)

    async def analytics_occupancy(self) -> Dict[str, Any]:
        return await self.analytics.occupancy(self.db)

    async def analytics_traffic(self) -> Dict[str, Any]:
        return await self.analytics.traffic(self.db)

    async def analytics_utilization(self) -> Dict[str, Any]:
        return await self.analytics.utilization(self.db)

    async def analytics_trends(self, history_limit: int = 200) -> Dict[str, Any]:
        return await self.analytics.trends(self.db, history_limit=history_limit)


__all__ = ["DataFetcher"]
