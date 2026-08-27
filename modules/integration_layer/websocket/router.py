"""
ParkTwin AI — WebSocket Router (Integration Layer)
================================================
Exposes live updates over a single WebSocket endpoint. The endpoint only
*transports* messages — the :class:`ConnectionManager` (and therefore this
router) contains no parking/business logic. The IntegrationService decides
what to broadcast and to which channel.
"""

from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from ..websocket.manager import manager

router = APIRouter(tags=["Live Updates"])


@router.websocket("/ws")
async def integration_ws(
    websocket: WebSocket,
    channel: str = Query("events", description="One of: vehicles | occupancy | sessions | events | slots"),
    token: Optional[str] = Query(None, description="JWT Bearer token"),
) -> None:
    """Subscribe to live integration updates for one channel.

    Example: ``ws://host/integration/ws?channel=occupancy&token=...``
    The connection stays open and receives JSON push messages; client-sent
    frames are treated as heartbeats and ignored.
    """
    await manager.connect(websocket, channel, token=token)
    try:
        while True:
            await websocket.receive_text()  # heartbeat / ignored
    except WebSocketDisconnect:
        await manager.disconnect(websocket, channel)
    except Exception:
        await manager.disconnect(websocket, channel)
