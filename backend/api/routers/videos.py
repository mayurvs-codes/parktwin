"""
ParkTwin AI — Videos Router
===========================
Exposes REST endpoints for the Video Library and Video Processing workflow:
  - GET /videos: list discovered videos and hierarchical tree (Date -> Camera -> Video)
  - GET /videos/{video_id}: get video details, metadata, and live processing status
  - POST /videos/{video_id}/process: start background CV inference loop
  - POST /videos/{video_id}/stop: stop active CV inference loop
  - GET /videos/{video_id}/stream: stream video file to HTML5 player
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_db, require_viewer, require_admin
from backend.services.video_library_service import (
    get_video_hierarchy,
    get_video_by_id,
    scan_and_index_videos,
)
from backend.services.video_processing_service import (
    start_video_processing,
    stop_video_processing,
    get_processing_status,
)
from shared.logging import get_logger

logger = get_logger("videos_router")
_PROJECT_ROOT = Path(__file__).resolve().parents[2]

router = APIRouter(prefix="/videos", tags=["Video Library & Processing"])


@router.get("", summary="List all indexed videos and hierarchical structure")
async def list_videos(
    hierarchical: bool = Query(True, description="Return nested Date -> Camera -> Video tree"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Browse CCTV recordings discovered in videos/ and 27-Aug-2026/."""
    if hierarchical:
        return await get_video_hierarchy(db)
    videos = await scan_and_index_videos(db)
    return {"videos": videos, "total": len(videos)}


@router.get("/{video_id}", summary="Get video metadata and live processing status")
async def get_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Retrieve details, camera association, and live processing status for a video."""
    video = await get_video_by_id(db, video_id)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video '{video_id}' not found.",
        )
    # Merge live processing progress
    live_prog = get_processing_status(video_id)
    video["progress"] = live_prog
    return video


@router.post("/{video_id}/process", summary="Start background CV processing for video")
async def process_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Start real CV processing loop. Behavior is driven by camera designation."""
    try:
        result = await start_video_processing(video_id, db)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Process error for {video_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start processing: {str(e)}",
        )


@router.post("/{video_id}/stop", summary="Stop active video processing")
async def stop_video(
    video_id: str,
    _user=Depends(require_viewer),
) -> Dict[str, Any]:
    """Cancel and stop active video processing worker immediately."""
    result = await stop_video_processing(video_id)
    return result


@router.get("/{video_id}/stream", summary="Stream video file for browser video player")
async def stream_video(
    video_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serve MP4 video stream."""
    video = await get_video_by_id(db, video_id)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video '{video_id}' not found.",
        )
    abs_path = _PROJECT_ROOT / video["file_path"]
    if not abs_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video file on disk not found: {video['file_path']}",
        )
    return FileResponse(path=str(abs_path), media_type="video/mp4")
