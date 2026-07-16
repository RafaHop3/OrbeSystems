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
from typing import Optional

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
@limiter.limit("3/minute")  # Reduced from 5 → 3 to limit account farming
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

    # Password strength: min 8 chars + at least 1 digit
    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters.",
        )
    if not any(c.isdigit() for c in data.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain at least one number.",
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

    # Audit log with requester IP
    forwarded = request.headers.get("x-forwarded-for", request.client.host if request.client else "Unknown")
    requester_ip = forwarded.split(",")[0].strip()
    print(f"[Users] [REGISTER] email={new_user.email} id={new_user.id} ip={requester_ip}")
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

    print(f"[Users] [LOGIN] {user.email} | role={user.role}")
    return _build_token(user)


class PasskeyLoginSchema(BaseModel):
    """
    Discoverable Credential Login Schema.
    - `email`: extraído do userHandle gravado no dispositivo.
    - `credential_id`: fallback — lookup via credentialId se userHandle ausente.
    Ambos são opcionais individualmente, mas pelo menos um deve estar presente.
    """
    email: Optional[EmailStr] = None
    credential_id: Optional[str] = None


@router.post("/passkey-login")
@limiter.limit("10/minute")
async def passkey_login(
    request: Request,
    data: PasskeyLoginSchema,
    db: Session = Depends(get_db),
):
    """
    STUB — WebAuthn FIDO2 challenge verification not yet implemented.
    This endpoint MUST NOT issue a JWT without verifying a signed WebAuthn assertion.
    Until the full FIDO2 flow (challenge generation → assertion verification) is built,
    this endpoint returns 501 to prevent accidental authentication bypass.

    Ref: https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion
    """
    # SECURITY: Do NOT issue a JWT here until WebAuthn assertion verification is implemented.
    # The previous implementation looked up a user by email/credential_id and returned a token
    # without any cryptographic proof — effectively bypassing authentication.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Passkey authentication is not yet fully implemented. Please use email/password login.",
    )


