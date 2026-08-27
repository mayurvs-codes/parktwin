"""
ParkTwin AI — Auth Router
=========================
REST endpoints for authentication: login, refresh, logout, and current user profile.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.auth.models import LoginRequest, RefreshRequest, TokenPayload, TokenResponse
from backend.auth.hardcoded_users import get_user_by_username, verify_password
from backend.auth.token import (
    block_token,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.auth.dependencies import get_current_user

router = APIRouter(tags=["Authentication"])
security = HTTPBearer(auto_error=False)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest) -> TokenResponse:
    """Authenticate user and issue JWT access and refresh tokens."""
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.username, role=user.role)
    refresh_token = create_refresh_token(subject=user.username, role=user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=3600,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest) -> TokenResponse:
    """Refresh JWT access token using a valid refresh token."""
    if not body.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="refresh_token is required",
        )
    payload = decode_token(body.refresh_token)
    access_token = create_access_token(subject=payload.sub, role=payload.role)
    new_refresh_token = create_refresh_token(subject=payload.sub, role=payload.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=3600,
    )


@router.post("/logout")
def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Revoke active access token."""
    if credentials and credentials.credentials:
        block_token(credentials.credentials)
    return {"message": "Successfully logged out"}


@router.get("/me")
def me(current_user: TokenPayload = Depends(get_current_user)) -> dict:
    """Return profile details for authenticated user."""
    return {
        "username": current_user.sub,
        "role": current_user.role,
        "expires_at": current_user.exp,
    }
