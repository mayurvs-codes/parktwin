"""
ParkTwin AI — Unit Tests for Authentication System
===================================================
Tests token creation, decoding, expiration, password verification, and dependency 401 raises.
"""

from datetime import timedelta
import pytest
from fastapi import HTTPException

from backend.auth.models import TokenPayload
from backend.auth.token import (
    block_token,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.auth.hardcoded_users import get_user_by_username, verify_password
from backend.auth.dependencies import get_current_user, get_admin_only, get_viewer_or_above


def test_create_and_decode_access_token():
    token = create_access_token(subject="admin", role="admin")
    assert isinstance(token, str)
    payload = decode_token(token)
    assert isinstance(payload, TokenPayload)
    assert payload.sub == "admin"
    assert payload.role == "admin"


def test_create_and_decode_refresh_token():
    token = create_refresh_token(subject="viewer", role="viewer")
    assert isinstance(token, str)
    payload = decode_token(token)
    assert payload.sub == "viewer"
    assert payload.role == "viewer"


def test_token_expiration_raises_401():
    expired_token = create_access_token(
        subject="admin",
        role="admin",
        expires_delta=timedelta(seconds=-10),
    )
    with pytest.raises(HTTPException) as exc_info:
        decode_token(expired_token)
    assert exc_info.value.status_code == 401


def test_revoked_token_raises_401():
    token = create_access_token(subject="user1", role="viewer")
    block_token(token)
    with pytest.raises(HTTPException) as exc_info:
        decode_token(token)
    assert exc_info.value.status_code == 401
    assert "revoked" in exc_info.value.detail.lower()


def test_missing_or_invalid_credentials_raises_401(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    from backend.core.config import get_settings
    get_settings.cache_clear()
    try:
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials=None, x_api_key=None)
        assert exc_info.value.status_code == 401
    finally:
        get_settings.cache_clear()


def test_m2m_api_key_authentication():
    from backend.core.config import get_settings
    secret = get_settings().app.secret_key
    payload = get_current_user(credentials=None, x_api_key=secret)
    assert payload.sub == "m2m_client"
    assert payload.role == "admin"


def test_role_checking_wrappers():
    admin_payload = TokenPayload(sub="admin", role="admin", exp=9999999999)
    viewer_payload = TokenPayload(sub="viewer", role="viewer", exp=9999999999)
    guest_payload = TokenPayload(sub="guest", role="guest", exp=9999999999)

    assert get_admin_only(admin_payload) == admin_payload
    with pytest.raises(HTTPException) as exc1:
        get_admin_only(viewer_payload)
    assert exc1.value.status_code == 403

    assert get_viewer_or_above(viewer_payload) == viewer_payload
    assert get_viewer_or_above(admin_payload) == admin_payload
    with pytest.raises(HTTPException) as exc2:
        get_viewer_or_above(guest_payload)
    assert exc2.value.status_code == 403


def test_demo_user_verification():
    master = get_user_by_username("master")
    assert master is not None
    assert master.username == "master"
    assert master.role == "admin"
    assert verify_password("master123", master.hashed_password)

    user = get_user_by_username("admin")
    assert user is not None
    assert user.username == "admin"
    assert user.role == "admin"
    assert verify_password("admin123", user.hashed_password)
    assert not verify_password("wrongpassword", user.hashed_password)

    viewer = get_user_by_username("viewer")
    assert viewer is not None
    assert viewer.role == "viewer"
    assert verify_password("viewer123", viewer.hashed_password)
