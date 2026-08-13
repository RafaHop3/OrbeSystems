from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import uuid

from db.session import get_db
from models.models import User, Account, Transaction, PDVSale, AuditLog
from core.deps import require_super_admin
from schemas.admin_schemas import (
    GlobalStatsOut, UserListOut, UserRoleUpdate, UserStatusUpdate, AuditLogOut
)

router = APIRouter()

@router.get("/stats", response_model=GlobalStatsOut)
async def get_global_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    # Total de usuários
    users_count = await db.scalar(select(func.count(User.id)))
    
    # Contas ativas
    accounts_count = await db.scalar(select(func.count(Account.id)).where(Account.is_active == True))
    
    # Volume total de transações
    tx_volume = await db.scalar(select(func.sum(Transaction.amount)))
    tx_volume = tx_volume or 0
    
    # Volume total de vendas PDV
    pdv_volume = await db.scalar(select(func.sum(PDVSale.total_amount)))
    pdv_volume = pdv_volume or 0

    return GlobalStatsOut(
        total_users=users_count,
        active_accounts=accounts_count,
        total_transactions_volume=str(tx_volume),
        total_pdv_sales_volume=str(pdv_volume)
    )

@router.get("/users", response_model=List[UserListOut])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    result = await db.execute(select(User).order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = result.scalars().all()
    return users

@router.patch("/users/{user_id}/role", response_model=UserListOut)
async def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    if str(admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Nao pode alterar o proprio cargo")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
        
    user.role = role_update.role
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/users/{user_id}/status", response_model=UserListOut)
async def update_user_status(
    user_id: uuid.UUID,
    status_update: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    if str(admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Nao pode alterar o proprio status")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
        
    user.is_active = status_update.is_active
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit))
    logs = result.scalars().all()
    return logs
