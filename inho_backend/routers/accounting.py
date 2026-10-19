from sqlalchemy import cast, String
import uuid
import hashlib
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String

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
    idempotency_key: Optional[str] = Query(None, include_in_schema=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import os
    from dateutil.relativedelta import relativedelta
    from sqlalchemy import text, func
    from routers.crm import get_uuid

    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    y = payload.period_year
    m = payload.period_month
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")

    try:
        if not is_sqlite:
            await db.execute(text("SET LOCAL lock_timeout = '5s'"))

        # Check if already closed (with pessimistic lock if exists)
        existing_stmt = select(MonthClose).where(
            MonthClose.business_id == b_id,
            MonthClose.period_year == y,
            MonthClose.period_month == m,
        )
        if not is_sqlite:
            existing_stmt = existing_stmt.with_for_update()
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Mês já está fechado.")

        start_dt = datetime(y, m, 1, tzinfo=timezone.utc)
        end_dt = start_dt + relativedelta(months=1)

        eff_inv_dt = func.coalesce(BillingInvoice.data_competencia, BillingInvoice.due_date)
        inv_stmt = (
            select(BillingInvoice.id, BillingInvoice.amount)
            .where(
                BillingInvoice.business_id == b_id,
                eff_inv_dt >= start_dt,
                eff_inv_dt < end_dt,
            )
            .order_by(BillingInvoice.id.asc())
        )
        inv_rows = (await db.execute(inv_stmt)).all()

        eff_pay_dt = func.coalesce(AccountPayable.data_competencia, AccountPayable.due_date)
        pay_stmt = (
            select(AccountPayable.id, AccountPayable.amount)
            .where(
                AccountPayable.business_id == b_id,
                eff_pay_dt >= start_dt,
                eff_pay_dt < end_dt,
            )
            .order_by(AccountPayable.id.asc())
        )
        pay_rows = (await db.execute(pay_stmt)).all()

        summary = {
            "total_revenue": sum(float(r.amount) for r in inv_rows),
            "total_cost": sum(float(r.amount) for r in pay_rows),
            "invoice_ids": [str(r.id) for r in inv_rows],
            "payable_ids": [str(r.id) for r in pay_rows],
        }

        summary_json = json.dumps(summary, sort_keys=True)
        slug = f"{b_id}_{y}_{m}_{summary_json}"
        checksum = hashlib.sha256(slug.encode("utf-8")).hexdigest()

        month_close = MonthClose(
            business_id=b_id,
            period_year=y,
            period_month=m,
            closed_by_id=current_user.id,
            closed_by_name=f"{current_user.full_name} ({current_user.role_label})",
            checksum=checksum,
            summary_json=summary_json,
            closed_at=datetime.now(timezone.utc),
        )
        db.add(month_close)
        await db.commit()
        await db.refresh(month_close)

        await write_audit(
            db, action=AuditAction.CREATE, entity="month_close", entity_id=str(month_close.id),
            user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role_label,
            business_id=b_id, detail={"period": f"{m:02d}/{y}", "checksum": checksum}
        )

        return month_close
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        err_msg = str(exc).lower()
        if "55p03" in err_msg or "lock timeout" in err_msg or "locknotavailable" in err_msg:
            raise HTTPException(
                status_code=409,
                detail="Fechamento contábil em andamento por outro operador. Tente novamente em instantes.",
            )
        raise

@router.get("/month-close", response_model=List[MonthCloseOut])
@router.get("/month-closes", response_model=List[MonthCloseOut])
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
