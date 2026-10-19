"""
Unit tests — Data Retention & Maintenance (Phase 5).
=====================================================
Tests:
  - cleanup of resolved violation episodes older than retention window
  - preservation of active violation episodes
  - pruning of stale voice announcement log entries
  - pruning of temporary plate crop files
"""

import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from modules.parking_intelligence.retention.cleanup import (
    cleanup_stale_episodes,
    cleanup_voice_announcements,
    cleanup_plate_crops,
    run_all_retention_cleanups,
)
from modules.parking_intelligence.violations.violation_engine import ViolationEngine
from modules.integration_layer.voice.service import VoiceService


def test_cleanup_stale_resolved_episodes():
    engine = ViolationEngine()
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)

    # Episode 1: resolved 2 days ago
    engine.on_bay_entry(track_id=1, bay_id="SP-11", vehicle_id="VEH-OLD", assigned_bay="SP-07", timestamp=t0)
    engine.resolve_episode("VE-VEH-OLD-SP-11" if "VE-VEH-OLD-SP-11" in engine._episodes else list(engine._episodes.keys())[0], reason="left_bay", timestamp=t0 + timedelta(hours=1))

    # Episode 2: active (ongoing)
    engine.on_bay_entry(track_id=2, bay_id="SP-12", vehicle_id="VEH-ACTIVE", assigned_bay="SP-07", timestamp=t0 + timedelta(days=2))

    now = t0 + timedelta(days=2, hours=1)
    # Retention window: 1 day (86400s)
    purged = cleanup_stale_episodes(engine, max_age_seconds=86400.0, now=now)
    assert purged == 1

    remaining = engine.get_episodes(active_only=False)
    assert len(remaining) == 1
    assert remaining[0]["vehicle_id"] == "VEH-ACTIVE"
    assert remaining[0]["state"] == "WARNED"


def test_cleanup_voice_announcements():
    voice = VoiceService()
    t_start = 100000.0

    # Add old announcement
    voice.build_assignment_message(event_id="EV-OLD", vehicle_id="V-1", assigned_bay="SP-01")
    # Manually backdate the entry
    voice._announcement_log[0]["timestamp"] = datetime.fromtimestamp(t_start, tz=timezone.utc).isoformat()

    # Add recent announcement
    voice.build_assignment_message(event_id="EV-NEW", vehicle_id="V-2", assigned_bay="SP-02")
    voice._announcement_log[1]["timestamp"] = datetime.fromtimestamp(t_start + 86500.0, tz=timezone.utc).isoformat()

    now_ts = t_start + 86600.0
    pruned = cleanup_voice_announcements(voice, max_age_seconds=86400.0, now=now_ts)
    assert pruned == 1
    assert len(voice._announcement_log) == 1
    assert voice._announcement_log[0]["event_id"] == "EV-NEW"


def test_cleanup_plate_crops():
    with tempfile.TemporaryDirectory() as tmpdir:
        p = Path(tmpdir)
        old_file = p / "crop_old.jpg"
        new_file = p / "crop_new.jpg"

        old_file.write_bytes(b"image_bytes")
        new_file.write_bytes(b"image_bytes")

        # Fake old mtime
        past_time = time.time() - 90000.0
        import os
        os.utime(str(old_file), (past_time, past_time))

        deleted = cleanup_plate_crops(str(p), max_age_seconds=86400.0)
        assert deleted == 1
        assert not old_file.exists()
        assert new_file.exists()
