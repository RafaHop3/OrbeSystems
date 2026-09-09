from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.models import (
    ContactCategory, PayableStatus,
    AccountCategoryType, RecurrenceFrequency, RecurrenceStatus, PaymentMethod
)


# ── CRM Contacts ──────────────────────────────────────────────────
class CRMContactBase(BaseModel):
    category:     ContactCategory
    name:         str
    document:     Optional[str] = None
    email:        Optional[EmailStr] = None
    phone:        Optional[str] = None
    bank_details: Optional[str] = None
    notes:        Optional[str] = None
    is_active:    bool = True

    # Address fields (spec §2.2)
    address:  Optional[str] = None
    city:     Optional[str] = None
    state:    Optional[str] = None
    zip_code: Optional[str] = None

    # HR fields (spec §2.3 — relevant for EMPLOYEE)
    role_title:          Optional[str]      = None
    admission_date:      Optional[datetime] = None
    vacation_start_date: Optional[datetime] = None


class CRMContactCreate(CRMContactBase):
    pass


class CRMContactUpdate(BaseModel):
    category:     Optional[ContactCategory] = None
    name:         Optional[str] = None
    document:     Optional[str] = None
    email:        Optional[EmailStr] = None
    phone:        Optional[str] = None
    bank_details: Optional[str] = None
    notes:        Optional[str] = None
    is_active:    Optional[bool] = None
    address:      Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    zip_code:     Optional[str] = None
    role_title:          Optional[str]      = None
    admission_date:      Optional[datetime] = None
    vacation_start_date: Optional[datetime] = None


class CRMContactOut(CRMContactBase):
    id:          UUID
    business_id: UUID
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── Accounts Payable ──────────────────────────────────────────────
class AccountPayableBase(BaseModel):
    supplier_id:      Optional[UUID]     = None
    category_id:      Optional[UUID]     = None
    description:      str
    amount:           float
    due_date:         datetime
    data_competencia: Optional[datetime] = None  # dupla datação (spec §8)
    paid_date:        Optional[datetime] = None
    status:           PayableStatus      = PayableStatus.PENDING
    is_reimbursable:  bool               = False
    payment_account:  Optional[str]      = None
    project_id:       Optional[str]      = None


class AccountPayableCreate(AccountPayableBase):
    pass


class AccountPayableUpdate(BaseModel):
    supplier_id:      Optional[UUID]     = None
    category_id:      Optional[UUID]     = None
    description:      Optional[str]      = None
    amount:           Optional[float]    = None
    due_date:         Optional[datetime] = None
    data_competencia: Optional[datetime] = None
    paid_date:        Optional[datetime] = None
    status:           Optional[PayableStatus] = None
    is_reimbursable:  Optional[bool]     = None
    payment_account:  Optional[str]      = None
    project_id:       Optional[str]      = None


class AccountPayableOut(AccountPayableBase):
    id:          UUID
    business_id: UUID
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── Account Categories (Plano de Contas) ─────────────────────────
class AccountCategoryCreate(BaseModel):
    parent_id: Optional[UUID]       = None
    name:      str
    type:      AccountCategoryType
    is_active: bool                 = True


class AccountCategoryUpdate(BaseModel):
    parent_id: Optional[UUID]            = None
    name:      Optional[str]             = None
    type:      Optional[AccountCategoryType] = None
    is_active: Optional[bool]            = None


class AccountCategoryOut(BaseModel):
    id:          UUID
    business_id: UUID
    parent_id:   Optional[UUID]
    name:        str
    type:        AccountCategoryType
    is_active:   bool
    created_at:  datetime

    class Config:
        from_attributes = True


# ── Entity Notes (Anotações Auditadas) ─────────────────────────────
class EntityNoteCreate(BaseModel):
    entity_type: str   # 'crm_contact' | 'cooperado' | 'billing_invoice' | 'account_payable'
    entity_id:   str
    content:     str


class EntityNoteOut(BaseModel):
    id:          UUID
    business_id: UUID
    entity_type: str
    entity_id:   str
    content:     str
    author_id:   str
    author_name: str
    created_at:  datetime

    class Config:
        from_attributes = True


# ── Entity Files ────────────────────────────────────────────────────
class EntityFileCreate(BaseModel):
    entity_type:   str
    entity_id:     str
    filename:      str
    file_url:      str
    file_category: Optional[str] = None
    file_size:     Optional[int] = None


class EntityFileOut(BaseModel):
    id:            UUID
    business_id:   UUID
    entity_type:   str
    entity_id:     str
    filename:      str
    file_url:      str
    file_category: Optional[str]
    file_size:     Optional[int]
    uploaded_by:   Optional[str]
    created_at:    datetime

    class Config:
        from_attributes = True


# ── Recurrences (Mensalidades / Assinaturas) ────────────────────────
class RecurrenceCreate(BaseModel):
    crm_contact_id: Optional[UUID]             = None
    cooperado_id:   Optional[UUID]             = None
    category_id:    Optional[UUID]             = None
    description:    str
    amount:         float
    frequency:      RecurrenceFrequency        = RecurrenceFrequency.MONTHLY
    first_due_date: datetime
    parcel_total:   Optional[int]              = None
    payment_method: PaymentMethod              = PaymentMethod.PIX


class RecurrenceUpdate(BaseModel):
    description:    Optional[str]              = None
    amount:         Optional[float]            = None
    frequency:      Optional[RecurrenceFrequency] = None
    parcel_total:   Optional[int]              = None
    status:         Optional[RecurrenceStatus] = None
    payment_method: Optional[PaymentMethod]    = None


class RecurrenceOut(BaseModel):
    id:              UUID
    business_id:     UUID
    crm_contact_id:  Optional[UUID]
    cooperado_id:    Optional[UUID]
    category_id:     Optional[UUID]
    description:     str
    amount:          float
    frequency:       RecurrenceFrequency
    first_due_date:  datetime
    next_due_date:   Optional[datetime]
    parcel_total:    Optional[int]
    parcel_current:  int
    status:          RecurrenceStatus
    payment_method:  PaymentMethod
    created_at:      datetime
    updated_at:      datetime

    class Config:
        from_attributes = True
