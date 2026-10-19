"""
Integration test for real CCTV track replay through BayEntryDetector and Engine.
Validates image-space polygon detection strictly in replay mode without calibration.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from backend.database.models import Base
from modules.parking_intelligence.bay_entry.detector import BayEntryDetector
from modules.parking_intelligence.bay_entry.events import (
    BAY_ENTRY_CONFIRMED,
    BAY_OCCUPIED,
)
from modules.parking_intelligence.engine import ParkingIntelligenceEngine


@pytest.mark.asyncio
async def test_real_cctv_tracks_live_emits_nothing_unconfigured():
    """Live mode must emit 0 events for unconfigured CAM-10 with pixel-only tracks."""
    tracks_file = Path("data/annotations/real_cctv_tracks_camera10.json")
    assert tracks_file.exists(), f"Tracks file missing: {tracks_file}"

    with open(tracks_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    detector = BayEntryDetector()
    assert detector.get_camera_status("CAM-10") == "unconfigured", "CAM-10 must not be calibrated"

    # Verify no floor_coords exist in real detections
    for frame in data["frames"][:20]:
        for det in frame["detections"]:
            assert "floor_coords" not in det or det["floor_coords"] is None

    # Ingest in live mode
    live_events = []
    for frame in data["frames"][:20]:
        events = detector.update(frame["detections"], ts=frame["timestamp"], source="live")
        live_events.extend(events)

    assert len(live_events) == 0, "Live mode must never emit events for unconfigured camera"


@pytest.mark.asyncio
async def test_real_cctv_tracks_replay_emits_expected_bays():
    """Replay mode must detect bay entries and occupations using image-space polygons."""
    tracks_file = Path("data/annotations/real_cctv_tracks_camera10.json")
    with open(tracks_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    detector = BayEntryDetector()
    assert detector.get_camera_status("CAM-10") == "unconfigured"

    replay_events = []
    for frame in data["frames"][:40]:
        events = detector.update(frame["detections"], ts=frame["timestamp"], source="replay")
        replay_events.extend(events)

    assert len(replay_events) > 0, "Replay mode should detect bay entries for parked vehicles"

    # All events must carry source="replay"
    for ev in replay_events:
        assert ev.source == "replay", f"Event {ev} must carry source='replay'"

    # Verify specific vehicles and their derived bay assignments
    entry_bays = {e.track_id: e.bay_id for e in replay_events if e.event_type == BAY_ENTRY_CONFIRMED}
    occupied_bays = {e.track_id: e.bay_id for e in replay_events if e.event_type == BAY_OCCUPIED}

    # Track 1 (Blue hatchback) in BAY-CAM10-05
    assert entry_bays.get(1) == "BAY-CAM10-05"
    assert occupied_bays.get(1) == "BAY-CAM10-05"

    # Track 2 (Red sedan) in BAY-CAM10-04
    assert entry_bays.get(2) == "BAY-CAM10-04"
    assert occupied_bays.get(2) == "BAY-CAM10-04"

    # Track 3 (Red SUV) in BAY-CAM10-02
    assert entry_bays.get(3) == "BAY-CAM10-02"
    assert occupied_bays.get(3) == "BAY-CAM10-02"

    # Track 4 (Moving vehicle driving past down aisle) must NOT enter any bay
    assert 4 not in entry_bays, "Track 4 is driving in aisle and must not trigger bay entry"

    # Track 5 (Black van) in BAY-CAM10-03
    assert entry_bays.get(5) == "BAY-CAM10-03"


@pytest.mark.asyncio
async def test_real_cctv_tracks_engine_replay_violation_pipeline():
    """Ingesting real CCTV replay tracks with assigned bay mismatch triggers violation pipeline."""
    tracks_file = Path("data/annotations/real_cctv_tracks_camera10.json")
    with open(tracks_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    db_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = sessionmaker(db_engine, expire_on_commit=False, class_=AsyncSession)

    engine = ParkingIntelligenceEngine()

    # Assign Track 3 to BAY-CAM10-01 (expected) while it physically enters BAY-CAM10-02 (actual)
    assigned_frames = []
    for fr in data["frames"][:35]:
        fr_copy = {"frame_idx": fr["frame_idx"], "timestamp": fr["timestamp"], "detections": []}
        for det in fr["detections"]:
            d_copy = dict(det)
            if d_copy["track_id"] == 3:
                d_copy["assigned_bay"] = "BAY-CAM10-01"
            fr_copy["detections"].append(d_copy)
        assigned_frames.append(fr_copy)

    async with session_factory() as db:
        await engine.init(db)
        for frame in assigned_frames:
            await engine.ingest_frame(
                db,
                camera_id="CAM-10",
                records=frame["detections"],
                source="replay",
                ts=frame["timestamp"],
            )
            await db.commit()

    episodes = engine.violations.get_episodes()
    assert len(episodes) == 1, f"Expected 1 wrong-bay episode, found {len(episodes)}"
    ep = episodes[0]
    assert ep["vehicle_id"] == "UP16BU7218"
    assert ep["license_plate"] == "UP16BU7218"
    assert ep["assigned_bay"] == "BAY-CAM10-01"
    assert ep["actual_bay"] == "BAY-CAM10-02"
    assert ep["state"] == "WARNED"
    assert ep["source"] == "replay"

