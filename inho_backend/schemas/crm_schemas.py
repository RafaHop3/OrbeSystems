from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.models import (
    ContactCategory, PayableStatus,
    AccountCategoryType, RecurrenceFrequency, RecurrenceStatus, PaymentMethod
)


# ── CRM Contacts ──────────────────────────────────────────────────
from pydantic import BaseModel, EmailStr, field_validator
import re

class CRMContactBase(BaseModel):
    category:     ContactCategory
    name:         str
    document:     Optional[str] = None
    email:        Optional[EmailStr] = None
    phone:        Optional[str] = None
    bank_details: Optional[str] = None
    notes:        Optional[str] = None
    is_active:    bool = True

    # ---- B2B2C Corporate/Entity Extensions ----
    person_type:            Optional[str] = None
    municipal_registration: Optional[str] = None
    state_registration:     Optional[str] = None
    website:                Optional[str] = None
    contact_person:         Optional[str] = None
    nis:                    Optional[str] = None
    correios_matricula:     Optional[str] = None

    # Address fields (spec §2.2)
    address:      Optional[str] = None
    street:                 Optional[str] = None
    number:                 Optional[str] = None
    complement:             Optional[str] = None
    neighborhood:           Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    zip_code:     Optional[str] = None

    # Banking / Liquidation fields
    bank_code:              Optional[str] = None
    bank_agency:            Optional[str] = None
    bank_account:           Optional[str] = None
    pix_key_type:           Optional[str] = None
    pix_key:                Optional[str] = None

    # HR fields (spec §2.3 — relevant for EMPLOYEE)
    role_title:          Optional[str]      = None
    admission_date:      Optional[datetime] = None
    vacation_start_date: Optional[datetime] = None

    @field_validator('phone', mode='before')
    @classmethod
    def sanitize_whatsapp(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        nums = re.sub(r'\D', '', v)
        
        # 1. Se chegou limpo como DDD + Num (Ex: 51984743957 - 11 digitos) ou Fixo (10 digitos)
        if len(nums) in [10, 11] and not nums.startswith('55'):
            nums = '55' + nums
            
        # 2. Se for 13 digitos no padrão Orbe/Baileys com '55' no início e '9' extra
        # Regra do 9º Dígito: Removemos a 5º casa (que é o 9) para forçar o padrao 12-chars de API
        if len(nums) == 13 and nums.startswith('55') and nums[4] == '9':
            return nums[:4] + nums[5:]
            
        return nums


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
