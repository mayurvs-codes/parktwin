"""
ParkTwin AI — Reporting Engine (Module 5)
=========================================
API subpackage: REST transport for the Reporting Engine.
"""

from .router import router, get_reporting_service_dep
from .schemas import (
    GenerateRequest,
    GenerateResponse,
    ReportDetail,
    ReportSummary,
)

__all__ = [
    "router",
    "get_reporting_service_dep",
    "GenerateRequest",
    "GenerateResponse",
    "ReportDetail",
    "ReportSummary",
]
