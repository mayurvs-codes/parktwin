"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Exporters subpackage: pluggable export formats (JSON / CSV / PDF).

Importing this package registers every built-in exporter. Add a new format by
implementing a :class:`BaseExporter` subclass and importing it here.
"""

from .base import (
    BaseExporter,
    register_exporter,
    get_exporter,
    available_formats,
    ensure_format,
)
from .json_exporter import JsonExporter  # noqa: F401  (registers JSON)
from .csv_exporter import CsvExporter    # noqa: F401  (registers CSV)
from .pdf_exporter import PdfExporter    # noqa: F401  (registers PDF)

__all__ = [
    "BaseExporter",
    "register_exporter",
    "get_exporter",
    "available_formats",
    "ensure_format",
    "JsonExporter",
    "CsvExporter",
    "PdfExporter",
]
