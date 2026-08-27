"""
ParkTwin AI — Parking Intelligence Engine (Module 2)
========================================================
Turns Module 1 vehicle detections into parking intelligence:

  - slot_detection   : resolves each vehicle to its nearest physical slot
  - occupancy        : maintains per-slot state (FREE / OCCUPIED / RESERVED / UNKNOWN)
  - mapping          : keeps a stable vehicle <-> slot assignment across frames
  - sessions         : opens / closes parking sessions and measures duration
  - duration         : accurate parking-duration accounting
  - violations       : flags overstay / unauthorized / reserved misuse
  - events           : emits lifecycle events for downstream analytics
  - storage          : persistence layer (ORM models + CRUD + slot config)

The module reuses Module 1 outputs (``VehicleRecord`` / tracks) and is
otherwise independent: it never imports Module 1 business code and shares
only the common ``Base`` ORM and infrastructure in ``backend`` / ``shared``.
"""

from __future__ import annotations

from .engine import ParkingIntelligenceEngine

__all__ = ["ParkingIntelligenceEngine"]
