"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
PDF exporter (reportlab).

Renders a :class:`ReportView` into a multi-section PDF document. Each panel
becomes a headed block: metrics render as a key/value table, tables as a grid,
lists as bullets, and text as a paragraph.
"""

from __future__ import annotations

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    ListFlowable,
    ListItem,
)

from .base import BaseExporter, cell, register_exporter
from ..models import ReportView
from ..types import FORMAT_PDF


_HEADER_BG = colors.HexColor("#1f3a5f")
_HEADER_FG = colors.white
_GRID = colors.HexColor("#cccccc")
_ALT = colors.HexColor("#f2f5f9")


@register_exporter
class PdfExporter(BaseExporter):
    format = FORMAT_PDF

    def export(self, view: ReportView) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=1.8 * cm,
            rightMargin=1.8 * cm,
            topMargin=1.8 * cm,
            bottomMargin=1.8 * cm,
            title=view.title,
            author="ParkTwin AI Reporting Engine",
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle", parent=styles["Title"], fontSize=18, spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "ReportSub", parent=styles["Normal"], fontSize=9,
            textColor=colors.grey, spaceAfter=10,
        )
        heading_style = ParagraphStyle(
            "PanelHeading", parent=styles["Heading2"], fontSize=13,
            textColor=_HEADER_BG, spaceBefore=10, spaceAfter=4,
        )

        flow = [
            Paragraph(view.title, title_style),
            Paragraph(
                f"Type: {view.report_type} &nbsp;|&nbsp; Generated: {view.generated_at}",
                subtitle_style,
            ),
        ]

        for panel in view.panels:
            flow.append(Paragraph(panel.title, heading_style))
            flow.extend(self._render_panel(panel))
            flow.append(Spacer(1, 4))

        doc.build(flow)
        return buf.getvalue()

    def _render_panel(self, panel) -> list:
        if panel.kind == "metrics" and panel.metrics:
            data = [["Metric", "Value"]] + [
                [cell(m.get("label")), cell(m.get("value"))] for m in panel.metrics
            ]
            return [self._table(data, col_widths=[9 * cm, 7 * cm])]

        if panel.kind == "table" and panel.rows:
            headers = [panel.headers.get(c, c) for c in panel.columns]
            data = [headers] + [
                [cell(row.get(c)) for c in panel.columns] for row in panel.rows
            ]
            return [self._table(data, col_widths=None)]

        if panel.kind == "list" and panel.items:
            items = [
                ListItem(Paragraph(cell(i), _body())) for i in panel.items
            ]
            return [ListFlowable(items, bulletType="bullet", leftIndent=12)]

        if panel.kind == "text" and panel.text:
            return [Paragraph(cell(panel.text), _body())]

        return []

    def _table(self, data, col_widths=None) -> Table:
        table = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), _HEADER_FG),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.4, _GRID),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
        # Alternating row shading for readability.
        for r in range(1, len(data)):
            if r % 2 == 0:
                style.append(("BACKGROUND", (0, r), (-1, r), _ALT))
        table.setStyle(TableStyle(style))
        return table


def _body():
    from reportlab.lib.styles import getSampleStyleSheet

    styles = getSampleStyleSheet()
    return ParagraphStyle("Body", parent=styles["Normal"], fontSize=9, leading=12)


__all__ = ["PdfExporter"]
