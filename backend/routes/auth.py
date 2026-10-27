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
    identity = (data.username or data.email or "").strip()
    raw_id = identity.lower()
    base_prefix = raw_id[:-6] if raw_id.endswith("_admin") else raw_id
    print(f"[AUTH] Login attempt received for: {identity}")
    
    # 1. DB-backed superadmin/admin check — use raw SQL to avoid UUID coercion issues
    user = None
    try:
        row = db.execute(
            sa_text(
                "SELECT email, password_hash, role FROM users "
                "WHERE LOWER(CAST(email AS TEXT)) IN (:raw_id, :raw_email, :prefix_email) "
                "LIMIT 1"
            ),
            {
                "raw_id": raw_id,
                "raw_email": f"{raw_id}@orbesystems.com.br",
                "prefix_email": f"{base_prefix}@orbesystems.com.br",
            },
        ).fetchone()
        if row:
            class _UserProxy:
                email = row[0]
                password_hash = row[1]
                role = str(row[2] or "").lower()
            user = _UserProxy()
    except Exception as e:
        print(f"[AUTH] DB lookup error: {e}")

    raw_pwd = data.password or ""
    trimmed_pwd = raw_pwd.strip()

    if user and user.role in ("superadmin", "super_admin", "admin", "master"):
        try:
            pwd_ok = verify_password(raw_pwd, user.password_hash) or (
                raw_pwd != trimmed_pwd and verify_password(trimmed_pwd, user.password_hash)
            )
        except Exception:
            pwd_ok = False
        if pwd_ok:
            print(f"[AUTH] DB Admin authenticated: {user.email} (role={user.role})")
            access_token = create_access_token(
                data={"sub": user.email, "role": "superadmin", "is_superadmin": True}, 
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {"access_token": access_token, "token_type": "bearer"}

    # 2. Legacy .env fallback check (accepts ADMIN_USERNAME, rafael_admin, or rafael@orbesystems.com.br)
    allowed_env_identities = {
        (ADMIN_USERNAME or "").strip().lower(),
        "rafael_admin",
        "rafael@orbesystems.com.br",
        "rafael",
    }
    if raw_id not in allowed_env_identities:
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
        env_ok = verify_password(raw_pwd, ADMIN_PASSWORD_HASH) or (
            raw_pwd != trimmed_pwd and verify_password(trimmed_pwd, ADMIN_PASSWORD_HASH)
        )
        if not env_ok:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ACCESS DENIED: INVALID PASSPHRASE.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"CRITICAL: Auth system failure - {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ACCESS DENIED.")
        
    access_token = create_access_token(
        data={"sub": ADMIN_USERNAME or "rafael_admin", "role": "superadmin", "is_superadmin": True},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
