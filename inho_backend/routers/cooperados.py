from sqlalchemy import cast, String
"""
INHO – Router: Cooperados (Dossiê Completo + Extrato de Aportes)
Spec §2.2 — Dossiê Central do Sócio (Cooperado)
"""
import uuid as uuid_module
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    Cooperado, CooperadoStatus, BillingInvoice, BillingStatus, User
)
from routers.billing import _get_user_business

router = APIRouter(prefix="/api/v1/crm/cooperados", tags=["Cooperados"])


# ── Schemas (inline — simples e coesos) ───────────────────────────
class CooperadoCreate(BaseModel):
    name:         str
    document:     str        # CPF ou CNPJ
    email:        Optional[str]  = None
    phone:        Optional[str]  = None
    bank_details: Optional[str]  = None
    notes:        Optional[str]  = None
    status:       CooperadoStatus = CooperadoStatus.PROPOSTA_CADASTRADA


class CooperadoUpdate(BaseModel):
    name:         Optional[str]          = None
    document:     Optional[str]          = None
    email:        Optional[str]          = None
    phone:        Optional[str]          = None
    bank_details: Optional[str]          = None
    notes:        Optional[str]          = None
    status:       Optional[CooperadoStatus] = None


class CooperadoOut(BaseModel):
    id:          UUID
    business_id: UUID
    name:        str
    document:    str
    email:       Optional[str]
    phone:       Optional[str]
    bank_details: Optional[str]
    notes:       Optional[str]
    status:      CooperadoStatus
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── CRUD ──────────────────────────────────────────────────────────

@router.post("/", response_model=CooperadoOut, status_code=status.HTTP_201_CREATED)
async def create_cooperado(
    payload: CooperadoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    coop = Cooperado(**payload.model_dump(), business_id=business.id)
    db.add(coop)
    await db.commit()
    await db.refresh(coop)
    return coop


@router.get("/", response_model=List[CooperadoOut])
async def list_cooperados(
    coop_status: Optional[CooperadoStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Nome ou documento"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    query = select(Cooperado).where(Cooperado.business_id == business.id)

    if coop_status:
        query = query.where(Cooperado.status == coop_status)
    if search:
        from sqlalchemy import or_
        like = f"%{search}%"
        query = query.where(
            or_(Cooperado.name.ilike(like), Cooperado.document.ilike(like))
        )

    result = await db.execute(query.order_by(Cooperado.name.asc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{cooperado_id}", response_model=CooperadoOut)
async def get_cooperado(
    cooperado_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(Cooperado).where(
            Cooperado.id == cooperado_id,
            Cooperado.business_id == business.id
        )
    )
    coop = result.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")
    return coop


@router.put("/{cooperado_id}", response_model=CooperadoOut)
async def update_cooperado(
    cooperado_id: UUID,
    payload: CooperadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(Cooperado).where(
            Cooperado.id == cooperado_id,
            Cooperado.business_id == business.id
        )
    )
    coop = result.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(coop, field, value)

    await db.commit()
    await db.refresh(coop)
    return coop


@router.delete("/{cooperado_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cooperado(
    cooperado_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(Cooperado).where(
            Cooperado.id == cooperado_id,
            Cooperado.business_id == business.id
        )
    )
    coop = result.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")
    await db.delete(coop)
    await db.commit()


# ── Dossiê: Balanço & Extrato (spec §2.2) ─────────────────────────

@router.get("/{cooperado_id}/balance", summary="Extrato financeiro últimos 12 meses")
async def get_cooperado_balance(
    cooperado_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna extrato detalhado de aportes (faturas pagas) e
    o saldo acumulado do cooperado nos últimos 12 meses.
    """
    business = await _get_user_business(db, current_user)

    # Garante que cooperado pertence ao negócio
    coop_res = await db.execute(
        select(Cooperado).where(
            Cooperado.id == cooperado_id,
            Cooperado.business_id == business.id
        )
    )
    coop = coop_res.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")

    # Busca todos os lançamentos dos últimos 12 meses
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    invoices_res = await db.execute(
        select(BillingInvoice)
        .where(
            BillingInvoice.cooperado_id == cooperado_id,
            BillingInvoice.business_id == business.id,
            BillingInvoice.created_at >= cutoff,
        )
        .order_by(BillingInvoice.due_date.asc())
    )
    invoices = invoices_res.scalars().all()

    total_charged  = sum(float(i.amount) for i in invoices)
    total_paid     = sum(float(i.amount) for i in invoices if i.status == BillingStatus.PAID)
    total_overdue  = sum(float(i.amount) for i in invoices
                         if i.status in [BillingStatus.OVERDUE, BillingStatus.PENDING]
                         and i.due_date < datetime.now(timezone.utc))
    total_pending  = sum(float(i.amount) for i in invoices if i.status == BillingStatus.PENDING)

    entries = [
        {
            "id": str(inv.id),
            "type": inv.invoice_type.value,
            "description": inv.description,
            "amount": float(inv.amount),
            "due_date": inv.due_date.isoformat(),
            "status": inv.status.value,
        }
        for inv in invoices
    ]

    return {
        "cooperado_id": str(cooperado_id),
        "cooperado_name": coop.name,
        "period": "últimos 12 meses",
        "total_charged": total_charged,
        "total_paid": total_paid,
        "total_overdue": total_overdue,
        "total_pending": total_pending,
        "net_balance": total_paid,
        "entries": entries,
    }
