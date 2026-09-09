from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

class MonthCloseCreate(BaseModel):
    period_year: int
    period_month: int

class MonthCloseOut(BaseModel):
    id: UUID
    business_id: UUID
    period_year: int
    period_month: int
    closed_by_id: str
    closed_by_name: str
    checksum: str
    summary_json: Optional[Dict[str, Any]] = None
    closed_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
