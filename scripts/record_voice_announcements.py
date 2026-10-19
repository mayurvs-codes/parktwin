"""
ParkTwin AI — Voice Announcement & Duplicate Suppression Generator
===================================================================
Executes the wrong-bay violation scenario through the real IntegrationService
pipeline, capturing all VoiceService announcements, pre-emptions, cancellations,
and validating duplicate suppression.

Outputs: docs/evidence/3d-voice-violation/announcement_log.json
Command: python scripts/record_voice_announcements.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from shapely.geometry import box

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database.session import AsyncSessionLocal, engine as db_engine
from modules.integration_layer.events.memory_bus import InMemoryEventBus
from modules.integration_layer.services.integration_service import IntegrationService
from modules.integration_layer.sync import Synchronizer
from modules.integration_layer.voice import get_voice_service
from modules.integration_layer.websocket.manager import ConnectionManager
from modules.parking_intelligence.engine import ParkingIntelligenceEngine


class MockWebSocketReceiver:
    def __init__(self):
        self.received_messages = []

    async def send_text(self, text: str):
        self.received_messages.append(json.loads(text))

    async def accept(self):
        pass

    async def close(self):
        pass


class TrackRecord:
    def __init__(
        self,
        track_id: int,
        tracking_id: int,
        vehicle_id: str,
        license_plate: str,
        camera_id: str,
        floor_coords: tuple,
        assigned_bay: str,
    ):
        self.track_id = track_id
        self.tracking_id = tracking_id
        self.vehicle_id = vehicle_id
        self.license_plate = license_plate
        self.camera_id = camera_id
        self.floor_coords = floor_coords
        self.assigned_bay = assigned_bay
        self.vehicle_type = "sedan"
        self.detection_confidence = 0.95
        self.bbox = [100, 100, 200, 200]

    def to_api_dict(self):
        return {
            "tracking_id": self.tracking_id,
            "vehicle_id": self.vehicle_id,
            "license_plate": self.license_plate,
            "camera_id": self.camera_id,
            "vehicle_type": self.vehicle_type,
            "confidence": self.detection_confidence,
            "bbox": self.bbox,
            "floor_coords": list(self.floor_coords),
            "assigned_bay": self.assigned_bay,
        }


async def run_scenario():
    print("[INFO] Starting real pipeline voice announcement run...")

    # Output paths
    output_dir = BASE_DIR / "docs" / "evidence" / "3d-voice-violation"
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / "announcement_log.json"

    if out_file.exists():
        out_file.unlink()
        print(f"[INFO] Deleted previous log at {out_file}")

    # 1. Initialize real pipeline components
    bus = InMemoryEventBus()
    ws_manager = ConnectionManager()
    sync = Synchronizer()
    engine = ParkingIntelligenceEngine()
    voice_service = get_voice_service()
    voice_service.reset()

    service = IntegrationService(
        event_bus=bus,
        ws_manager=ws_manager,
        synchronizer=sync,
        parking_engine=engine,
    )

    ws_client = MockWebSocketReceiver()
    await ws_manager.connect(ws_client, channel="events", token="dev_admin_token")

    # 2. Configure camera & bay geometry on real BayEntryDetector
    engine.bay_entry_detector.register_camera("CAM-02", status="calibrated")
    engine.bay_entry_detector.register_bay(
        "SP-07",
        box(4.8 - 1.4, -6.2 - 2.7, 4.8 + 1.4, -6.2 + 2.7),
        center=(4.8, -6.2),
    )
    engine.bay_entry_detector.register_bay(
        "SP-11",
        box(-14.4 - 1.4, 6.2 - 2.7, -14.4 + 1.4, 6.2 + 2.7),
        center=(-14.4, 6.2),
    )

    async with AsyncSessionLocal() as db:
        await service.ensure_initialized(db)

        # ── Step 1: ANPR Assignment ───────────────────────────────────────────
        print("[STEP 1] Vehicle VEH-001 recognized at entry CAM-01, assigned SP-07")
        anpr_msg = await service.process_anpr_assignment(
            camera_id="CAM-01",
            vehicle_id="VEH-001",
            assigned_bay="SP-07",
            source="demo",
        )
        print(f"         Spoken text: '{anpr_msg['text']}' (priority {anpr_msg['priority']})")

        # ── Step 2: Vehicle Enters Wrong Bay SP-11 ────────────────────────────
        print("[STEP 2] Vehicle enters wrong bay SP-11 (15 frames over 1.5s)")
        start_ts = 1000.0
        for step in range(15):
            ts = start_ts + (step * 0.1)
            prog = min(1.0, step / 10.0)
            y = 2.0 + prog * 4.2  # Approaches and settles inside SP-11
            rec = TrackRecord(
                track_id=101,
                tracking_id=101,
                vehicle_id="VEH-001",
                license_plate="KA01MJ5001",
                camera_id="CAM-02",
                floor_coords=(-14.4, y),
                assigned_bay="SP-07",
            )
            await service.handle_frame(db, "CAM-02", [rec], source="demo", ts=ts)

        ep = engine.violations.get_active_episode("VEH-001")
        assert ep is not None, "Violation episode was not created!"
        print(f"         Warning emitted: episode_id={ep['episode_id']}, state={ep['state']}")

        # ── Step 3: Duplicate Suppression Verification ────────────────────────
        print("[STEP 3] Testing duplicate suppression...")
        # A: Repeat wrong bay warning call with the same episode
        dup_attempt_1 = voice_service.build_wrong_bay_warning(
            event_id=ep["episode_id"],
            vehicle_id="VEH-001",
            assigned_bay="SP-07",
            actual_bay="SP-11",
            source="demo",
        )
        assert dup_attempt_1 is None, "Duplicate event_id was NOT suppressed!"

        # B: Repeat with new event_id but vehicle on cooldown (< 5s)
        dup_attempt_2 = voice_service.build_wrong_bay_warning(
            event_id=f"EV-DUP-{int(start_ts)}",
            vehicle_id="VEH-001",
            assigned_bay="SP-07",
            actual_bay="SP-11",
            source="demo",
        )
        assert dup_attempt_2 is None, "Vehicle cooldown suppression failed!"

        # C: Feed an additional frame while still inside bay
        extra_rec = TrackRecord(
            track_id=101,
            tracking_id=101,
            vehicle_id="VEH-001",
            license_plate="KA01MJ5001",
            camera_id="CAM-02",
            floor_coords=(-14.4, 6.2),
            assigned_bay="SP-07",
        )
        await service.handle_frame(db, "CAM-02", [extra_rec], source="demo", ts=start_ts + 1.6)

        print("         [PASS] Duplicate suppression verified: both duplicate event_id and cooldown triggers suppressed.")

        # ── Step 4: Vehicle Departs Wrong Bay ─────────────────────────────────
        print("[STEP 4] Vehicle departs SP-11 (25 frames moving away)")
        for step in range(25):
            exit_ts = 1002.0 + (step * 0.1)
            y_exit = 6.2 - (step * 0.5)
            rec = TrackRecord(
                track_id=101,
                tracking_id=101,
                vehicle_id="VEH-001",
                license_plate="KA01MJ5001",
                camera_id="CAM-02",
                floor_coords=(-14.4, y_exit),
                assigned_bay="SP-07",
            )
            await service.handle_frame(db, "CAM-02", [rec], source="demo", ts=exit_ts)

        ep_final = engine.violations.get_episode(ep["episode_id"])
        assert ep_final["state"] == "RESOLVED"
        print(f"         Violation resolved: state={ep_final['state']}, reason={ep_final['resolution_reason']}")

    # 3. Assemble complete evidence log
    raw_log = voice_service.get_announcements_log(limit=100)

    # Insert explicit record of duplicate suppression audit
    evidence_records = []
    for entry in raw_log:
        evidence_records.append(entry)
        if entry.get("action") == "ANNOUNCEMENT" and entry.get("kind") == "WRONG_BAY_WARNING":
            # Add the duplicate suppression audit right after warning
            evidence_records.append({
                "action": "DUPLICATE_SUPPRESSION_AUDIT",
                "attempted_event_id": ep["episode_id"],
                "vehicle_id": "VEH-001",
                "cooldown_seconds": voice_service.cooldown_seconds,
                "event_ttl_seconds": voice_service.event_ttl_seconds,
                "suppressed": True,
                "reason": "event_id_seen_and_vehicle_cooldown_active",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    # Also include resolution event
    evidence_records.append({
        "action": "RESOLVE",
        "episode_id": ep["episode_id"],
        "reason": ep_final["resolution_reason"],
        "duration_seconds": ep_final.get("duration_seconds", 0.0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Write log
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(evidence_records, f, indent=2)

    print(f"[SUCCESS] Wrote {len(evidence_records)} evidence entries to {out_file}")


if __name__ == "__main__":
    asyncio.run(run_scenario())
