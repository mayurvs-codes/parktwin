"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Template helpers.

A template converts a :class:`ReportData` (the "what", produced by a generator)
into a :class:`ReportView` (the "how", ready to render). Helpers here do the
mechanical conversion of a generator section into a presentation :class:`Panel`,
applying friendly column headers and explicit column ordering.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from ..models import Panel, ReportSection


def _metrics_to_list(data: Any) -> List[Dict[str, Any]]:
    """Normalize a metrics section's data into [{label, value}, ...]."""
    if isinstance(data, dict):
        return [{"label": k, "value": v} for k, v in data.items()]
    out: List[Dict[str, Any]] = []
    for item in data or []:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            out.append({"label": item[0], "value": item[1]})
        elif isinstance(item, dict) and "label" in item:
            out.append({"label": item["label"], "value": item.get("value")})
    return out


def _table_columns(rows: Sequence[Dict[str, Any]], preferred: Optional[Sequence[str]]) -> List[str]:
    """Resolve the ordered column list for a table."""
    if preferred:
        return list(preferred)
    cols: List[str] = []
    for row in rows:
        for k in row.keys():
            if k not in cols:
                cols.append(k)
    return cols


def build_panel(
    section: ReportSection,
    *,
    title: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    columns: Optional[Sequence[str]] = None,
) -> Panel:
    """Convert one generator section into a presentation panel.

    ``headers`` maps a column key to a human label (layout concern, not data).
    ``columns`` forces an explicit column order.
    """
    headers = headers or {}
    title = title or section.title

    if section.kind == "metrics":
        return Panel(
            kind="metrics",
            title=title,
            metrics=_metrics_to_list(section.data),
        )

    if section.kind == "table":
        rows = section.data or []
        cols = _table_columns(rows, columns)
        return Panel(
            kind="table",
            title=title,
            columns=cols,
            headers={c: headers.get(c, c) for c in cols},
            rows=[dict(r) for r in rows],
        )

    if section.kind == "list":
        return Panel(kind="list", title=title, items=list(section.data or []))

    # text / fallback
    text = section.data if isinstance(section.data, str) else None
    return Panel(kind="text", title=title, text=text)


__all__ = ["build_panel", "_metrics_to_list", "_table_columns"]
