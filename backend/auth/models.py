"""
ParkTwin AI — Auth Pydantic Schemas
"""

from typing import Optional
from pydantic import BaseModel


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserInDB(BaseModel):
    username: str
    role: str
    hashed_password: str
