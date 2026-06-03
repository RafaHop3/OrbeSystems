"""
routes/users.py — User Authentication Routes (Public Domain)
════════════════════════════════════════════════════════════
POST /api/users/register  — Cadastro + auto-login
POST /api/users/login     — Login retorna JWT com role
GET  /api/users/me        — Dados do usuário autenticado

SECURITY: Rate limiting 5-10/min per IP. Passwords min 8 chars.
JWT is returned to frontend which stores it in an httpOnly cookie
via Next.js Server Action (never in localStorage).
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from database import get_db
from models.users import User, UserRole, UserSubscription
from security.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_user_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ── Schemas ───────────────────────────────────────────────────────────────────
class RegisterSchema(BaseModel):
    email: EmailStr
    password: str


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def _build_token(user: User) -> dict:
    """Generates the standard token response payload."""
    token = create_user_access_token(
        user_email=user.email,
        role=user.role,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer", "user": user.to_dict()}


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: RegisterSchema,
    db: Session = Depends(get_db),
):
    """
    Registers a new user and returns a JWT immediately (frictionless onboarding).
    Account is active on creation (role='user'). Email verification can be
    added in Fase 1.5 via the is_email_verified field.
    """
    # Duplicate check
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    # Minimum password strength
    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )

    new_user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
    )
    new_user.role = "user"
    new_user.subscription_status = "none"
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    print(f"[Users] ✅ New registration: {new_user.email} (id={new_user.id})")
    return _build_token(new_user)


@router.post("/login")
@limiter.limit("10/minute")
async def login(
    request: Request,
    data: LoginSchema,
    db: Session = Depends(get_db),
):
    """
    Authenticates a user by email + password.
    Returns JWT with role and is_premium claims embedded.
    Frontend stores the token in an httpOnly cookie via Server Action.
    """
    user = db.query(User).filter(User.email == data.email).first()

    # Intentionally generic error to prevent email enumeration attacks
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    print(f"[Users] 🔐 Login: {user.email} | role={user.role}")
    return _build_token(user)
