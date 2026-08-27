"""
ParkTwin AI — pytest configuration (Module 1)
==============================================
Forces a SQLite backend for tests (no PostgreSQL required) and exposes a
temporary asyncio event loop. Heavy model loading is avoided; tests target
pure logic, configuration, the API structure, and the database layer.
"""

import os

# Must be set before backend.core.config / backend.database.session are imported.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_parktwin.db")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest  # noqa: E402

from backend.auth.token import create_access_token


@pytest.fixture
def admin_token() -> str:
    """Create a valid admin JWT token for tests."""
    return create_access_token(subject="admin", role="admin")


@pytest.fixture
def viewer_token() -> str:
    """Create a valid viewer JWT token for tests."""
    return create_access_token(subject="viewer", role="viewer")
