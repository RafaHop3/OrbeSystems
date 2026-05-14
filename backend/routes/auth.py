from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from security.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH,
    verify_password,
    create_access_token
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class LoginSchema(BaseModel):
    username: str
    password: str

@router.post("/login")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, data: LoginSchema):
    """ Secure login endpoint. Only rafael_admin is allowed. (Max 5 attempts / min) """
    print(f"[AUTH] Login attempt - Username: '{data.username}'")
    print(f"[AUTH] Expected ADMIN_USERNAME: '{ADMIN_USERNAME}'")
    print(f"[AUTH] Password length: {len(data.password)}")
    print(f"[AUTH] ADMIN_PASSWORD_HASH configured: {bool(ADMIN_PASSWORD_HASH)}")
    
    # 1. First verify the username (prevents salt crashes on unknown users)
    if data.username != ADMIN_USERNAME:
        print(f"[AUTH] Username mismatch - got '{data.username}' expected '{ADMIN_USERNAME}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ACCESS DENIED: UNKNOWN IDENTITY.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Verify password with safety wrap
    try:
        print(f"[AUTH] Verifying password against hash...")
        is_valid = verify_password(data.password, ADMIN_PASSWORD_HASH)
        print(f"[AUTH] Password verification result: {is_valid}")
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ACCESS DENIED: INVALID PASSPHRASE.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        # This catches "Invalid salt" or malformed hashes in config
        print(f"CRITICAL: Auth system failure - {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ACCESS DENIED: AUTH SYSTEM ERROR.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": ADMIN_USERNAME}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/debug-config")
async def debug_config():
    """Debug endpoint to check admin configuration"""
    return {
        "admin_username": ADMIN_USERNAME,
        "password_hash_configured": bool(ADMIN_PASSWORD_HASH),
        "password_hash_length": len(ADMIN_PASSWORD_HASH) if ADMIN_PASSWORD_HASH else 0
    }
