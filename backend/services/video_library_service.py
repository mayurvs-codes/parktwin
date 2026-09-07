"""
ParkTwin AI — Video Library Service
===================================
Discovers, indexes, and extracts metadata from actual CCTV video files
in the repository (videos/ and 27-Aug-2026/).
Provides hierarchical browsing (Date -> Camera -> Video) and persists
index state to the database.
"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import Video, Camera
from shared.logging import get_logger

logger = get_logger("video_library")

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_VIDEO_DIRS = [
    _PROJECT_ROOT / "videos",
    _PROJECT_ROOT / "27-Aug-2026",
]


def _generate_video_id(rel_path: str) -> str:
    """Stable slug/hash ID from relative path."""
    slug = rel_path.lower().replace("\\", "/").replace(" ", "_")
    digest = hashlib.sha256(slug.encode("utf-8")).hexdigest()[:12]
    base_name = Path(slug).stem[:24]
    return f"vid_{base_name}_{digest}"


def _infer_camera_id(filename: str, parent_dir: str) -> str:
    """Infer camera ID from filename or directory."""
    fn_lower = filename.lower()
    if "cam1" in fn_lower or "cam-01" in fn_lower or "entry" in fn_lower:
        return "CAM-01"
    if "cam2" in fn_lower or "cam-02" in fn_lower or "parking_bay" in fn_lower:
        return "CAM-02"
    if "cam3" in fn_lower or "cam-03" in fn_lower or "exit" in fn_lower:
        return "CAM-03"
    if "camera3" in fn_lower or "camera 3" in fn_lower:
        return "CAM-01"
    if "camera16" in fn_lower or "camera 16" in fn_lower or "camera19" in fn_lower:
        return "CAM-02"
    if "camera5" in fn_lower or "camera 5" in fn_lower or "camera20" in fn_lower:
        return "CAM-03"
    return "CAM-UNKNOWN"


def _infer_date(file_path: Path) -> str:
    """Infer recording date from path or modification time."""
    parts = file_path.parts
    for p in parts:
        if "27-aug-2026" in p.lower() or "27-aug" in p.lower():
            return "27-Aug-2026"
    mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
    return mtime.strftime("%Y-%m-%d")


def extract_video_metadata(file_path: Path) -> Dict[str, Any]:
    """Read actual video properties using OpenCV."""
    meta: Dict[str, Any] = {
        "duration_seconds": 0.0,
        "fps": 25.0,
        "resolution": "1280x720",
        "file_size_bytes": file_path.stat().st_size,
    }
    cap = cv2.VideoCapture(str(file_path))
    if cap.isOpened():
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
        dur = round(frame_count / fps, 2) if fps > 0 else 0.0
        meta["duration_seconds"] = dur
        meta["fps"] = round(float(fps), 2)
        meta["resolution"] = f"{width}x{height}"
        cap.release()
    return meta


async def scan_and_index_videos(db: AsyncSession) -> List[Dict[str, Any]]:
    """Scan disk, index newly discovered video files into DB, and return list."""
    discovered: List[Path] = []
    for v_dir in _VIDEO_DIRS:
        if v_dir.is_dir():
            for root, _, files in os.walk(v_dir):
                for f in files:
                    if f.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
                        discovered.append(Path(root) / f)

    video_records = []
    for fpath in discovered:
        rel_path = str(fpath.relative_to(_PROJECT_ROOT)).replace("\\", "/")
        vid_id = _generate_video_id(rel_path)
        
        # Check DB
        existing = await db.get(Video, vid_id)
        if not existing:
            meta = extract_video_metadata(fpath)
            cam_id = _infer_camera_id(fpath.name, str(fpath.parent))
            date_str = _infer_date(fpath)
            new_vid = Video(
                id=vid_id,
                filename=fpath.name,
                file_path=rel_path,
                date=date_str,
                camera_id=cam_id,
                duration_seconds=meta["duration_seconds"],
                fps=meta["fps"],
                resolution=meta["resolution"],
                file_size_bytes=meta["file_size_bytes"],
                processing_status="IDLE",
                meta={"inferred_camera": cam_id, "absolute_path": str(fpath)},
            )
            db.add(new_vid)
            video_records.append(new_vid)
        else:
            video_records.append(existing)

    await db.commit()

    # Query all videos
    res = await db.execute(select(Video).order_by(Video.date.desc(), Video.camera_id, Video.filename))
    all_videos = res.scalars().all()
    return [
        {
            "id": v.id,
            "filename": v.filename,
            "file_path": v.file_path,
            "date": v.date,
            "camera_id": v.camera_id,
            "duration_seconds": v.duration_seconds,
            "fps": v.fps,
            "resolution": v.resolution,
            "file_size_bytes": v.file_size_bytes,
            "processing_status": v.processing_status,
            "processed_at": v.processed_at.isoformat() if v.processed_at else None,
            "stream_url": f"/videos/{Path(v.file_path).name}" if "videos/" in v.file_path else f"/api/v1/videos/{v.id}/stream",
        }
        for v in all_videos
    ]


async def get_video_hierarchy(db: AsyncSession) -> Dict[str, Any]:
    """Returns structured tree: Date -> Camera -> Videos."""
    videos = await scan_and_index_videos(db)
    hierarchy: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

    for v in videos:
        d = v["date"] or "Unknown Date"
        cam = v["camera_id"] or "Unassigned"
        hierarchy.setdefault(d, {}).setdefault(cam, []).append(v)

    return {
        "dates": hierarchy,
        "tree": hierarchy,
        "total_count": len(videos),
        "total_videos": len(videos),
    }


async def get_video_by_id(db: AsyncSession, video_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve single video metadata including camera role and coverage."""
    v = await db.get(Video, video_id)
    if not v:
        return None

    # Fetch camera designation if available
    camera_info = None
    if v.camera_id:
        cam_res = await db.execute(select(Camera).where(Camera.camera_id == v.camera_id))
        cam = cam_res.scalar_one_or_none()
        if cam:
            camera_info = {
                "camera_id": cam.camera_id,
                "name": cam.name,
                "role": cam.role or "UNKNOWN",
                "parking_area": cam.parking_area,
                "slot_group": cam.slot_group,
                "zone": cam.zone,
            }

    return {
        "id": v.id,
        "filename": v.filename,
        "file_path": v.file_path,
        "date": v.date,
        "camera_id": v.camera_id,
        "duration_seconds": v.duration_seconds,
        "fps": v.fps,
        "resolution": v.resolution,
        "file_size_bytes": v.file_size_bytes,
        "processing_status": v.processing_status,
        "processed_at": v.processed_at.isoformat() if v.processed_at else None,
        "stream_url": f"/videos/{Path(v.file_path).name}" if "videos/" in v.file_path else f"/api/v1/videos/{v.id}/stream",
        "camera": camera_info,
        "meta": v.meta,
    }


async def update_video_status(db: AsyncSession, video_id: str, status: str) -> Optional[Video]:
    """Update processing status for a video record."""
    v = await db.get(Video, video_id)
    if v:
        v.processing_status = status
        await db.commit()
        await db.refresh(v)
    return v
