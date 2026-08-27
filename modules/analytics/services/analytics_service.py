"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
Analytics Service (orchestrator).

The single entry point the REST API talks to. It consumes the **Integration
Layer** exclusively — i.e. the :class:`IntegrationService` facade
(``occupancy``, ``list_slots``, ``list_sessions``, ``list_events``,
``statistics``). It never imports or calls Module 1 / Module 2 code directly;
all raw data flows through Module 3.

For every compute it:

  1. pulls the current Integration Layer outputs,
  2. runs the pure calculators (occupancy / traffic / utilization / trends),
  3. persists a snapshot to the Analytics storage (so Trends can build
     timelines),
  4. returns the combined result.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ..occupancy import compute_occupancy
from ..traffic import compute_traffic
from ..utilization import compute_utilization
from ..trends import (
    build_occupancy_timeline,
    build_traffic_timeline,
    compute_duration_statistics,
    compute_session_statistics,
)
from ..storage import AnalyticsStore
from ..metrics.base import iso_now


def _resolve_time_range(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> tuple[datetime, datetime]:
    """Resolve start and end datetimes, defaulting to the last 24 hours if unsupplied."""
    end_dt = end or datetime.now(timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)

    if start is None:
        start_dt = end_dt - timedelta(hours=24)
    else:
        start_dt = start
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=timezone.utc)

    return start_dt, end_dt


def _parse_dt(val: Any) -> Optional[datetime]:
    if isinstance(val, datetime):
        return val if val.tzinfo is not None else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str) and val:
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def _filter_sessions(sessions: List[Dict[str, Any]], start_dt: datetime, end_dt: datetime) -> List[Dict[str, Any]]:
    filtered = []
    for s in sessions:
        entry = _parse_dt(s.get("entry_time"))
        exit_t = _parse_dt(s.get("exit_time"))
        if entry and (start_dt <= entry <= end_dt):
            filtered.append(s)
        elif exit_t and (start_dt <= exit_t <= end_dt):
            filtered.append(s)
        elif not entry and not exit_t:
            filtered.append(s)
    return filtered


def _filter_events(events: List[Dict[str, Any]], start_dt: datetime, end_dt: datetime) -> List[Dict[str, Any]]:
    filtered = []
    for e in events:
        ts = _parse_dt(e.get("timestamp") or e.get("created_at"))
        if ts is None or (start_dt <= ts <= end_dt):
            filtered.append(e)
    return filtered


class AnalyticsService:
    """Orchestrates Analytics Engine calculators over Integration Layer outputs."""

    def __init__(self, integration_svc: Any, store: Optional[AnalyticsStore] = None) -> None:
        self.integration = integration_svc
        self.store = store or AnalyticsStore()

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def ensure_initialized(self, db: AsyncSession) -> None:
        """Bootstrap the Integration Layer (Module 2 tables) + the store.

        Analytics is a pure consumer, so initialization is delegated to the
        Integration Service; we only ensure our own storage schema exists.
        """
        if hasattr(self.integration, "ensure_initialized"):
            await self.integration.ensure_initialized(db)
        await self.store.init()

    # ── Data collection (Integration Layer only) ─────────────────────────

    async def _collect(
        self,
        db: AsyncSession,
        start_dt: Optional[datetime] = None,
        end_dt: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Fetch the current Integration Layer outputs in one round-trip batch."""
        occ = await self.integration.occupancy(db)
        slots = await self.integration.list_slots(db)
        sessions = await self.integration.list_sessions(db)
        events_resp = await self.integration.list_events(db, source="module")
        events = events_resp.get("events", []) if isinstance(events_resp, dict) else []
        stats = await self.integration.statistics(db)

        if start_dt and end_dt:
            sessions = _filter_sessions(sessions, start_dt, end_dt)
            events = _filter_events(events, start_dt, end_dt)

        return {
            "occupancy": occ,
            "slots": slots,
            "sessions": sessions,
            "events": events,
            "statistics": stats,
        }

    # ── Calculators ──────────────────────────────────────────────────────

    async def occupancy(
        self,
        db: AsyncSession,
        store: bool = True,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        start_dt, end_dt = _resolve_time_range(start, end)
        data = await self._collect(db, start_dt, end_dt)
        result = compute_occupancy(data["occupancy"], data["slots"])
        result["query_start"] = start_dt.isoformat()
        result["query_end"] = end_dt.isoformat()
        if store:
            await self.store.save_snapshot("occupancy", result, db=db)
        return result

    async def traffic(
        self,
        db: AsyncSession,
        store: bool = True,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        start_dt, end_dt = _resolve_time_range(start, end)
        data = await self._collect(db, start_dt, end_dt)
        result = compute_traffic(data["sessions"], data["events"])
        result["query_start"] = start_dt.isoformat()
        result["query_end"] = end_dt.isoformat()
        if store:
            await self.store.save_snapshot("traffic", result, db=db)
        return result

    async def utilization(
        self,
        db: AsyncSession,
        store: bool = True,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        start_dt, end_dt = _resolve_time_range(start, end)
        data = await self._collect(db, start_dt, end_dt)
        result = compute_utilization(data["sessions"], data["slots"], data["statistics"])
        result["query_start"] = start_dt.isoformat()
        result["query_end"] = end_dt.isoformat()
        if store:
            await self.store.save_snapshot("utilization", result, db=db)
        return result

    async def trends(
        self,
        db: AsyncSession,
        history_limit: int = 200,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        start_dt, end_dt = _resolve_time_range(start, end)
        data = await self._collect(db, start_dt, end_dt)
        occ_history = await self.store.get_history(
            "occupancy", limit=history_limit, start=start_dt, end=end_dt, db=db
        )
        traffic_history = await self.store.get_history(
            "traffic", limit=history_limit, start=start_dt, end=end_dt, db=db
        )
        return {
            "occupancy_timeline": build_occupancy_timeline(occ_history),
            "traffic_timeline": build_traffic_timeline(traffic_history),
            "session_statistics": compute_session_statistics(data["sessions"], data["statistics"]),
            "duration_statistics": compute_duration_statistics(data["sessions"]),
            "query_start": start_dt.isoformat(),
            "query_end": end_dt.isoformat(),
            "generated_at": iso_now(),
        }

    async def dashboard(
        self,
        db: AsyncSession,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Compute + persist every metric and return a combined dashboard."""
        start_dt, end_dt = _resolve_time_range(start, end)
        occ = await self.occupancy(db, store=True, start=start_dt, end=end_dt)
        traf = await self.traffic(db, store=True, start=start_dt, end=end_dt)
        util = await self.utilization(db, store=True, start=start_dt, end=end_dt)
        trends = await self.trends(db, history_limit=200, start=start_dt, end=end_dt)
        return {
            "occupancy": occ,
            "traffic": traf,
            "utilization": util,
            "trends": trends,
            "query_start": start_dt.isoformat(),
            "query_end": end_dt.isoformat(),
            "generated_at": iso_now(),
        }



__all__ = ["AnalyticsService"]
