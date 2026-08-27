"""
ParkTwin AI — Structured JSON Logger
=====================================
Provides custom structured logging for detection events, OCR confidences,
database operations, and errors using loguru, enriched with request_id context.
"""

import os
import sys
from contextvars import ContextVar
from loguru import logger

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

# ─── Config ───────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_DIR = os.getenv("LOG_DIR", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Remove default logger
logger.remove()

def _format_record(record):
    req_id = record["extra"].get("request_id", request_id_ctx.get())
    req_prefix = f"[{req_id}] " if req_id else ""
    return (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        f"{req_prefix}<level>{{message}}</level>\n"
    )

# Add standard console logger with colors and request_id enrichment
logger.add(
    sys.stderr,
    level=LOG_LEVEL,
    format=_format_record,
    enqueue=True,
)

# Add structured file logger (JSON format)
logger.add(
    os.path.join(LOG_DIR, "parktwin.json.log"),
    level=LOG_LEVEL,
    serialize=True,
    rotation="10 MB",
    retention="1 month",
    enqueue=True,
)


def get_logger(name: str):
    """Return a logger bound with a specific name/context."""
    return logger.bind(module=name)
