"""
security/auth.py — OrbeSystems Auth Engine
════════════════════════════════════════════
Dual-domain authentication:

  [ADMIN DOMAIN]  — env-var credentials, unchanged, full admin access
  [USER DOMAIN]   — DB-backed, role-aware JWT (role + is_premium claims)

JWT Payload structure (User Domain):
  {
    "sub": "user@email.com",
    "role": "premium",       # "user" | "premium"
    "is_premium": true,
    "exp": 1234567890
  }
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Cookie, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from config import settings
from database import get_db

# ── Shared JWT Config ─────────────────────────────────────────────────────────
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# ── Admin Domain (unchanged) ──────────────────────────────────────────────────
ADMIN_USERNAME = settings.ADMIN_USERNAME
ADMIN_PASSWORD_HASH = settings.ADMIN_PASSWORD_HASH

# Custom OAuth2 scheme that reads from both Authorization header and cookie
class TokenFromCookieOrHeader:
    async def __call__(self, authorization: Optional[str] = Header(None), orbe_auth_token: Optional[str] = Cookie(None)):
        if authorization:
            # Extract token from "Bearer <token>" format
            if authorization.startswith("Bearer "):
                return authorization[7:]
            return authorization
        if orbe_auth_token:
            return orbe_auth_token
        return None

oauth2_scheme = TokenFromCookieOrHeader()


# ── Password Utilities (shared by both domains) ───────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


# ── Token Factory ─────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generic JWT factory — used by both admin and user domains."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=15)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_user_access_token(user_email: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a JWT for a regular user with role claims injected.
    The 'is_premium' boolean avoids repeated role string comparisons on the frontend.
    """
    return create_access_token(
        data={
            "sub": user_email,
            "role": role,
            "is_premium": role == "premium",
        },
        expires_delta=expires_delta,
    )


# ── Admin Domain Dependency (unchanged behaviour) ─────────────────────────────
async def get_current_admin_user(token: str = Depends(oauth2_scheme)):
    """Validates the JWT and ensures the caller is the sysadmin (ADMIN domain)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if username != ADMIN_USERNAME:
        raise credentials_exception

    return username


# ── User Domain Dependencies ──────────────────────────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Validates a user JWT and returns the User ORM object from DB.
    Used as a FastAPI dependency on protected user endpoints.
    """
    from models.users import User  # Late import to avoid circular dependency

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        # Ensure this is a user token (has role claim), not an admin token
        if email is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user


async def require_premium(current_user=Depends(get_current_user)):
    """
    Dependency that raises HTTP 403 if the user is not a Premium subscriber.
    Usage: async def my_route(user = Depends(require_premium)): ...
    """
    if current_user.role != "premium":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PREMIUM subscription required. Upgrade at /assinar.",
        )
    return current_user


async def get_current_user_optional(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Validates a user JWT and returns the User ORM object from DB.
    Returns None if no token is provided or if token is invalid.
    Used for endpoints that work with or without authentication.
    """
    from models.users import User  # Late import to avoid circular dependency

    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role is None:
            return None
    except JWTError:
        return None

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        return None

    return user

