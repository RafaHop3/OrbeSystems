from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from database import get_db
from models.users import User

from security.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH,
    verify_password,
    create_access_token
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

from typing import Optional

class LoginSchema(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

@router.post("/login")
@limiter.limit("10/minute")
async def login_for_access_token(request: Request, data: LoginSchema, db: Session = Depends(get_db)):
    """ Secure login endpoint. Admins from .env or users table with superadmin role allowed. """
    from sqlalchemy import text as sa_text
    identity = data.username or data.email
    print(f"[AUTH] Login attempt received for: {identity}")
    
    # 1. DB-backed superadmin check — use raw SQL to avoid UUID coercion issues
    # on the local postgres container where the `users.email` column lookup may
    # be coerced to UUID by the ORM dialect. Explicit ::text cast prevents this.
    user = None
    try:
        row = db.execute(
            sa_text("SELECT email, password_hash, role FROM users WHERE email = CAST(:email AS TEXT) LIMIT 1"),
            {"email": identity}
        ).fetchone()
        if row:
            class _UserProxy:
                email = row[0]
                password_hash = row[1]
                role = row[2]
            user = _UserProxy()
    except Exception as e:
        print(f"[AUTH] DB lookup error: {e}")

    if user and user.role == "superadmin":
        if verify_password(data.password, user.password_hash):
            print(f"[AUTH] DB SuperAdmin authenticated: {identity}")
            access_token = create_access_token(
                data={"sub": user.email, "role": "superadmin", "is_superadmin": True}, 
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {"access_token": access_token, "token_type": "bearer"}


    # 2. Legacy .env fallback check
    if identity != ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ACCESS DENIED: UNKNOWN IDENTITY.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SYSTEM ERROR: Orbe System missing backend auth configuration.",
        )
    
    try:
        if not verify_password(data.password, ADMIN_PASSWORD_HASH):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ACCESS DENIED: INVALID PASSPHRASE.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        print(f"CRITICAL: Auth system failure - {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ACCESS DENIED.")
        
    access_token = create_access_token(
        data={"sub": ADMIN_USERNAME, "role": "superadmin"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
