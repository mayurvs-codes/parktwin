"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
Core data models.

Two layers of structure:

  * ``ReportData`` — produced by **generators**. The "what": the raw computed
    data for a report, grouped into typed sections (metrics / table / list /
    text). A generator never decides how data is *presented*.
  * ``ReportView`` — produced by **templates**. The "how": a presentation-ready
    layout (ordered panels with friendly titles and column headers) rendered by
    the exporters. A template never computes business data.

Keeping these separate means the layout logic lives in :mod:`templates` and the
data logic lives in :mod:`generators` — changing a column header is a template
edit, not a generator edit.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


# ─── Generator output ──────────────────────────────────────────────────────────

@dataclass
class ReportSection:
    """One logical block of generator output (a table, a metric set, a list)."""

    kind: str  # "metrics" | "table" | "list" | "text"
    title: str
    data: Any = None


@dataclass
class ReportData:
    """The complete raw output of a generator, ready for templating."""

    report_type: str
    title: str
    generated_at: str
    sections: List[ReportSection] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_type": self.report_type,
            "title": self.title,
            "generated_at": self.generated_at,
            "meta": self.meta,
            "sections": [
                {"kind": s.kind, "title": s.title, "data": s.data}
                for s in self.sections
            ],
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ReportData":
        return cls(
            report_type=d["report_type"],
            title=d["title"],
            generated_at=d["generated_at"],
            meta=d.get("meta", {}) or {},
            sections=[
                ReportSection(
                    kind=s.get("kind", "text"),
                    title=s.get("title", ""),
                    data=s.get("data"),
                )
                for s in d.get("sections", [])
            ],
        )


# ─── Template output (presentation) ─────────────────────────────────────────────

@dataclass
class Panel:
    """A presentation panel rendered by an exporter."""

    kind: str  # "metrics" | "table" | "list" | "text"
    title: str
    # table:
    columns: List[str] = field(default_factory=list)        # ordered keys
    headers: Dict[str, str] = field(default_factory=dict)   # key -> label
    rows: List[Dict[str, Any]] = field(default_factory=list)
    # metrics:
    metrics: List[Dict[str, Any]] = field(default_factory=list)  # [{"label", "value"}]
    # list:
    items: List[Any] = field(default_factory=list)
    # text:
    text: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReportView:
    """A fully laid-out report, ready to be rendered to any export format."""

    report_type: str
    title: str
    generated_at: str
    panels: List[Panel] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_type": self.report_type,
            "title": self.title,
            "generated_at": self.generated_at,
            "meta": self.meta,
            "panels": [p.to_dict() for p in self.panels],
        }


# ─── Storage record ────────────────────────────────────────────────────────────

@dataclass
class ReportRecord:
    """A persisted report (metadata + stored content)."""

    id: str
    type: str
    generated_at: str
    status: str
    file_path: Optional[str] = None
    format: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self, include_content: bool = False) -> Dict[str, Any]:
        d = {
            "id": self.id,
            "type": self.type,
            "generated_at": self.generated_at,
            "status": self.status,
            "file_path": self.file_path,
            "format": self.format,
            "meta": self.meta,
        }
        if include_content:
            d["content"] = self.content
        return d

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "ReportRecord":
        import json

        content = row.get("content")
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except (ValueError, TypeError):
                content = None
        meta = row.get("meta")
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except (ValueError, TypeError):
                meta = {}
        return cls(
            id=row["id"],
            type=row["type"],
            generated_at=row["generated_at"],
            status=row["status"],
            file_path=row.get("file_path"),
            format=row.get("format"),
            content=content,
            meta=meta or {},
        )


__all__ = [
    "ReportSection",
    "ReportData",
    "Panel",
    "ReportView",
    "ReportRecord",
]
