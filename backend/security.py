"""Security primitives — JWT, password hashing, per-IP throttle, auth dependencies.

Kept in its own module (no import of `main`) so routers and the app can share
these without circular imports.
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# ── JWT config ───────────────────────────────────────────────────────────────
_jwt_env = os.getenv("JWT_SECRET")
if _jwt_env:
    JWT_SECRET = _jwt_env
elif os.getenv("ENV", "development").lower() == "production":
    # Hard-fail in production — a random per-process secret invalidates tokens on every restart
    raise RuntimeError("JWT_SECRET must be set in the environment for production")
else:
    JWT_SECRET = secrets.token_hex(32)
    print("[security] WARNING: JWT_SECRET not set, using random dev secret (tokens invalidated on restart)")

JWT_ALG = "HS256"
USER_TOKEN_HOURS = 24 * 7   # user sessions: 7 days
ADMIN_TOKEN_HOURS = 1       # admin sessions: 1 hour (auto-logout)

_bearer = HTTPBearer(auto_error=False)

# Pragmatic email shape check: non-empty local + domain with a dotted TLD.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── Per-IP throttle ──────────────────────────────────────────────────────────
_ip_throttle: dict[str, list[float]] = {}


def throttle(request: Request, bucket: str, max_hits: int, window_sec: int) -> None:
    """Raise 429 if a single IP exceeds max_hits within window_sec for this bucket."""
    ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{ip}"
    now = datetime.utcnow().timestamp()
    hits = [t for t in _ip_throttle.get(key, []) if now - t < window_sec]
    if len(hits) >= max_hits:
        raise HTTPException(429, "Too many requests. Please wait and try again.")
    hits.append(now)
    _ip_throttle[key] = hits


# ── Tokens ───────────────────────────────────────────────────────────────────
def create_token(sub: str, role: str, hours: float) -> str:
    now = datetime.utcnow()
    payload = {"sub": sub, "role": role, "iat": now, "exp": now + timedelta(hours=hours)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """FastAPI dependency: validates the Bearer JWT, returns its payload."""
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        return jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_admin(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """Admin guard — returns 403 for any auth failure (no token, bad token, wrong role)."""
    if not creds:
        raise HTTPException(403, "Admin access required")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(403, "Admin access required")
    if payload.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return payload


# ── Password hashing (PBKDF2-HMAC-SHA256, per-user salt) ─────────────────────
def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
        return secrets.compare_digest(check, digest)
    except Exception:  # noqa: BLE001
        return False
