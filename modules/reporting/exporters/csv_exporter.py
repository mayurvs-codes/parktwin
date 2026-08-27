"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
CSV exporter.

A report may contain several panels; the CSV concatenates them with a section
header line and a blank separator so the whole report fits one file. Tables and
metrics both render as rows; lists render as one value per line.
"""

from __future__ import annotations

import csv
import io

from .base import BaseExporter, cell, register_exporter
from ..models import ReportView
from ..types import FORMAT_CSV


@register_exporter
class CsvExporter(BaseExporter):
    format = FORMAT_CSV

    def export(self, view: ReportView) -> bytes:
        buf = io.StringIO()
        writer = csv.writer(buf)

        writer.writerow([view.title])
        writer.writerow([f"Type: {view.report_type} | Generated: {view.generated_at}"])
        writer.writerow([])

        for panel in view.panels:
            writer.writerow([panel.title])
            if panel.kind == "table" and panel.rows:
                headers = [panel.headers.get(c, c) for c in panel.columns]
                writer.writerow(headers)
                for row in panel.rows:
                    writer.writerow([cell(row.get(c)) for c in panel.columns])
            elif panel.kind == "metrics" and panel.metrics:
                writer.writerow(["Metric", "Value"])
                for m in panel.metrics:
                    writer.writerow([m.get("label"), cell(m.get("value"))])
            elif panel.kind == "list" and panel.items:
                for item in panel.items:
                    writer.writerow([cell(item)])
            elif panel.kind == "text" and panel.text:
                writer.writerow([panel.text])
            writer.writerow([])

        return buf.getvalue().encode("utf-8")


__all__ = ["CsvExporter"]
