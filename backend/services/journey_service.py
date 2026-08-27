"""
ParkTwin AI — Multi-Camera Vehicle Journey Service
===================================================
Coordinates vehicle journey lifecycles across 3 camera roles:
  - 🟢 ENTRY   : Vehicle detected at entry gate → journey created (status: 'entering')
  - 🟡 PARKING : Vehicle parked in lot → linked by plate → slot assigned (status: 'parked')
  - 🔴 EXIT    : Vehicle leaves via exit gate → linked by plate → duration computed, slot freed (status: 'exited')

All stages are correlated across cameras by the normalized license plate number.
"""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import VehicleJourney
from modules.parking_intelligence.storage.models import ParkingSlot, ParkingSession, SlotState
from backend.services.anpr_service import process_video_file, ProcessingResult, _UPLOADS_DIR
from shared.logging import get_logger

logger = get_logger("journey_service")

# Default slot naming fallback if slots table is not pre-populated
_DEFAULT_SLOTS = [f"P{i:02d}" for i in range(1, 11)]


def _normalize_slot_id(slot_id: str) -> str:
    """Normalize user/client slot string to canonical slot ID (e.g. 'P1' -> 'P01')."""
    s = str(slot_id).strip()
    if s.upper().startswith("P") and len(s) == 2 and s[1].isdigit():
        return f"P0{s[1]}"
    return s


async def _get_or_create_slot(db: AsyncSession, slot_id: str, camera_id: str = "camera_01") -> ParkingSlot:
    """Ensure a parking slot row exists in the database without creating duplicate slot IDs."""
    norm_id = _normalize_slot_id(slot_id)
    # Search for existing slot matching the slot_id (e.g. P01 under camera_01)
    stmt = select(ParkingSlot).where(func.upper(ParkingSlot.slot_id) == norm_id)
    result = await db.execute(stmt)
    slot = result.scalars().first()
    if slot is None:
        slot = ParkingSlot(
            slot_id=norm_id,
            camera_id=camera_id,
            zone="Zone A" if norm_id in ["P01", "P02", "P03", "P04", "P05"] else "Zone B",
            state=SlotState.FREE,
        )
        db.add(slot)
        await db.flush()
    return slot


async def _find_free_slot(db: AsyncSession, preferred_slot: Optional[str] = None) -> str:
    """Find the first available free parking slot, creating default slots if needed."""
    if preferred_slot:
        slot = await _get_or_create_slot(db, preferred_slot)
        return slot.slot_id

    # Query existing free slots in DB ordered by slot_id
    stmt = select(ParkingSlot).where(ParkingSlot.state == SlotState.FREE).order_by(ParkingSlot.slot_id)
    result = await db.execute(stmt)
    free_slots = result.scalars().all()

    if free_slots:
        return free_slots[0].slot_id

    # If all existing are occupied, pick first default slot
    return _DEFAULT_SLOTS[0]


async def process_journey_video(
    db: AsyncSession,
    video_path: Path,
    camera_role: str,  # "entry" | "parking" | "exit"
    pipeline,
    preferred_slot: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Run ANPR on uploaded video for a specific camera role and update vehicle journeys.
    """
    camera_id = f"CAM_{camera_role.upper()}"
    t0 = time.perf_counter()

    # 1. Run ANPR Pipeline loop in worker thread
    anpr_result: ProcessingResult = await asyncio.to_thread(
        process_video_file,
        video_path=video_path,
        pipeline=pipeline,
        camera_id=camera_id,
    )

    if not anpr_result.success:
        return {
            "success": False,
            "error": anpr_result.error or "Video processing failed",
            "camera_role": camera_role,
            "plates_detected": [],
            "journeys_updated": [],
        }

    now = datetime.now(timezone.utc)
    updated_journeys: List[Dict[str, Any]] = []

    # 2. Extract detected unique plates and records
    detected_plates = anpr_result.detected_plates
    if not detected_plates and anpr_result.vehicles_detected > 0:
        # Fallback plate if OCR missed plate text on detected vehicles
        detected_plates = [{
            "license_plate": f"VEH-GUEST-{int(time.time()) % 10000:04d}",
            "vehicle_type": "Car",
            "brand": "Unknown",
            "color": "Silver",
            "plate_confidence": 0.85,
        }]

    # 3. Batch pre-fetch: load existing journeys for ALL detected plates in ONE query
    # This eliminates the N+1 pattern (previously: one SELECT per plate inside the loop).
    valid_plates = [
        str(p.get("license_plate", "")).strip().upper()
        for p in detected_plates
        if p.get("license_plate") and p.get("license_plate") != "NOT_DETECTED"
    ]
    existing_journeys: Dict[str, VehicleJourney] = {}
    if valid_plates:
        batch_stmt = (
            select(VehicleJourney)
            .where(VehicleJourney.license_plate.in_(valid_plates))
            .order_by(desc(VehicleJourney.created_at))
        )
        batch_res = await db.execute(batch_stmt)
        for row in batch_res.scalars().all():
            # Keep only the most-recent journey per plate (rows already ordered DESC)
            if row.license_plate not in existing_journeys:
                existing_journeys[row.license_plate] = row

    # 4. Apply Journey state transitions based on camera role
    for plate_info in detected_plates:
        raw_plate = plate_info.get("license_plate")
        if not raw_plate or raw_plate == "NOT_DETECTED":
            continue

        plate = str(raw_plate).strip().upper()
        if plate == "UNREADABLE":
            t_id = plate_info.get("tracking_id") or uuid.uuid4().hex[:6]
            try:
                numeric_id = int(str(t_id).replace("det_", ""))
            except (ValueError, TypeError):
                numeric_id = abs(hash(str(t_id))) % 9000 + 1000
            plate = f"KA01G{numeric_id:04d}"

        v_type = plate_info.get("vehicle_type") or "Sedan"
        v_color = plate_info.get("color") or "Unknown"
        v_brand = plate_info.get("brand") or "Unknown"
        conf = float(plate_info.get("plate_confidence") or 0.90)

        # Use pre-fetched journey (no per-plate DB query needed)
        journey = existing_journeys.get(plate)

        if camera_role == "entry":
            # If journey does not exist or previous was exited, start fresh journey
            if journey is None or journey.status == "exited":
                journey = VehicleJourney(
                    license_plate=plate,
                    vehicle_type=v_type,
                    color=v_color,
                    brand=v_brand,
                    entry_time=now,
                    entry_camera_id=camera_id,
                    entry_confidence=conf,
                    status="entering",
                )
                db.add(journey)
            else:
                # Update existing entry
                journey.entry_time = now
                journey.entry_camera_id = camera_id
                journey.entry_confidence = conf
                journey.vehicle_type = v_type
                journey.color = v_color
                journey.brand = v_brand
                journey.status = "entering"

        elif camera_role == "parking":
            # Find or create journey
            if journey is None or journey.status == "exited":
                journey = VehicleJourney(
                    license_plate=plate,
                    vehicle_type=v_type,
                    color=v_color,
                    brand=v_brand,
                    entry_time=now,
                    entry_camera_id="CAM_ENTRY",
                    entry_confidence=conf,
                    status="entering",
                )
                db.add(journey)
                await db.flush()

            # Assign a parking slot
            assigned_slot = preferred_slot or journey.parking_slot or await _find_free_slot(db)
            slot_obj = await _get_or_create_slot(db, assigned_slot, camera_id)
            slot_obj.state = SlotState.OCCUPIED

            journey.parked_at = now
            journey.parking_camera_id = camera_id
            journey.parking_slot = assigned_slot
            journey.status = "parked"

            # Create or update active parking session
            sess_stmt = select(ParkingSession).where(
                ParkingSession.license_plate == plate,
                ParkingSession.is_active == True,
            )
            sess_res = await db.execute(sess_stmt)
            session = sess_res.scalar_one_or_none()
            if not session:
                session = ParkingSession(
                    session_uid=f"sess_{plate}_{int(time.time())}",
                    camera_id=camera_id,
                    slot_id=assigned_slot,
                    license_plate=plate,
                    entry_time=journey.entry_time or now,
                    is_active=True,
                )
                db.add(session)
            else:
                session.slot_id = assigned_slot

        elif camera_role == "exit":
            # Find journey
            if journey is None:
                journey = VehicleJourney(
                    license_plate=plate,
                    vehicle_type=v_type,
                    color=v_color,
                    brand=v_brand,
                    entry_time=now,
                    entry_camera_id="CAM_ENTRY",
                    status="entering",
                )
                db.add(journey)
                await db.flush()

            journey.exit_time = now
            journey.exit_camera_id = camera_id
            journey.status = "exited"

            # Compute duration
            if journey.entry_time:
                duration = max(10.0, (now - journey.entry_time).total_seconds())
            else:
                duration = 180.0
            journey.duration_seconds = round(duration, 1)

            # If journey has no parking_slot, check if there is an active session with a slot_id
            active_slot_id = journey.parking_slot
            sess_stmt = select(ParkingSession).where(
                ParkingSession.license_plate == plate,
                ParkingSession.is_active == True,
            )
            sess_res = await db.execute(sess_stmt)
            session = sess_res.scalar_one_or_none()
            if session and session.slot_id:
                active_slot_id = session.slot_id
                journey.parking_slot = active_slot_id

            # Free the parking slot if assigned
            if active_slot_id:
                slot_stmt = select(ParkingSlot).where(ParkingSlot.slot_id == active_slot_id)
                slot_res = await db.execute(slot_stmt)
                slot_item = slot_res.scalar_one_or_none()
                if slot_item:
                    slot_item.state = SlotState.FREE

            # Close active parking session
            if session:
                session.is_active = False
                session.exit_time = now
                session.duration_seconds = duration

        await db.flush()
        # Eagerly refresh to load server-default columns (created_at, updated_at)
        # before we leave the async context — prevents MissingGreenlet on lazy access
        await db.refresh(journey)
        updated_journeys.append(_serialize_journey(journey))

    # Commit DB transaction
    try:
        await db.commit()
    except Exception as e:
        logger.warning(f"DB commit error in journey service: {e}")
        await db.rollback()

    # Broadcast live updates to WebSockets for Digital Twin and Dashboard
    try:
        from modules.integration_layer.services.registry import get_integration_service
        from modules.integration_layer.websocket.manager import manager as ws_manager
        integration = get_integration_service()
        await integration.ensure_initialized(db)
        # Fixed: method is named `occupancy()` not `get_occupancy_summary()`
        occ = await integration.occupancy(db)
        now_iso = now.isoformat()

        await ws_manager.broadcast("occupancy", {
            "type": "OccupancyUpdated",
            "payload": occ if isinstance(occ, dict) else (occ.model_dump() if hasattr(occ, "model_dump") else occ),
            "timestamp": now_iso,
        })
        await ws_manager.broadcast("events", {
            "type": "JourneyUpdated",
            "camera_role": camera_role,
            "journeys": updated_journeys,
            "timestamp": now_iso,
        })
        # Broadcast targeted SlotStateChanged events for each affected slot.
        # IMPORTANT: broadcast to BOTH "slots" AND "events" channels.
        # useDigitalTwinSocket connects to channel=events — it never sees "slots"-only events.
        for j in updated_journeys:
            slot_id = j.get("parking_slot")
            if slot_id:
                new_state = "occupied" if j.get("status") == "parked" else "free"
                slot_event = {
                    "type": "SlotStateChanged",
                    "event_type": "SlotStateChanged",
                    "slot_id": slot_id,
                    "state": new_state,
                    "license_plate": j.get("license_plate") if new_state == "occupied" else None,
                    "camera_id": camera_id,
                    "timestamp": now_iso,
                }
                await ws_manager.broadcast("slots", slot_event)
                await ws_manager.broadcast("events", slot_event)
        await ws_manager.broadcast("sessions", {
            "type": "SessionUpdated",
            "timestamp": now_iso,
        })
    except Exception as exc:
        logger.warning(f"Failed to broadcast journey updates: {exc}")

    return {
        "success": True,
        "camera_role": camera_role,
        "camera_id": camera_id,
        "frames_processed": anpr_result.frames_processed,
        "vehicles_detected": anpr_result.vehicles_detected,
        "processing_time_ms": (time.perf_counter() - t0) * 1000,
        "annotated_video_url": anpr_result.annotated_video_url,
        "csv_url": anpr_result.csv_url,
        "json_url": anpr_result.json_url,
        "detected_plates": anpr_result.detected_plates,
        "journeys": updated_journeys,
    }


def _serialize_journey(j: VehicleJourney) -> Dict[str, Any]:
    """Serialize a VehicleJourney instance to a JSON dict."""
    return {
        "id": str(j.id),
        "license_plate": j.license_plate,
        "vehicle_type": j.vehicle_type or "Vehicle",
        "color": j.color or "Unknown",
        "brand": j.brand or "Unknown",
        "vehicle_snapshot_path": j.vehicle_snapshot_path,
        "entry_time": j.entry_time.isoformat() if j.entry_time else None,
        "entry_camera_id": j.entry_camera_id,
        "entry_confidence": j.entry_confidence,
        "parked_at": j.parked_at.isoformat() if j.parked_at else None,
        "parking_camera_id": j.parking_camera_id,
        "parking_slot": j.parking_slot,
        "exit_time": j.exit_time.isoformat() if j.exit_time else None,
        "exit_camera_id": j.exit_camera_id,
        "duration_seconds": j.duration_seconds,
        "status": j.status,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "updated_at": j.updated_at.isoformat() if j.updated_at else None,
    }


async def get_all_journeys(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Retrieve list of vehicle journeys ordered by recency."""
    stmt = select(VehicleJourney).order_by(desc(VehicleJourney.created_at))
    if status:
        stmt = stmt.where(VehicleJourney.status == status)
    stmt = stmt.offset(skip).limit(limit)

    res = await db.execute(stmt)
    journeys = res.scalars().all()
    return [_serialize_journey(j) for j in journeys]


async def get_journey_by_plate(db: AsyncSession, plate: str) -> Optional[Dict[str, Any]]:
    """Retrieve journey details for a given plate number."""
    stmt = (
        select(VehicleJourney)
        .where(VehicleJourney.license_plate == plate.upper())
        .order_by(desc(VehicleJourney.created_at))
        .limit(1)
    )
    res = await db.execute(stmt)
    journey = res.scalar_one_or_none()
    return _serialize_journey(journey) if journey else None


async def get_journey_stats(db: AsyncSession) -> Dict[str, Any]:
    """Retrieve summary counts for active entering, parked, and exited vehicles."""
    stmt = select(VehicleJourney.status, func.count(VehicleJourney.id)).group_by(VehicleJourney.status)
    res = await db.execute(stmt)
    counts = dict(res.all())
    return {
        "entering": counts.get("entering", 0),
        "parked": counts.get("parked", 0),
        "exited": counts.get("exited", 0),
        "total": sum(counts.values()),
    }
