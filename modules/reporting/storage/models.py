"""
ParkTwin AI — Reporting Engine ORM Models (Module 5)
===================================================
SQLAlchemy model for report records stored in parktwin.db.
"""

from __future__ import annotations

from sqlalchemy import Column, String, Text, Index
from backend.database.models import Base


class Report(Base):
    """Generated report metadata and content record."""

    __tablename__ = "reports"

    id = Column(String(64), primary_key=True)
    type = Column(String(64), nullable=False, index=True)
    generated_at = Column(String(32), nullable=False, index=True)
    file_path = Column(Text, nullable=True)
    status = Column(String(32), nullable=False)
    format = Column(String(32), nullable=True)
    content = Column(Text, nullable=True)
    meta = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_reports_type", "type"),
        Index("idx_reports_gen", "generated_at"),
    )
