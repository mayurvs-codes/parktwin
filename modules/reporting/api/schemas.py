"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
REST API schemas (request/response models).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    report_type: str = Field(..., description="One of the REPORT_TYPES")
    formats: List[str] = Field(
        default=["json"],
        description="Export formats to produce (json | csv | pdf)",
    )
    params: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional generator parameters"
    )
    report_id: Optional[str] = Field(
        default=None,
        description="Existing report id to regenerate in place (optional)",
    )


class ReportSummary(BaseModel):
    id: str
    type: str
    generated_at: str
    status: str
    file_path: Optional[str] = None
    format: Optional[str] = None


class GenerateResponse(BaseModel):
    id: str
    type: str
    status: str
    generated_at: str
    format: Optional[str] = None
    file_path: Optional[str] = None
    formats: List[str] = Field(default_factory=list)
    download_url: str


class ReportDetail(ReportSummary):
    meta: Dict[str, Any] = Field(default_factory=dict)
    content: Optional[Dict[str, Any]] = None


__all__ = [
    "GenerateRequest",
    "ReportSummary",
    "GenerateResponse",
    "ReportDetail",
]
