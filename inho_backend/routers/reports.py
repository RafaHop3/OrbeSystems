from sqlalchemy import cast, String
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String, and_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

from db.session import get_db
from models.models import User, Business, BillingInvoice, AccountPayable, BillingStatus, PayableStatus
from core.deps import get_current_user
from schemas.report_schemas import DREResult, DRELine, AgingResult, ReportLossesOut, LossResultItem, BudgetReportOut, BudgetVsActual
from routers.billing import _get_user_business

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
    
    inv_stmt = select(BillingInvoice).where(BillingInvoice.business_id == business.id)
    pay_stmt = select(AccountPayable).where(AccountPayable.business_id == business.id)
    
    invoices = (await db.execute(inv_stmt)).scalars().all()
    payables = (await db.execute(pay_stmt)).scalars().all()
    
    revenues = []
    expenses = []
    
    for inv in invoices:
        if regime_norm == "competencia":
            dt = inv.data_competencia if inv.data_competencia else inv.due_date
            if dt and dt.year == year and dt.month == month:
                revenues.append(inv)
        else:
            if inv.status == BillingStatus.PAID:
                dt = inv.updated_at
                if dt and dt.year == year and dt.month == month:
                    revenues.append(inv)
                    
    for pay in payables:
        if regime_norm == "competencia":
            dt = pay.data_competencia if pay.data_competencia else pay.due_date
            if dt and dt.year == year and dt.month == month:
                expenses.append(pay)
        else:
            if pay.status == PayableStatus.PAID and pay.paid_date:
                dt = pay.paid_date
                if dt and dt.year == year and dt.month == month:
                    expenses.append(pay)
                    
    rev_total = sum(float(i.amount) for i in revenues)
    exp_total = sum(float(p.amount) for p in expenses)
    net = rev_total - exp_total
    
    revenue_line = DRELine(category_name="Faturamento Bruto", category_id=None, amount=rev_total)
    expense_line = DRELine(category_name="Despesas Operacionais", category_id=None, amount=exp_total)
                    
    return {
        "period_start": f"{year}-{month:02d}-01",
        "period_end": f"{year}-{month:02d}-28",
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
    
    stmt = select(BillingInvoice).where(
        BillingInvoice.business_id == business.id,
        cast(BillingInvoice.status, String).in_(["LOSS", "OVERDUE"])
    )
    invoices = (await db.execute(stmt)).scalars().all()
    
    losses = []
    total = 0.0
    for inv in invoices:
        val = float(inv.remaining_balance if inv.remaining_balance is not None else inv.amount)
        status_str = inv.status.value if hasattr(inv.status, "value") else str(inv.status)
        losses.append(LossResultItem(
            invoice_id=str(inv.id),
            customer_name=inv.customer_name,
            amount=val,
            due_date=inv.due_date.isoformat(),
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
    
    stmt = select(AccountPayable).where(
        AccountPayable.business_id == business.id,
        AccountPayable.status == PayableStatus.PAID
    )
    payables = (await db.execute(stmt)).scalars().all()
    
    actual_total = sum(float(p.amount) for p in payables if p.paid_date and p.paid_date.year == year and p.paid_date.month == month)
    
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
    now = datetime.now(timezone.utc)
    stmt = select(BillingInvoice).where(
        BillingInvoice.business_id == business.id,
        cast(BillingInvoice.status, String).in_(["PENDING", "OVERDUE"])
    )
    invoices = (await db.execute(stmt)).scalars().all()
    buckets = {"0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "90_plus": 0.0}
    for inv in invoices:
        if inv.due_date and inv.due_date < now:
            days = (now - inv.due_date).days
            amt = float(inv.amount)
            if days <= 30:
                buckets["0_30"] += amt
            elif days <= 60:
                buckets["31_60"] += amt
            elif days <= 90:
                buckets["61_90"] += amt
            else:
                buckets["90_plus"] += amt
    return {"buckets": buckets, "total_overdue": sum(buckets.values())}

@router.get("/cashflow")
async def get_cashflow_projection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    horizon = getattr(business, "cashflow_horizon_months", 6) or 6
    now = datetime.now(timezone.utc)
    inv_stmt = select(BillingInvoice).where(BillingInvoice.business_id == business.id)
    pay_stmt = select(AccountPayable).where(AccountPayable.business_id == business.id)
    invoices = (await db.execute(inv_stmt)).scalars().all()
    payables = (await db.execute(pay_stmt)).scalars().all()
    months = []
    for i in range(horizon):
        dt = now + relativedelta(months=i)
        y, m = dt.year, dt.month
        inflow = sum(float(inv.amount) for inv in invoices if inv.due_date and inv.due_date.year == y and inv.due_date.month == m and str(inv.status) != "CANCELLED")
        outflow = sum(float(p.amount) for p in payables if p.due_date and p.due_date.year == y and p.due_date.month == m and str(p.status) != "CANCELLED")
        months.append({
            "period": f"{y}-{m:02d}",
            "inflow": inflow,
            "outflow": outflow,
            "net": inflow - outflow
        })
    return {"horizon_months": horizon, "projection": months}
