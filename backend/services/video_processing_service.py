"""
ParkTwin AI — Real Video Processing Service
===========================================
Executes the real CV pipeline (YOLOv8 + ByteTrack + PaddleOCR) on video files.
Behavior is strictly controlled by stored Camera Designation:
  - ENTRY: check-in, persistent vehicle identity, VEHICLE_ENTERED event
  - PARKING_LOT: slot association, session opening, SLOT_OCCUPIED event
  - EXIT: session closure, slot freeing, VEHICLE_EXITED event
Dispatches normalized events over WebSocket channels for Digital Twin consumption.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
from sqlalchemy import select, update, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import Video, Camera, Vehicle, CameraRole, DetectionLog
from backend.database.session import AsyncSessionLocal
from modules.parking_intelligence.storage.models import ParkingSlot, ParkingSession, ParkingEvent, SlotState
from modules.parking_intelligence.engine import ParkingIntelligenceEngine
from modules.integration_layer.websocket.manager import manager as ws_manager
from backend.api.dependencies import get_pipeline
from shared.logging import get_logger


logger = get_logger("video_processing")

_PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Active processing tasks and cancellation flags
_active_tasks: Dict[str, asyncio.Task] = {}
_cancel_signals: Dict[str, asyncio.Event] = {}
_task_progress: Dict[str, Dict[str, Any]] = {}
_parking_engine: Optional[ParkingIntelligenceEngine] = None


def get_parking_engine() -> ParkingIntelligenceEngine:
    global _parking_engine
    if _parking_engine is None:
        _parking_engine = ParkingIntelligenceEngine()
    return _parking_engine


async def emit_digital_twin_event(
    event_type: str,
    camera_id: str,
    video_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    plate: Optional[str] = None,
    slot_id: Optional[str] = None,
    status: Optional[str] = None,
    confidence: float = 1.0,
    source_frame: int = 0,
    payload: Optional[Dict[str, Any]] = None,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """Emit standardized event adhering to Digital Twin event contract."""
    evt_uid = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    ts = datetime.now(timezone.utc).isoformat()
    
    event_data = {
        "event_id": evt_uid,
        "timestamp": ts,
        "event_type": event_type,
        "camera_id": camera_id,
        "video_id": video_id,
        "vehicle_id": vehicle_id,
        "plate": plate,
        "slot_id": slot_id,
        "status": status,
        "confidence": round(confidence, 3),
        "source_frame": source_frame,
        "source_video_id": video_id,
        "payload": payload or {},
    }

    # Persist event in DB if session provided
    if db is not None:
        db_evt = ParkingEvent(
            event_uid=evt_uid,
            event_type=event_type,
            camera_id=camera_id,
            slot_id=slot_id,
            license_plate=plate,
            meta=event_data,
        )
        db.add(db_evt)

    # Broadcast to WebSocket channels
    channels = ["events"]
    if slot_id or "SLOT" in event_type:
        channels.extend(["slots", "occupancy"])
    if "SESSION" in event_type:
        channels.append("sessions")
    if vehicle_id or plate or "VEHICLE" in event_type:
        channels.append("vehicles")

    for ch in set(channels):
        try:
            await ws_manager.broadcast(ch, event_data)
        except Exception as e:
            logger.debug(f"Broadcast error on channel {ch}: {e}")

    return event_data


async def _process_video_worker(video_id: str, file_path: Path, camera_id: str, role: str) -> None:
    """Core background worker executing real CV pipeline."""
    cancel_event = _cancel_signals.get(video_id)
    pipeline = get_pipeline()
    pie = get_parking_engine()

    logger.info(f"Starting CV processing: video_id={video_id}, role={role}, camera_id={camera_id}")

    cap = cv2.VideoCapture(str(file_path))
    if not cap.isOpened():
        logger.error(f"Could not open video: {file_path}")
        async with AsyncSessionLocal() as db:
            await db.execute(update(Video).where(Video.id == video_id).values(processing_status="ERROR"))
            await db.commit()
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    # Target ~3 sampled frames/sec to balance deep CV accuracy on CPU with responsiveness
    frame_skip = max(1, int(fps / 3))

    _task_progress[video_id] = {
        "status": "PROCESSING",
        "current_frame": 0,
        "total_frames": total_frames,
        "progress_percent": 0.0,
        "vehicles_detected": 0,
        "camera_role": role,
    }

    await emit_digital_twin_event(
        event_type="VIDEO_STARTED",
        camera_id=camera_id,
        video_id=video_id,
        payload={"total_frames": total_frames, "fps": fps, "role": role},
    )

    frame_idx = 0
    sampled_idx = 0
    detected_count = 0

    try:
        while True:
            if cancel_event and cancel_event.is_set():
                logger.info(f"Cancellation requested for {video_id}.")
                async with AsyncSessionLocal() as db:
                    await db.execute(update(Video).where(Video.id == video_id).values(processing_status="STOPPED"))
                    await db.commit()
                _task_progress[video_id]["status"] = "STOPPED"
                await emit_digital_twin_event(
                    event_type="VIDEO_STOPPED",
                    camera_id=camera_id,
                    video_id=video_id,
                    payload={"reason": "cancelled_by_user", "frames_processed": sampled_idx},
                )
                break

            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_skip == 0:
                sampled_idx += 1
                t_start = time.perf_counter()

                # 1. Run real CV frame inference in worker thread to prevent event-loop starvation
                detection_result = await asyncio.to_thread(pipeline.process_frame, frame, camera_id)
                if isinstance(detection_result, list):
                    records = detection_result
                elif hasattr(detection_result, "vehicles"):
                    records = detection_result.vehicles
                else:
                    records = []
                detected_count += len(records)

                # 2. Process records according to designated camera role
                async with AsyncSessionLocal() as db:
                    cam_res = await db.execute(select(Camera).where(Camera.camera_id == camera_id))
                    cam_obj = cam_res.scalars().first()

                    if role == "PARKING_LOT" and records:
                        # Ingest entire frame records into Parking Intelligence Engine
                        await pie.ingest_frame(db, camera_id, records)

                    for rec in records:
                        plate = getattr(rec, "license_plate", None)
                        plate_raw = getattr(rec, "plate_raw", None)
                        conf = getattr(rec, "plate_confidence", 0.0) or getattr(rec, "detection_confidence", 0.0) or getattr(rec, "confidence", 0.8)
                        track_id = getattr(rec, "tracking_id", None)
                        if track_id is None:
                            track_id = getattr(rec, "track_id", None)
                        v_type = getattr(rec, "vehicle_type", "Car") or "Car"
                        brand = getattr(rec, "brand", "Unknown") or "Unknown"
                        color = getattr(rec, "color", "Unknown") or "Unknown"
                        bbox = getattr(rec, "bbox", None) or []

                        if not plate and plate_raw:
                            plate = plate_raw
                        elif not plate and track_id is not None:
                            plate = f"TRK-{camera_id}-{track_id}"

                        # Look up or create Vehicle in DB
                        veh = None
                        if plate and not plate.startswith("TRK-"):
                            veh_res = await db.execute(select(Vehicle).where(Vehicle.license_plate == plate))
                            veh = veh_res.scalars().first()

                        if not veh and track_id is not None:
                            veh_res = await db.execute(
                                select(Vehicle).where(
                                    Vehicle.tracking_id == track_id,
                                    Vehicle.license_plate.like("TRK-%"),
                                )
                            )
                            veh = veh_res.scalars().first()
                            if veh and plate and not plate.startswith("TRK-"):
                                old_temp_plate = veh.license_plate
                                veh.license_plate = plate
                                veh.plate_confidence = conf
                                if plate_raw:
                                    snaps = dict(veh.snapshots or {}) if isinstance(veh.snapshots, dict) else {}
                                    snaps["raw_ocr"] = plate_raw
                                    snaps["normalized_plate"] = plate
                                    veh.snapshots = snaps
                                # Update any active sessions that held the temporary TRK plate
                                sess_to_update = await db.execute(
                                    select(ParkingSession).where(
                                        or_(
                                            ParkingSession.license_plate == old_temp_plate,
                                            ParkingSession.tracking_id == track_id,
                                        ),
                                        ParkingSession.is_active == True,
                                    )
                                )
                                for s in sess_to_update.scalars().all():
                                    s.license_plate = plate
                                    s.vehicle_id = veh.id

                        if not veh and plate:
                            veh_res = await db.execute(select(Vehicle).where(Vehicle.license_plate == plate))
                            veh = veh_res.scalars().first()

                        if not veh:
                            # Generate persistent proto ID
                            proto_id = f"VH-{uuid.uuid4().hex[:4].upper()}"
                            snapshots_meta = {
                                "raw_ocr": plate_raw,
                                "normalized_plate": plate,
                                "ocr_engine": getattr(rec, "ocr_engine", "paddleocr"),
                            }
                            veh = Vehicle(
                                prototype_id=proto_id,
                                license_plate=plate,
                                plate_confidence=conf,
                                vehicle_type=v_type,
                                brand=brand,
                                color=color,
                                status="entering" if role == "ENTRY" else "parked",
                                tracking_id=track_id,
                                bounding_box={"bbox": bbox} if bbox else None,
                                detection_confidence=getattr(rec, "detection_confidence", 0.9),
                                snapshots=snapshots_meta,
                                last_seen=datetime.now(timezone.utc),
                            )
                            db.add(veh)
                            await db.flush()
                        else:
                            veh.plate_confidence = max(veh.plate_confidence or 0.0, conf)
                            veh.tracking_id = track_id or veh.tracking_id
                            if bbox:
                                veh.bounding_box = {"bbox": bbox}
                            if plate_raw:
                                snaps = dict(veh.snapshots or {}) if isinstance(veh.snapshots, dict) else {}
                                snaps["raw_ocr"] = plate_raw
                                snaps["normalized_plate"] = plate
                                veh.snapshots = snaps
                            veh.last_seen = datetime.now(timezone.utc)
                            await db.flush()

                        # Write DetectionLog entry
                        det_log = DetectionLog(
                            camera_id=cam_obj.id if cam_obj else None,
                            vehicle_id=veh.id,
                            tracking_id=track_id,
                            frame_number=sampled_idx,
                            detection_type="vehicle",
                            detected_class=v_type,
                            confidence=getattr(rec, "detection_confidence", 0.9),
                            bounding_box={"bbox": bbox} if bbox else None,
                            license_plate_raw=plate_raw or plate,
                            license_plate_confidence=conf,
                            ocr_engine=getattr(rec, "ocr_engine", "paddleocr"),
                            inference_time_ms=getattr(rec, "inference_time_ms", 0.0),
                            meta={
                                "raw_ocr": plate_raw,
                                "normalized_plate": plate,
                                "track_id": track_id,
                                "camera_id": camera_id,
                            },
                        )
                        db.add(det_log)

                        # ── ROLE: ENTRY ──────────────────────────────────────────
                        if role == "ENTRY":
                            veh.status = "entering"
                            veh.last_seen = datetime.now(timezone.utc)
                            await db.flush()

                            await emit_digital_twin_event(
                                event_type="VEHICLE_ENTERED",
                                camera_id=camera_id,
                                video_id=video_id,
                                vehicle_id=veh.prototype_id,
                                plate=plate,
                                status="entering",
                                confidence=conf,
                                source_frame=sampled_idx,
                                payload={
                                    "raw_ocr": plate_raw,
                                    "raw_plate": plate_raw,
                                    "normalized_plate": plate,
                                    "track_id": track_id,
                                    "vehicle_type": v_type,
                                    "color": color,
                                    "brand": brand,
                                },
                                db=db,
                            )

                        # ── ROLE: PARKING_LOT ────────────────────────────────────
                        elif role == "PARKING_LOT":
                            assigned_slot = pie.get_current_assignment(camera_id, track_id) if track_id else None

                            if not assigned_slot:
                                # Infer from floor plan slots matching this camera (geometric or free)
                                slot_res = await db.execute(
                                    select(ParkingSlot).where(
                                        ParkingSlot.camera_id == camera_id,
                                        ParkingSlot.state == SlotState.FREE
                                    )
                                )
                                free_slots = list(slot_res.scalars().all())
                                if free_slots and bbox and len(bbox) == 4:
                                    cx = (bbox[0] + bbox[2]) / 2.0
                                    cy = (bbox[1] + bbox[3]) / 2.0
                                    best_s = None
                                    best_dist = float("inf")
                                    for fs in free_slots:
                                        if fs.position and len(fs.position) == 4:
                                            scx = (fs.position[0] + fs.position[2]) / 2.0
                                            scy = (fs.position[1] + fs.position[3]) / 2.0
                                            d = ((cx - scx)**2 + (cy - scy)**2)**0.5
                                            if d < best_dist:
                                                best_dist = d
                                                best_s = fs
                                    if best_s and best_dist <= 0.35:
                                        assigned_slot = best_s.slot_id
                                    elif free_slots:
                                        assigned_slot = free_slots[0].slot_id
                                elif free_slots:
                                    assigned_slot = free_slots[0].slot_id

                            if assigned_slot:
                                # Mark slot occupied
                                slot_obj = (await db.execute(
                                    select(ParkingSlot).where(
                                        ParkingSlot.slot_id == assigned_slot,
                                        ParkingSlot.camera_id == camera_id
                                    )
                                )).scalars().first()
                                if not slot_obj:
                                    slot_obj = (await db.execute(
                                        select(ParkingSlot).where(ParkingSlot.slot_id == assigned_slot)
                                    )).scalars().first()
                                if slot_obj:
                                    slot_obj.state = SlotState.OCCUPIED

                                # Check or create active session
                                sess_res = await db.execute(
                                    select(ParkingSession).where(
                                        ParkingSession.slot_id == assigned_slot,
                                        ParkingSession.is_active == True
                                    )
                                )
                                existing_sess = sess_res.scalars().first()
                                if not existing_sess:
                                    new_sess = ParkingSession(
                                        session_uid=f"SES-{veh.prototype_id or plate}-{assigned_slot}",
                                        camera_id=camera_id,
                                        slot_id=assigned_slot,
                                        vehicle_id=veh.id,
                                        license_plate=plate,
                                        tracking_id=track_id,
                                        entry_time=datetime.now(timezone.utc),
                                        is_active=True,
                                    )
                                    db.add(new_sess)
                                else:
                                    if not existing_sess.vehicle_id or (veh and existing_sess.vehicle_id != veh.id and existing_sess.license_plate and existing_sess.license_plate.startswith("TRK-")):
                                        existing_sess.vehicle_id = veh.id
                                    if not existing_sess.license_plate or (plate and not plate.startswith("TRK-")):
                                        existing_sess.license_plate = plate
                                    if track_id is not None and not existing_sess.tracking_id:
                                        existing_sess.tracking_id = track_id

                                veh.status = "parked"
                                veh.last_seen = datetime.now(timezone.utc)
                                await db.flush()

                                await emit_digital_twin_event(
                                    event_type="SLOT_OCCUPIED",
                                    camera_id=camera_id,
                                    video_id=video_id,
                                    vehicle_id=veh.prototype_id,
                                    plate=plate,
                                    slot_id=assigned_slot,
                                    status="parked",
                                    confidence=conf,
                                    source_frame=sampled_idx,
                                    payload={
                                        "raw_ocr": plate_raw,
                                        "raw_plate": plate_raw,
                                        "normalized_plate": plate,
                                        "track_id": track_id,
                                        "vehicle_type": v_type,
                                        "color": color,
                                        "brand": brand,
                                        "slot_id": assigned_slot,
                                        "ocr_provenance": f"raw={plate_raw}, normalized={plate}, conf={round(conf, 3)}",
                                    },
                                    db=db,
                                )

                        # ── ROLE: EXIT ───────────────────────────────────────────
                        elif role == "EXIT":
                            # Exit detected: find active session and free slot
                            sess_res = await db.execute(
                                select(ParkingSession).where(
                                    ParkingSession.license_plate == plate,
                                    ParkingSession.is_active == True
                                )
                            )
                            active_sess = sess_res.scalars().first()
                            freed_slot = None

                            if active_sess:
                                active_sess.is_active = False
                                now_utc = datetime.now(timezone.utc)
                                active_sess.exit_time = now_utc
                                entry_dt = active_sess.entry_time
                                if entry_dt:
                                    if entry_dt.tzinfo is None:
                                        entry_dt = entry_dt.replace(tzinfo=timezone.utc)
                                    dur = (now_utc - entry_dt).total_seconds()
                                    active_sess.duration_seconds = max(0.0, dur)
                                freed_slot = active_sess.slot_id

                                if freed_slot:
                                    slot_obj = (await db.execute(
                                        select(ParkingSlot).where(ParkingSlot.slot_id == freed_slot)
                                    )).scalars().first()
                                    if slot_obj:
                                        slot_obj.state = SlotState.FREE

                            veh.status = "exited"
                            veh.last_seen = datetime.now(timezone.utc)
                            await db.flush()

                            await emit_digital_twin_event(
                                event_type="VEHICLE_EXITED",
                                camera_id=camera_id,
                                video_id=video_id,
                                vehicle_id=veh.prototype_id,
                                plate=plate,
                                slot_id=freed_slot,
                                status="exited",
                                confidence=conf,
                                source_frame=sampled_idx,
                                db=db,
                            )
                            if freed_slot:
                                await emit_digital_twin_event(
                                    event_type="SLOT_FREED",
                                    camera_id=camera_id,
                                    video_id=video_id,
                                    slot_id=freed_slot,
                                    status="free",
                                    source_frame=sampled_idx,
                                    db=db,
                                )

                    await db.commit()

                # Update live progress state
                pct = round((frame_idx / max(1, total_frames)) * 100, 1)
                _task_progress[video_id]["current_frame"] = frame_idx
                _task_progress[video_id]["progress_percent"] = pct
                _task_progress[video_id]["vehicles_detected"] = detected_count

                # Yield control to event loop so HTTP requests and WebSockets stay responsive
                await asyncio.sleep(0.01)

            frame_idx += 1

        # Completed natural end of file
        if not cancel_event or not cancel_event.is_set():
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Video)
                    .where(Video.id == video_id)
                    .values(
                        processing_status="COMPLETED",
                        processed_at=datetime.now(timezone.utc)
                    )
                )
                await db.commit()

            _task_progress[video_id]["status"] = "COMPLETED"
            _task_progress[video_id]["progress_percent"] = 100.0
            await emit_digital_twin_event(
                event_type="VIDEO_STOPPED",
                camera_id=camera_id,
                video_id=video_id,
                payload={"status": "completed", "total_sampled_frames": sampled_idx},
            )
            logger.info(f"Video {video_id} processing completed successfully.")

    except Exception as e:
        logger.error(f"Error during video processing {video_id}: {e}", exc_info=True)
        async with AsyncSessionLocal() as db:
            await db.execute(update(Video).where(Video.id == video_id).values(processing_status="ERROR"))
            await db.commit()
        if video_id in _task_progress:
            _task_progress[video_id]["status"] = "ERROR"
            _task_progress[video_id]["error"] = str(e)
    finally:
        cap.release()
        _active_tasks.pop(video_id, None)
        _cancel_signals.pop(video_id, None)


async def start_video_processing(video_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Trigger background CV processing task for video."""
    video = await db.get(Video, video_id)
    if not video:
        raise ValueError(f"Video '{video_id}' not found.")

    if video_id in _active_tasks and not _active_tasks[video_id].done():
        return {
            "status": "already_processing",
            "video_id": video_id,
            "progress": _task_progress.get(video_id, {}),
        }

    # Determine camera role
    cam_id = video.camera_id or "CAM-01"
    cam = (await db.execute(select(Camera).where(Camera.camera_id == cam_id))).scalar_one_or_none()
    role = cam.role if cam and cam.role and cam.role != "UNKNOWN" else "PARKING_LOT"

    # Absolute file path
    abs_path = _PROJECT_ROOT / video.file_path

    # Mark PROCESSING in DB
    video.processing_status = "PROCESSING"
    await db.commit()

    cancel_sig = asyncio.Event()
    _cancel_signals[video_id] = cancel_sig
    task = asyncio.create_task(_process_video_worker(video_id, abs_path, cam_id, role))
    _active_tasks[video_id] = task

    return {
        "status": "started",
        "video_id": video_id,
        "camera_id": cam_id,
        "camera_role": role,
    }


async def stop_video_processing(video_id: str) -> Dict[str, Any]:
    """Signal background CV task to stop immediately."""
    if video_id in _cancel_signals:
        _cancel_signals[video_id].set()
        return {"status": "stopping", "video_id": video_id}
    return {"status": "not_running", "video_id": video_id}


def get_processing_status(video_id: str) -> Dict[str, Any]:
    """Retrieve live processing progress."""
    if video_id in _task_progress:
        return _task_progress[video_id]
    return {"status": "IDLE", "progress_percent": 0.0}
