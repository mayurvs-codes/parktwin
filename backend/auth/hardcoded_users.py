"""
ParkTwin AI — Hardcoded Demo & Master Credential Store
=====================================================
Bootstrap credential store loading master/admin/viewer users with bcrypt password verification.
"""

import os
from functools import lru_cache
from typing import Optional
import bcrypt

from backend.auth.models import UserInDB

MASTER_PASSWORD = os.getenv("MASTER_PASSWORD", "master123")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
VIEWER_PASSWORD = os.getenv("VIEWER_PASSWORD", "viewer123")

# Use bcrypt cost factor 4 (minimum) for dev hard-coded passwords.
# Default cost=12 takes ~500ms per hash on CPU — with 3 users and a reload-happy
# uvicorn, that was blocking the event loop for 1.5s on every hot reload.
# Factor 4 is fine for demo credentials that are never used in production.
_BCRYPT_ROUNDS = 4


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hashed password string."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


@lru_cache(maxsize=None)
def _get_hashed(password: str) -> str:
    """Lazily hash a password and cache the result forever (called once per unique password)."""
    return hash_password(password)


def get_user_by_username(username: str) -> Optional[UserInDB]:
    if username == "master":
        return UserInDB(
            username="master",
            role="admin",
            hashed_password=_get_hashed(MASTER_PASSWORD),
        )
    elif username == "admin":
        return UserInDB(
            username="admin",
            role="admin",
            hashed_password=_get_hashed(ADMIN_PASSWORD),
        )
    elif username == "viewer":
        return UserInDB(
            username="viewer",
            role="viewer",
            hashed_password=_get_hashed(VIEWER_PASSWORD),
        )
    return None

