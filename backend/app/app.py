"""
ParkTwin AI — FastAPI Application Factory (Module 1)
=====================================================
Ties together configuration, database lifecycle, AI pipeline model loading,
camera ingestion, and API routers.

This is the single integration point of the system: it is the only module
that wires the ``ai`` (models), ``database``, and ``utils`` layers together.
No other module imports across those boundaries.
"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend import __version__
from backend.core.config import get_settings
from shared.logging import get_logger
from backend.database.session import init_db
from backend.api.dependencies import get_pipeline, get_frame_processor
from backend.api.routers import health, cameras, vehicles, parking
from backend.api.routers.anpr import router as anpr_router
from modules.integration_layer.gateway.router import router as integration_router
from modules.analytics.api.router import router as analytics_router
from modules.reporting.api.router import router as reporting_router
from backend.api.routers.settings import router as settings_router
from backend.api.routers.streams import router as streams_router
from backend.api.routers.journey import router as journey_router



logger = get_logger("api_main")

# Process start time used for uptime reporting in /health.
_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: start DB + models + cameras, then tear down."""

    # 1. Database schema (idempotent create_all + camera seeding).
    try:
        await init_db()
        logger.info("Database initialized.")
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}")

    # 2. Load AI models (GPU/CPU auto-selected). Weights auto-download on first run.
    try:
        pipeline = get_pipeline()
        logger.info(f"AI pipeline ready: {pipeline.is_ready}")
    except Exception as e:
        logger.critical(f"Fatal error loading AI pipeline: {e}")

    # 3. Start configured camera capture threads.
    try:
        fp = get_frame_processor()
        fp.start_all()
        logger.info("Camera capture threads spawned.")
    except Exception as e:
        logger.error(f"Error starting camera streams: {e}")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    try:
        get_frame_processor().stop_all()
    except Exception as e:
        logger.error(f"Error stopping cameras: {e}")

    logger.info("Shutdown complete.")


def _build_cors_origins(settings) -> list[str]:
    """Resolve allowed CORS origins from config, never allowing '*' with credentials."""
    origins = [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
    ]
    for origin in settings.api.cors_origins:
        if origin != "*" and origin not in origins:
            origins.append(origin)
    return origins


def create_app() -> FastAPI:
    """FastAPI application factory."""

    settings = get_settings()

    tags_metadata = [
        {"name": "Health & System", "description": "System health, database connectivity, and pipeline metrics"},
        {"name": "Authentication", "description": "User login, token refresh, and M2M authentication"},
        {"name": "Cameras", "description": "Camera stream registration and configuration"},
        {"name": "Vehicles", "description": "Vehicle detection, tracking, classification, and OCR"},
        {"name": "Parking Intelligence", "description": "Slot management, session tracking, and live occupancy"},
        {"name": "ANPR Workspace", "description": "Standalone ANPR batch video and frame processing"},
        {"name": "Integration Layer", "description": "Unified API gateway, event bus, and WebSocket broadcast"},
        {"name": "Analytics", "description": "Occupancy, traffic, utilization, and trend analytics"},
        {"name": "Reporting Engine", "description": "Report generation, history, preview, and export"},
        {"name": "Settings", "description": "Safe platform configuration and health"},
        {"name": "Meta", "description": "Service root metadata"},
    ]

    from starlette.middleware import Middleware

    app = FastAPI(
        title="ParkTwin AI API",
        description=(
            "Modular, inference-only computer-vision platform for parking intelligence. "
            "Ingests video streams, recognizes vehicles and license plates (ANPR), maps "
            "vehicles to parking slots, tracks sessions, and exposes analytics & reports."
        ),
        version=__version__,
        contact={"name": "ParkTwin AI Team", "email": "support@parktwin.example.com"},
        license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
        openapi_tags=tags_metadata,
        lifespan=lifespan,
        docs_url=settings.api.docs_url,
        redoc_url=settings.api.redoc_url,
        middleware=[
            Middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
        ],
    )

    @app.middleware("http")
    async def add_cors_headers(request: Request, call_next):
        if request.method == "OPTIONS":
            origin = request.headers.get("origin", "*")
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                },
            )
        response = await call_next(request)
        origin = request.headers.get("origin", "*")
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

    # Request ID middleware for contextual structured logging
    import uuid
    from shared.logging.logger import request_id_ctx

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        with logger.contextualize(request_id=request_id):
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            request_id_ctx.reset(token)
            return response

    # Production safety check: warn loudly if the default SECRET_KEY is in use.
    if settings.app.environment == "production" and settings.app.secret_key in {
        "changeme",
        "CHANGE_ME_IN_PRODUCTION",
    }:
        logger.critical(
            "SECURITY: Default SECRET_KEY active in production! "
            "Set a strong SECRET_KEY via environment."
        )

    # Rate limiter setup
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from fastapi import Request, HTTPException
    from fastapi.responses import JSONResponse
    from backend.schemas import ErrorDetail

    import sys
    is_testing = (
        os.environ.get("ENVIRONMENT") == "test"
        or settings.app.environment == "test"
        or os.getenv("PYTEST_CURRENT_TEST") is not None
        or "pytest" in sys.modules
    )

    limiter = Limiter(
        key_func=get_remote_address,
        enabled=not is_testing,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.exception_handler(HTTPException)
    async def custom_http_exception_handler(request: Request, exc: HTTPException):
        if exc.status_code >= 500:
            err = ErrorDetail(detail="Internal server error", code="INTERNAL_SERVER_ERROR")
            return JSONResponse(status_code=exc.status_code, content=err.model_dump())
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=getattr(exc, "headers", None))

    @app.exception_handler(Exception)
    async def global_500_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error: {exc}")
        err = ErrorDetail(detail="Internal server error", code="INTERNAL_SERVER_ERROR")
        return JSONResponse(status_code=500, content=err.model_dump())

    # Authentication router.
    from backend.auth.router import router as auth_router
    app.include_router(auth_router, prefix="/auth")

    # API routers (Module 1 + Module 2).
    app.include_router(health.router)
    app.include_router(cameras.router)
    app.include_router(vehicles.router)
    app.include_router(parking.router)
    # ANPR upload endpoint — user-uploaded video processing.
    app.include_router(anpr_router)
    # Module 3 — Integration Layer: the unified gateway (consumes M1 + M2).
    app.include_router(integration_router)
    # Module 4 — Analytics Engine: consumes the Integration Layer only.
    app.include_router(analytics_router)
    # Module 5 — Reporting Engine: consumes Analytics + Integration Layer only.
    app.include_router(reporting_router)
    # Settings — platform configuration and health.
    app.include_router(settings_router)
    # Camera Streams — live RTSP/USB camera ingestion.
    app.include_router(streams_router)
    # Vehicle Journeys — multi-camera journey lifecycle (entry, parking, exit).
    app.include_router(journey_router)

    # Prometheus Instrumentator (/metrics endpoint)
    from prometheus_fastapi_instrumentator import Instrumentator
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)



    # ── Static file serving (uploads / outputs / snapshots) ───────────────
    # These directories are created at startup by anpr_service; StaticFiles
    # is mounted AFTER routers so the /api routes take precedence.
    _base = Path(__file__).resolve().parents[1]
    for _dir_name, _mount_path in (
        ("uploads", "/uploads"),
        ("outputs", "/outputs"),
        ("snapshots", "/snapshots"),
    ):
        _dir = _base / _dir_name
        _dir.mkdir(parents=True, exist_ok=True)
        app.mount(_mount_path, StaticFiles(directory=str(_dir)), name=_dir_name)

    @app.get("/", tags=["Meta"])
    async def root() -> Dict[str, Any]:
        return {
            "service": "ParkTwin AI",
            "module": "vehicle_recognition_anpr",
            "version": settings.app.version,
            "docs": settings.api.docs_url,
        }

    return app


app = create_app()
