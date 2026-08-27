"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Generator base class.

A generator turns data from a :class:`DataFetcher` into a :class:`ReportData`.
It contains **no presentation logic** — only the decision of *which data* a
report includes. Layout/presentation is the job of :mod:`templates`.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..models import ReportData, ReportSection
from ..services.data_fetcher import DataFetcher
from ..types import REPORT_TYPE_TITLES
from ..utils import iso_now


class BaseGenerator:
    """Base class for all report generators."""

    #: Subclasses set this to one of the ``REPORT_TYPES`` constants.
    report_type: str = ""

    async def generate(
        self, fetcher: DataFetcher, params: Optional[Dict[str, Any]] = None
    ) -> ReportData:
        params = params or {}
        sections = await self.build_sections(fetcher, params)
        title = REPORT_TYPE_TITLES.get(self.report_type, self.report_type)
        return ReportData(
            report_type=self.report_type,
            title=title,
            generated_at=iso_now(),
            sections=sections,
            meta=self.build_meta(fetcher, params),
        )

    async def build_sections(
        self, fetcher: DataFetcher, params: Dict[str, Any]
    ) -> List[ReportSection]:
        raise NotImplementedError

    def build_meta(self, fetcher: DataFetcher, params: Dict[str, Any]) -> Dict[str, Any]:
        return {"params": params or {}}


def section(kind: str, title: str, data: Any) -> ReportSection:
    """Helper to construct a :class:`ReportSection`."""
    return ReportSection(kind=kind, title=title, data=data)


__all__ = ["BaseGenerator", "section"]
