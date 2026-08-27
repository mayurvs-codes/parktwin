"""
ParkTwin AI — JWT Token Management
==================================
Create access and refresh tokens, decode tokens, and maintain revocation blocklist.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Set
try:
    from jose import JWTError, jwt
except ImportError:
    import jwt  # type: ignore
    JWTError = getattr(jwt, "PyJWTError", Exception)
from fastapi import HTTPException, status

from backend.core.config import get_settings
from backend.auth.models import TokenPayload

ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60
DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS = 7

REVOKED_TOKENS: Set[str] = set()


def block_token(token: str) -> None:
    REVOKED_TOKENS.add(token)


def is_token_blocked(token: str) -> bool:
    return token in REVOKED_TOKENS


def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    secret_key = get_settings().app.secret_key
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": subject,
        "role": role,
        "exp": int(expire.timestamp()),
        "token_type": "access",
    }
    return jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    secret_key = get_settings().app.secret_key
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": subject,
        "role": role,
        "exp": int(expire.timestamp()),
        "token_type": "refresh",
    }
    return jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    if is_token_blocked(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    secret_key = get_settings().app.secret_key
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        role: str = payload.get("role")
        exp: int = payload.get("exp")
        if sub is None or role is None or exp is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return TokenPayload(sub=sub, role=role, exp=exp)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
