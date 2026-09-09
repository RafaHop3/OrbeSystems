import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from models.models import User, Business, MonthClose, BillingInvoice, AccountPayable, AuditAction
from core.deps import get_current_user
from schemas.accounting_schemas import MonthCloseCreate, MonthCloseOut
from routers.billing import _get_user_business
from services.audit import write_audit

router = APIRouter()

@router.post("/month-close", response_model=MonthCloseOut)
async def create_month_close(
    payload: MonthCloseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    
    # Check if already closed
    existing = await db.execute(
        select(MonthClose).where(
            MonthClose.business_id == business.id,
            MonthClose.period_year == payload.period_year,
            MonthClose.period_month == payload.period_month
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mês já está fechado.")
        
    # Get all invoices and payables in the period based on data_competencia or due_date
    y = payload.period_year
    m = payload.period_month
    
    inv_result = await db.execute(
        select(BillingInvoice).where(
            BillingInvoice.business_id == business.id
        )
    )
    all_invoices = inv_result.scalars().all()
    period_invoices = [inv for inv in all_invoices if (inv.data_competencia or inv.due_date).year == y and (inv.data_competencia or inv.due_date).month == m]
    
    pay_result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.business_id == business.id
        )
    )
    all_payables = pay_result.scalars().all()
    period_payables = [pay for pay in all_payables if (pay.data_competencia or pay.due_date).year == y and (pay.data_competencia or pay.due_date).month == m]
    
    summary = {
        "total_revenue": sum(float(i.amount) for i in period_invoices),
        "total_cost": sum(float(p.amount) for p in period_payables),
        "invoice_ids": [str(i.id) for i in period_invoices],
        "payable_ids": [str(p.id) for p in period_payables]
    }
    
    summary_json = json.dumps(summary, sort_keys=True)
    slug = f"{business.id}_{y}_{m}_{summary_json}"
    checksum = hashlib.sha256(slug.encode('utf-8')).hexdigest()
    
    month_close = MonthClose(
        business_id=business.id,
        period_year=y,
        period_month=m,
        closed_by_id=current_user.id,
        closed_by_name=f"{current_user.full_name} ({current_user.role_label})",
        checksum=checksum,
        summary_json=summary_json,
        closed_at=datetime.now(timezone.utc)
    )
    db.add(month_close)
    await db.commit()
    await db.refresh(month_close)
    
    await write_audit(
        db, action=AuditAction.CREATE, entity="month_close", entity_id=str(month_close.id),
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role_label,
        business_id=business.id, detail={"period": f"{m:02d}/{y}", "checksum": checksum}
    )
    
    return month_close

@router.get("/month-close", response_model=List[MonthCloseOut])
async def list_month_closes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(MonthClose).where(MonthClose.business_id == business.id).order_by(MonthClose.period_year.desc(), MonthClose.period_month.desc())
    )
    return result.scalars().all()

@router.get("/month-close/{year}/{month}", response_model=MonthCloseOut)
async def get_month_close(
    year: int, month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(MonthClose).where(
            MonthClose.business_id == business.id,
            MonthClose.period_year == year,
            MonthClose.period_month == month
        )
    )
    close = result.scalar_one_or_none()
    if not close:
        raise HTTPException(status_code=404, detail="Fechamento não encontrado")
    return close
