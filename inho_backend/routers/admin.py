import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, cast, String, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import require_admin
from db.session import get_db
from models.models import User, Business, BusinessOperator, SalesOrder, PDVSale, AuditLog
from routers.billing import _get_user_business
from schemas.admin_schemas import (
    GlobalStatsOut, UserListOut, UserRoleUpdate, UserStatusUpdate, AuditLogOut
)

router = APIRouter()

# Donos da plataforma (visão global). Demais admins enxergam apenas o próprio tenant.
_PLATFORM_OWNERS = {
    e.strip().lower()
    for e in os.environ.get("INHO_PLATFORM_OWNERS", "rafael@orbesystems.com.br").split(",")
    if e.strip()
}


def _role_val(user: User) -> str:
    return (user.role.value if hasattr(user.role, "value") else str(user.role or "")).strip().lower()


def _is_platform_owner(user: User) -> bool:
    return _role_val(user) in ("super_admin", "superadmin") or (user.email or "").strip().lower() in _PLATFORM_OWNERS


def _require_owner(user: User) -> None:
    if not _is_platform_owner(user):
        raise HTTPException(status_code=403, detail="Acesso negado: requer SUPER_ADMIN da plataforma")


async def _tenant(db: AsyncSession, admin: User):
    """Retorna (business, ids de usuários do mesmo tenant como str)."""
    business = await _get_user_business(db, admin)
    ids = {str(admin.id)}
    if business:
        owner_id = (await db.execute(select(Business.user_id).where(Business.id == business.id))).scalar_one_or_none()
        if owner_id:
            ids.add(str(owner_id))
        op_ids = (await db.execute(
            select(BusinessOperator.user_id).where(BusinessOperator.business_id == business.id)
        )).scalars().all()
        ids.update(str(i) for i in op_ids)
    return business, ids


@router.get("/stats", response_model=GlobalStatsOut)
async def get_global_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if _is_platform_owner(admin):
        users_count = await db.scalar(select(func.count(User.id)))
        accounts_count = await db.scalar(select(func.count(Business.id)))
        tx_volume = await db.scalar(select(func.sum(SalesOrder.amount))) or 0
        pdv_volume = await db.scalar(select(func.sum(PDVSale.total_amount))) or 0
    else:
        business, ids = await _tenant(db, admin)
        users_count = len(ids)
        accounts_count = 1 if business else 0
        tx_volume = 0
        pdv_volume = 0
        if business:
            if hasattr(SalesOrder, "business_id"):
                tx_volume = await db.scalar(
                    select(func.sum(SalesOrder.amount)).where(SalesOrder.business_id == business.id)
                ) or 0
            if hasattr(PDVSale, "business_id"):
                pdv_volume = await db.scalar(
                    select(func.sum(PDVSale.total_amount)).where(PDVSale.business_id == business.id)
                ) or 0

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
    admin: User = Depends(require_admin)
):
    query = select(User)
    if not _is_platform_owner(admin):
        _, ids = await _tenant(db, admin)
        query = query.where(cast(User.id, String).in_(list(ids)))
    result = await db.execute(query.order_by(User.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.patch("/users/{user_id}/role", response_model=UserListOut)
async def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    _require_owner(admin)
    if str(admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Nao pode alterar o proprio cargo")

    result = await db.execute(select(User).where(cast(User.id, String) == str(user_id)))
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
    admin: User = Depends(require_admin)
):
    _require_owner(admin)
    if str(admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Nao pode alterar o proprio status")

    result = await db.execute(select(User).where(cast(User.id, String) == str(user_id)))
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
    admin: User = Depends(require_admin)
):
    query = select(AuditLog)
    if not _is_platform_owner(admin):
        _, ids = await _tenant(db, admin)
        query = query.where(cast(AuditLog.user_id, String).in_(list(ids)))
    result = await db.execute(query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit))
    logs = result.scalars().all()
    return [
        AuditLogOut(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            action=log.action.value if hasattr(log.action, "value") else str(log.action),
            resource=log.entity,
            details=log.detail,
            ip_address=log.ip_address,
            created_at=log.timestamp,
        )
        for log in logs
    ]
