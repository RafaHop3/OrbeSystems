from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr

from models.models import UserRole, AuditAction


# ── Auth ──────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User ──────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    password: Optional[str] = Field(None, min_length=8)




# ── AuditLog ──────────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    action: AuditAction
    entity: str
    entity_id: Optional[str]
    detail: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True



# ── Advances ──────────────────────────────────────────────────────
from models.models import (
    ContractStatus, SalesOrderStatus,
    PaymentMethod, CashRegisterStatus
)



# ── Contracts ─────────────────────────────────────────────────────
class ContractCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    contact_name: str = Field(..., min_length=1, max_length=255)
    contact_doc: Optional[str] = None
    record_type: str
    total_value: Decimal = Field(..., gt=0)
    installments: int = Field(1, ge=1)
    frequency: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None

class ContractOut(BaseModel):
    id: UUID
    title: str
    contact_name: str
    contact_doc: Optional[str]
    record_type: str
    total_value: Decimal
    installments: int
    frequency: Optional[str]
    start_date: datetime
    end_date: Optional[datetime]
    status: ContractStatus
    created_at: datetime
    class Config:
        from_attributes = True


# ── SalesOrders ───────────────────────────────────────────────────
class SalesOrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=255)
    customer_doc: Optional[str] = None
    description: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    issue_date: datetime
    due_date: datetime

class SalesOrderOut(BaseModel):
    id: UUID
    customer_name: str
    customer_doc: Optional[str]
    description: Optional[str]
    amount: Decimal
    status: SalesOrderStatus
    invoice_number: Optional[str]
    nfe_key: Optional[str]
    nfe_status: Optional[str]
    issue_date: datetime
    due_date: datetime
    created_at: datetime
    class Config:
        from_attributes = True


# ── PDV ───────────────────────────────────────────────────────────
class OpenRegisterRequest(BaseModel):
    opening_balance: Decimal = Field(0, ge=0)

class PDVSaleCreate(BaseModel):
    customer_name: Optional[str] = None
    total_amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    description: Optional[str] = None

class PDVSaleOut(BaseModel):
    id: UUID
    cash_register_id: UUID
    customer_name: Optional[str]
    total_amount: Decimal
    payment_method: PaymentMethod
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class CashRegisterOut(BaseModel):
    id: UUID
    operator_id: Optional[UUID]
    opening_balance: Decimal
    closing_balance: Optional[Decimal]
    status: CashRegisterStatus
    opened_at: datetime
    closed_at: Optional[datetime]
    class Config:
        from_attributes = True




# ── PCO (Organizational Climate) ──────────────────────────────────
from models.pco_models import PCOSurveyStatus, PCOQuestionType, PCOIndicator

class PCOQuestionOut(BaseModel):
    id: UUID
    survey_id: UUID
    indicator: PCOIndicator
    q_type: PCOQuestionType
    text: str
    options: Optional[str] = None
    order_index: int
    required: bool

    class Config:
        from_attributes = True

class PCOSurveyOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    status: PCOSurveyStatus
    is_anonymous: bool
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    questions: List[PCOQuestionOut] = []

    class Config:
        from_attributes = True

class PCOAnswerSubmit(BaseModel):
    question_id: UUID
    score: Optional[int] = None
    bool_value: Optional[bool] = None
    text_value: Optional[str] = None

class PCOResponseSubmit(BaseModel):
    answers: List[PCOAnswerSubmit]

