"""
INHO – Audit Router
"""
from typing import List

from fastapi import APIRouter, Depends, Request
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista o log de auditoria do próprio usuário (somente leitura)."""
    result = await db.execute(
        select(AuditLog).where(AuditLog.user_id == current_user.id).order_by(AuditLog.timestamp.desc()).limit(50)
    )
    logs = result.scalars().all()
    return logs


@router.get("/all", response_model=List[AuditLogOut])
async def list_all_audit_logs(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_admin), # Only admins can view all logs
):
    """Lista todos os logs de auditoria (requer ADMIN)."""
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100)
    )
    logs = result.scalars().all()
    return logs
