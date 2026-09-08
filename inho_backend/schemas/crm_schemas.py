from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.models import ContactCategory, PayableStatus

class CRMContactBase(BaseModel):
    category: ContactCategory
    name: str
    document: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    bank_details: Optional[str] = None
    notes: Optional[str] = None

class CRMContactCreate(CRMContactBase):
    pass

class CRMContactUpdate(BaseModel):
    category: Optional[ContactCategory] = None
    name: Optional[str] = None
    document: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    bank_details: Optional[str] = None
    notes: Optional[str] = None

class CRMContactOut(CRMContactBase):
    id: UUID
    business_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AccountPayableBase(BaseModel):
    supplier_id: Optional[UUID] = None
    description: str
    amount: float
    due_date: datetime
    paid_date: Optional[datetime] = None
    status: PayableStatus = PayableStatus.PENDING

class AccountPayableCreate(AccountPayableBase):
    pass

class AccountPayableUpdate(BaseModel):
    supplier_id: Optional[UUID] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    status: Optional[PayableStatus] = None

class AccountPayableOut(AccountPayableBase):
    id: UUID
    business_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
