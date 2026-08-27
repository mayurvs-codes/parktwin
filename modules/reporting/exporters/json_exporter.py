"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
JSON exporter.
"""

from __future__ import annotations

import json

from .base import BaseExporter, register_exporter
from ..models import ReportView
from ..types import FORMAT_JSON


@register_exporter
class JsonExporter(BaseExporter):
    format = FORMAT_JSON

    def export(self, view: ReportView) -> bytes:
        payload = view.to_dict()
        return json.dumps(payload, indent=2, default=str).encode("utf-8")


__all__ = ["JsonExporter"]
