"""
INHO – Audit Router
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, require_admin
from db.session import get_db
from models.models import AuditLog, User
from schemas.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/me", response_model=List[AuditLogOut])
async def list_my_audit_logs(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    entity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista o log de auditoria do próprio usuário (somente leitura)."""
    query = select(AuditLog).where(AuditLog.user_id == current_user.id)
    if entity:
        query = query.where(AuditLog.entity == entity)
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    return logs


@router.get("/all", response_model=List[AuditLogOut])
async def list_all_audit_logs(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    entity: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os logs de auditoria da instituição."""
    query = select(AuditLog)
    if entity:
        query = query.where(AuditLog.entity == entity)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
        
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return logs
