"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Exporter base + registry.

An exporter turns a presentation :class:`ReportView` into encoded bytes for a
specific format. New formats are added by subclassing :class:`BaseExporter` and
registering it — generators, templates, the service, and the API are untouched.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Type

from ..models import ReportView
from ..types import EXPORT_FORMATS


class BaseExporter(ABC):
    """Abstract base for a single export format."""

    #: One of the ``EXPORT_FORMATS`` constants.
    format: str = ""

    @abstractmethod
    def export(self, view: ReportView) -> bytes:
        """Render a :class:`ReportView` to encoded bytes."""
        raise NotImplementedError


_REGISTRY: Dict[str, Type[BaseExporter]] = {}


def register_exporter(cls: Type[BaseExporter]) -> Type[BaseExporter]:
    """Register an exporter class by its ``format`` attribute."""
    if not cls.format:
        raise ValueError("Exporter must declare a non-empty `format`")
    _REGISTRY[cls.format] = cls
    return cls


def get_exporter(format: str) -> BaseExporter:
    """Return an exporter instance for ``format``."""
    cls = _REGISTRY.get(format)
    if cls is None:
        raise ValueError(
            f"Unknown export format '{format}'. Known: {list(_REGISTRY)}"
        )
    return cls()


def available_formats() -> List[str]:
    return list(_REGISTRY.keys())


def ensure_format(format: str) -> str:
    """Validate ``format`` or raise a clear error."""
    if format not in EXPORT_FORMATS:
        raise ValueError(
            f"Unsupported format '{format}'. Supported: {list(EXPORT_FORMATS)}"
        )
    return format


def cell(value: Any) -> str:
    """Format a value into a display string for tabular/text exports."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (list, dict)):
        return str(value)
    return str(value)


__all__ = [
    "BaseExporter",
    "register_exporter",
    "get_exporter",
    "available_formats",
    "ensure_format",
    "cell",
]
