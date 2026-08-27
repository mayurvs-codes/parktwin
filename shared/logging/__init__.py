"""ParkTwin AI — Shared logging (re-exports the application logger)."""

from shared.logging.logger import get_logger

__all__ = ["get_logger"]
