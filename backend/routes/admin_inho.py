from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel, EmailStr
import uuid

# Re-use master ORBE dependencies
from security.auth import get_current_admin_user, get_password_hash
from inho_database import get_inho_db
from utils.logger import admin_logger
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class CreateInhoUserSchema(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "operator"
    is_active: bool = True

class PatchInhoUserSchema(BaseModel):
    role: str

@router.get("/users")
async def list_inho_users(
    skip: int = 0,
    limit: int = 50,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    admin_logger.info(f"Admin {admin_email} fetching INHO database users directly (Encapsulated)")
    
    # We query the natively isolated INHO Database Schema directly
    query = text("""
        SELECT id, email, role, is_email_verified, created_at 
        FROM users 
        ORDER BY created_at DESC 
        OFFSET :skip LIMIT :limit
    """)
    result = db.execute(query, {"skip": skip, "limit": limit})
    
    users = []
    for row in result:
        users.append({
            "id": str(row[0]),
            "email": row[1],
            "full_name": "Administrador INHO",
            "role": row[2],
            "is_active": True,
            "created_at": row[4].isoformat() if row[4] else None,
            "is_verified": row[3],
            "is_mfa_enabled": False
        })
    return users

@router.post("/users")
@limiter.limit("5/minute")
async def create_inho_user(
    data: CreateInhoUserSchema,
    request: Request,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    from datetime import datetime, timezone
    
    check_query = text("SELECT id FROM users WHERE email = :email")
    if db.execute(check_query, {"email": data.email}).fetchone():
        raise HTTPException(status_code=400, detail="Identidade INHO ja existe")

    hashed_pw = get_password_hash(data.password)
    user_id = str(uuid.uuid4())
    
    insert_query = text("""
        INSERT INTO users (id, email, password_hash, role, is_email_verified, created_at) 
        VALUES (:id, :email, :hashed, :role, false, :now)
    """)
    now = datetime.now(timezone.utc)
    
    db.execute(insert_query, {
        "id": user_id,
        "email": data.email,
        "hashed": hashed_pw,
        "role": data.role,
        "now": now
    })
    db.commit()
    admin_logger.info(f"Encapsulated Dashboard created INHO user {data.email}")
    return {"status": "success", "user_id": user_id}

@router.patch("/users/{user_id}")
async def patch_inho_user(
    user_id: str,
    data: PatchInhoUserSchema,
    request: Request,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    update_query = text("UPDATE users SET role = :new_role WHERE id = :uid")
    result = db.execute(update_query, {"new_role": data.role, "uid": user_id})
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Usuario INHO nao encontrado na baselinie encapsulada")
    db.commit()
    return {"status": "success", "message": f"Role updated to {data.role}"}

@router.delete("/users/{user_id}")
async def delete_inho_user(
    user_id: str,
    request: Request,
    admin_email: str = Depends(get_current_admin_user),
    db: Session = Depends(get_inho_db)
):
    delete_query = text("DELETE FROM users WHERE id = :uid")
    res = db.execute(delete_query, {"uid": user_id})
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Usuario INHO nao encontrado")
    db.commit()
    return {"status": "success"}
