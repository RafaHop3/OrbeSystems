from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

from db.session import get_db
from models.models import User, Business, BillingInvoice, AccountPayable, BillingStatus, PayableStatus
from core.deps import get_current_user
from schemas.report_schemas import DREResult, DRELine, AgingResult, ReportLossesOut, LossResultItem, BudgetReportOut, BudgetVsActual
from routers.billing import _get_user_business

router = APIRouter()

@router.get("/dre", response_model=DREResult)
async def get_dre(
    year: int = Query(...),
    month: int = Query(...),
    regime: str = Query("competencia", regex="^(caixa|competencia)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    
    # ── Fetch Data ────────────────────────
    # In a real app we would use raw SQL or SQLAlchemy group_by. For simplicity, we fetch all in period.
    inv_stmt = select(BillingInvoice).where(BillingInvoice.business_id == business.id)
    pay_stmt = select(AccountPayable).where(AccountPayable.business_id == business.id)
    
    invoices = (await db.execute(inv_stmt)).scalars().all()
    payables = (await db.execute(pay_stmt)).scalars().all()
    
    # Filter by regime
    revenues = []
    costs = []
    expenses = []
    
    for inv in invoices:
        if regime == "competencia":
            dt = inv.data_competencia if inv.data_competencia else inv.due_date
            if dt.year == year and dt.month == month:
                revenues.append(inv)
        else:
            if inv.status == BillingStatus.PAID:
                dt = inv.updated_at
                if dt.year == year and dt.month == month:
                    revenues.append(inv)
                    
    for pay in payables:
        if regime == "competencia":
            dt = pay.data_competencia if pay.data_competencia else pay.due_date
            if dt.year == year and dt.month == month:
                # Basic heuristic: if it has category_id we assume we can classify, if not, expense
                expenses.append(pay) # Put all in expenses for now unless we look at AccountCategory type
        else:
            if pay.status == PayableStatus.PAID and pay.paid_date:
                dt = pay.paid_date
                if dt.year == year and dt.month == month:
                    expenses.append(pay)
                    
    rev_total = sum(float(i.amount) for i in revenues)
    exp_total = sum(float(p.amount) for p in expenses)
    
    revenue_line = DRELine(category_name="Faturamento Bruto", category_id=None, amount=rev_total)
    expense_line = DRELine(category_name="Despesas Operacionais", category_id=None, amount=exp_total)
                    
    return DREResult(
        period_start=f"{year}-{month:02d}-01",
        period_end=f"{year}-{month:02d}-28", # Approximate
        regime=regime,
        revenues=[revenue_line],
        total_revenue=rev_total,
        costs=[],
        total_cost=0.0,
        gross_profit=rev_total,
        expenses=[expense_line],
        total_expense=exp_total,
        net_profit=rev_total - exp_total
    )

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
        BillingInvoice.status == BillingStatus.LOSS
    )
    invoices = (await db.execute(stmt)).scalars().all()
    
    losses = []
    total = 0.0
    for inv in invoices:
        val = float(inv.remaining_balance if inv.remaining_balance is not None else inv.amount)
        losses.append(LossResultItem(
            invoice_id=str(inv.id),
            customer_name=inv.customer_name,
            amount=val,
            due_date=inv.due_date.isoformat(),
            status=inv.status.value
        ))
        total += val
        
    return ReportLossesOut(
        start_date=start or "2000-01-01",
        end_date=end or "2100-01-01",
        total_loss=total,
        losses=losses
    )

@router.get("/budget-vs-actual", response_model=BudgetReportOut)
async def get_budget_vs_actual(
    year: int = Query(...),
    month: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Dummy representation for budget planning (often requires extensive Budget models)
    # We'll just return zeroed budgets and actuals matching expenses
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
