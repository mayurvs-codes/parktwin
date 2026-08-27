"""
ParkTwin AI — Application entry point
======================================
Launches the FastAPI application (all modules wired in `backend.app.app`) via uvicorn.

Run with:
    python -m backend.main
    # or
    uvicorn backend.app.app:app --reload --port 8000
"""

from backend.core.config import get_settings
from backend.app.app import app


def main() -> None:
    settings = get_settings()
    import uvicorn

    uvicorn.run(
        app,
        host=settings.api.host,
        port=settings.api.port,
        workers=settings.api.workers,
        reload=settings.api.reload,
    )


if __name__ == "__main__":
    main()
