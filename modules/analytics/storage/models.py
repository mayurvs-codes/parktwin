"""
ParkTwin AI — Analytics Engine ORM Models (Module 4)
===================================================
SQLAlchemy model for analytics snapshots stored in parktwin.db.
"""

from __future__ import annotations

from sqlalchemy import Column, Integer, String, Text, Index
from backend.database.models import Base


class AnalyticsSnapshot(Base):
    """Time-series analytics snapshot record."""

    __tablename__ = "analytics_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_type = Column(String(64), nullable=False, index=True)
    timestamp = Column(String(32), nullable=False, index=True)
    payload = Column(Text, nullable=False)

    __table_args__ = (
        Index("idx_snap_type_ts", "metric_type", "timestamp"),
    )
