"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Generators subpackage + registry.

New report types are added by implementing a :class:`BaseGenerator` subclass
and registering it here — generators are the only place that decides *which
data* a report contains.
"""

from __future__ import annotations

from typing import Dict, List, Type

from .base import BaseGenerator
from .parking_summary import ParkingSummaryGenerator
from .occupancy import OccupancyGenerator
from .vehicle import VehicleGenerator
from .parking_session import ParkingSessionGenerator
from .violation import ViolationGenerator
from .analytics_summary import AnalyticsSummaryGenerator
from ..types import REPORT_TYPES


_REGISTRY: Dict[str, Type[BaseGenerator]] = {
    ParkingSummaryGenerator.report_type: ParkingSummaryGenerator,
    OccupancyGenerator.report_type: OccupancyGenerator,
    VehicleGenerator.report_type: VehicleGenerator,
    ParkingSessionGenerator.report_type: ParkingSessionGenerator,
    ViolationGenerator.report_type: ViolationGenerator,
    AnalyticsSummaryGenerator.report_type: AnalyticsSummaryGenerator,
}


def get_generator(report_type: str) -> BaseGenerator:
    """Return a fresh generator instance for ``report_type``."""
    cls = _REGISTRY.get(report_type)
    if cls is None:
        raise ValueError(
            f"Unknown report type '{report_type}'. Known: {list(_REGISTRY)}"
        )
    return cls()


def available_report_types() -> List[str]:
    return list(_REGISTRY.keys())


def register_generator(cls: Type[BaseGenerator]) -> None:
    """Register a new generator class (extensibility hook)."""
    if not cls.report_type:
        raise ValueError("Generator must declare a non-empty report_type")
    _REGISTRY[cls.report_type] = cls


__all__ = [
    "BaseGenerator",
    "get_generator",
    "available_report_types",
    "register_generator",
    "REPORT_TYPES",
]
