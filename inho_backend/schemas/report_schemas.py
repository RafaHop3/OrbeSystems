from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DRELine(BaseModel):
    category_name: str
    category_id: Optional[str]
    amount: float

class DREResult(BaseModel):
    period_start: str
    period_end: str
    regime: str
    revenues: List[DRELine]
    total_revenue: float
    costs: List[DRELine]
    total_cost: float
    gross_profit: float
    expenses: List[DRELine]
    total_expense: float
    net_profit: float
    
class AgingResult(BaseModel):
    aging_summary: Dict[str, float]

class LossResultItem(BaseModel):
    invoice_id: str
    customer_name: str
    amount: float
    due_date: str
    status: str

class ReportLossesOut(BaseModel):
    start_date: str
    end_date: str
    total_loss: float
    losses: List[LossResultItem]

class BudgetVsActual(BaseModel):
    category_name: str
    budgeted: float
    actual: float
    variance: float
    variance_percentage: float

class BudgetReportOut(BaseModel):
    year: int
    month: int
    categories: List[BudgetVsActual]
    total_budgeted: float
    total_actual: float
