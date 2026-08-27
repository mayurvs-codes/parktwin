"""
ParkTwin AI — Analytics Engine (Module 4)
========================================
API subpackage: REST transport for the Analytics Engine.
"""

from .router import router, get_analytics_service_dep

__all__ = ["router", "get_analytics_service_dep"]
