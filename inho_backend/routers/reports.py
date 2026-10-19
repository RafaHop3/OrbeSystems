from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String, and_, func, case
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

from db.session import get_db
from models.models import User, Business, BillingInvoice, AccountPayable, BillingStatus, PayableStatus
from core.deps import get_current_user
from schemas.report_schemas import DREResult, DRELine, AgingResult, ReportLossesOut, LossResultItem, BudgetReportOut, BudgetVsActual
from routers.billing import _get_user_business
from routers.crm import get_uuid

router = APIRouter()

@router.get("/dre")
async def get_dre(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    regime: str = Query("competencia"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month
    regime_norm = (regime or "competencia").strip().lower()
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)

    start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
    end_dt = start_dt + relativedelta(months=1)

    if regime_norm == "competencia":
        inv_dt_col = func.coalesce(BillingInvoice.data_competencia, BillingInvoice.due_date)
        rev_stmt = select(func.coalesce(func.sum(BillingInvoice.amount), 0)).where(
            BillingInvoice.business_id == b_id,
            BillingInvoice.status != BillingStatus.CANCELLED,
            inv_dt_col >= start_dt,
            inv_dt_col < end_dt,
        )
        pay_dt_col = func.coalesce(AccountPayable.data_competencia, AccountPayable.due_date)
        exp_stmt = select(func.coalesce(func.sum(AccountPayable.amount), 0)).where(
            AccountPayable.business_id == b_id,
            AccountPayable.status != PayableStatus.CANCELLED,
            pay_dt_col >= start_dt,
            pay_dt_col < end_dt,
        )
    else:
        rev_stmt = select(func.coalesce(func.sum(BillingInvoice.amount), 0)).where(
            BillingInvoice.business_id == b_id,
            BillingInvoice.status == BillingStatus.PAID,
            BillingInvoice.updated_at >= start_dt,
            BillingInvoice.updated_at < end_dt,
        )
        pay_paid_col = func.coalesce(AccountPayable.paid_date, AccountPayable.updated_at)
        exp_stmt = select(func.coalesce(func.sum(AccountPayable.amount), 0)).where(
            AccountPayable.business_id == b_id,
            AccountPayable.status == PayableStatus.PAID,
            pay_paid_col >= start_dt,
            pay_paid_col < end_dt,
        )

    rev_total = float((await db.execute(rev_stmt)).scalar() or 0.0)
    exp_total = float((await db.execute(exp_stmt)).scalar() or 0.0)
    net = rev_total - exp_total

    revenue_line = DRELine(category_name="Faturamento Bruto", category_id=None, amount=rev_total)
    expense_line = DRELine(category_name="Despesas Operacionais", category_id=None, amount=exp_total)

    return {
        "period_start": f"{year}-{month:02d}-01",
        "period_end": (end_dt - timedelta(days=1)).strftime("%Y-%m-%d"),
        "regime": regime_norm,
        "revenues": [revenue_line],
        "total_revenue": rev_total,
        "revenue_total": rev_total,
        "costs": [],
        "total_cost": 0.0,
        "gross_profit": rev_total,
        "expenses": [expense_line],
        "total_expense": exp_total,
        "expenses_total": exp_total,
        "net_profit": net,
    }

@router.get("/losses", response_model=ReportLossesOut)
async def get_losses_report(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)

    stmt = (
        select(
            BillingInvoice.id,
            BillingInvoice.customer_name,
            BillingInvoice.amount,
            BillingInvoice.remaining_balance,
            BillingInvoice.due_date,
            BillingInvoice.status,
        )
        .where(
            BillingInvoice.business_id == b_id,
            cast(BillingInvoice.status, String).in_(["LOSS", "OVERDUE"]),
        )
        .order_by(BillingInvoice.due_date.desc())
        .limit(250)
    )
    rows = (await db.execute(stmt)).all()

    losses = []
    total = 0.0
    for r in rows:
        val = float(r.remaining_balance if r.remaining_balance is not None else r.amount)
        status_str = r.status.value if hasattr(r.status, "value") else str(r.status)
        losses.append(LossResultItem(
            invoice_id=str(r.id),
            customer_name=r.customer_name,
            amount=val,
            due_date=r.due_date.isoformat(),
            status=status_str
        ))
        total += val

    return ReportLossesOut(
        start_date=start or "2000-01-01",
        end_date=end or "2100-01-01",
        total_loss=total,
        losses=losses
    )

@router.get("/budget-vs-actual", response_model=BudgetReportOut)
@router.get("/budget", response_model=BudgetReportOut)
async def get_budget_vs_actual(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)

    start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
    end_dt = start_dt + relativedelta(months=1)
    paid_col = func.coalesce(AccountPayable.paid_date, AccountPayable.due_date)

    stmt = select(func.coalesce(func.sum(AccountPayable.amount), 0)).where(
        AccountPayable.business_id == b_id,
        AccountPayable.status == PayableStatus.PAID,
        paid_col >= start_dt,
        paid_col < end_dt,
    )
    actual_total = float((await db.execute(stmt)).scalar() or 0.0)

    return BudgetReportOut(
        year=year,
        month=month,
        categories=[
            BudgetVsActual(
                category_name="Despesas Gerais",
                budgeted=0.0,
                actual=actual_total,
                variance=-actual_total,
                variance_percentage=0.0
            )
        ],
        total_budgeted=0.0,
        total_actual=actual_total
    )

@router.get("/aging")
async def get_aging_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    now = datetime.now(timezone.utc)
    d30 = now - timedelta(days=30)
    d60 = now - timedelta(days=60)
    d90 = now - timedelta(days=90)

    stmt = select(
        func.coalesce(
            func.sum(case((and_(BillingInvoice.due_date < now, BillingInvoice.due_date >= d30), BillingInvoice.amount), else_=0)),
            0,
        ).label("b_0_30"),
        func.coalesce(
            func.sum(case((and_(BillingInvoice.due_date < d30, BillingInvoice.due_date >= d60), BillingInvoice.amount), else_=0)),
            0,
        ).label("b_31_60"),
        func.coalesce(
            func.sum(case((and_(BillingInvoice.due_date < d60, BillingInvoice.due_date >= d90), BillingInvoice.amount), else_=0)),
            0,
        ).label("b_61_90"),
        func.coalesce(
            func.sum(case((BillingInvoice.due_date < d90, BillingInvoice.amount), else_=0)),
            0,
        ).label("b_90_plus"),
    ).where(
        BillingInvoice.business_id == b_id,
        cast(BillingInvoice.status, String).in_(["PENDING", "OVERDUE"]),
        BillingInvoice.due_date < now,
    )
    row = (await db.execute(stmt)).one()
    buckets = {
        "0_30": float(row.b_0_30 or 0.0),
        "31_60": float(row.b_31_60 or 0.0),
        "61_90": float(row.b_61_90 or 0.0),
        "90_plus": float(row.b_90_plus or 0.0),
    }
    return {"buckets": buckets, "total_overdue": sum(buckets.values())}

@router.get("/cashflow")
async def get_cashflow_projection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    horizon = getattr(business, "cashflow_horizon_months", 6) or 6
    now = datetime.now(timezone.utc)
    window_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    window_end = window_start + relativedelta(months=horizon)

    inv_stmt = select(BillingInvoice.due_date, BillingInvoice.amount).where(
        BillingInvoice.business_id == b_id,
        BillingInvoice.status != BillingStatus.CANCELLED,
        BillingInvoice.due_date >= window_start,
        BillingInvoice.due_date < window_end,
    )
    pay_stmt = select(AccountPayable.due_date, AccountPayable.amount).where(
        AccountPayable.business_id == b_id,
        AccountPayable.status != PayableStatus.CANCELLED,
        AccountPayable.due_date >= window_start,
        AccountPayable.due_date < window_end,
    )
    inv_rows = (await db.execute(inv_stmt)).all()
    pay_rows = (await db.execute(pay_stmt)).all()

    months = []
    for i in range(horizon):
        dt = window_start + relativedelta(months=i)
        y, m = dt.year, dt.month
        inflow = sum(float(r.amount) for r in inv_rows if r.due_date and r.due_date.year == y and r.due_date.month == m)
        outflow = sum(float(r.amount) for r in pay_rows if r.due_date and r.due_date.year == y and r.due_date.month == m)
        months.append({
            "period": f"{y}-{m:02d}",
            "inflow": inflow,
            "outflow": outflow,
            "net": inflow - outflow
        })
    return {"horizon_months": horizon, "projection": months}
