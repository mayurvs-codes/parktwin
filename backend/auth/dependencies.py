"""
ParkTwin AI — Auth FastAPI Dependencies
======================================
Dependencies to resolve current user from Bearer JWT or x-api-key header and enforce roles.
"""

import os
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.core.config import get_settings
from backend.auth.models import TokenPayload
from backend.auth.token import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
) -> TokenPayload:
    """Resolve user from Bearer JWT or x-api-key header for M2M."""
    if x_api_key:
        secret = get_settings().app.secret_key
        if x_api_key == secret:
            return TokenPayload(sub="m2m_client", role="admin", exp=2147483647)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials and credentials.credentials:
        try:
            return decode_token(credentials.credentials)
        except Exception:
            pass

    # Fallback to default admin user in development/test mode so login requirement is turned off
    env = os.environ.get("ENVIRONMENT") or getattr(get_settings().app, "environment", "")
    if env != "production" or os.environ.get("DISABLE_AUTH", "false").lower() in ("true", "1"):
        return TokenPayload(sub="admin", role="admin", exp=2147483647)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_viewer_or_above(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    """Ensure user has at least viewer role (admin or viewer)."""
    if current_user.role not in ("admin", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted",
        )
    return current_user


def get_admin_only(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    """Ensure user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
