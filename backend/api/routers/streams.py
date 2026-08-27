"""
ParkTwin AI — Camera Streams Router
====================================
REST endpoints for starting, stopping, listing, and retrieving live camera stream frames.
Protected by require_admin auth dependency.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from backend.api.dependencies import get_frame_processor, require_admin
from backend.core.config import CameraSource
from engine.frame_processor import FrameProcessor

router = APIRouter(
    prefix="/streams",
    tags=["Streams"],
    dependencies=[Depends(require_admin)],
)


class StartStreamRequest(BaseModel):
    camera_id: str = Field(..., description="Unique camera identifier")
    source_url: str = Field(..., description="RTSP URL, video file path, or USB index ('0')")


class StartStreamResponse(BaseModel):
    camera_id: str
    status: str
    source_url: str


class StopStreamResponse(BaseModel):
    camera_id: str
    status: str


class StreamInfo(BaseModel):
    camera_id: str
    source_url: str
    fps: float
    frame_count: int
    status: str


@router.post("/start", response_model=StartStreamResponse)
async def start_stream(
    payload: StartStreamRequest,
    processor: FrameProcessor = Depends(get_frame_processor),
) -> Dict[str, str]:
    """Start a live camera stream (RTSP URL or USB camera index '0')."""
    source = CameraSource(
        id=payload.camera_id,
        name=payload.camera_id,
        url=payload.source_url,
        enabled=True,
    )
    processor.add_camera(source)
    return {
        "camera_id": payload.camera_id,
        "status": "started",
        "source_url": payload.source_url,
    }


@router.post("/stop", response_model=StopStreamResponse)
async def stop_stream(
    camera_id: str = Query(..., description="Camera ID to stop"),
    processor: FrameProcessor = Depends(get_frame_processor),
) -> Dict[str, str]:
    """Stop an active camera stream."""
    processor.remove_camera(camera_id)
    return {
        "camera_id": camera_id,
        "status": "stopped",
    }


@router.get("", response_model=List[StreamInfo])
async def list_streams(
    processor: FrameProcessor = Depends(get_frame_processor),
) -> List[Dict[str, Any]]:
    """List all active camera streams with connectivity and performance metrics."""
    result = []
    for stream in processor._streams.values():
        result.append({
            "camera_id": stream.source.id,
            "source_url": str(stream.source.url),
            "fps": round(stream.fps, 1),
            "frame_count": stream.frame_count,
            "status": "connected" if stream.is_connected else "disconnected",
        })
    return result


@router.get("/{camera_id}/frame")
async def get_stream_frame(
    camera_id: str,
    processor: FrameProcessor = Depends(get_frame_processor),
) -> Response:
    """Retrieve the latest JPEG frame for a camera stream."""
    frame_bytes = processor.get_latest_frame(camera_id)
    if frame_bytes is None:
        raise HTTPException(status_code=404, detail="No frame available for this stream")
    return Response(content=frame_bytes, media_type="image/jpeg")
