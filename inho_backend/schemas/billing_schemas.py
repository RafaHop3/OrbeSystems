from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from decimal import Decimal
from models.models import BillingStatus, PaymentMethod, InvoiceType

class BillingInvoiceCreate(BaseModel):
    category_id: Optional[UUID] = None
    cooperado_id: Optional[UUID] = None
    crm_contact_id: Optional[UUID] = None
    invoice_type: Optional[InvoiceType] = InvoiceType.OUTROS
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_doc: Optional[str] = None
    amount: Decimal
    due_date: datetime
    data_competencia: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = PaymentMethod.PIX
    description: Optional[str] = None
    project_id: Optional[str] = None

class BillingInvoiceStatusUpdate(BaseModel):
    status: BillingStatus

class BillingInvoiceOut(BaseModel):
    id: UUID
    business_id: UUID
    cooperado_id: Optional[UUID] = None
    crm_contact_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    invoice_type: InvoiceType
    customer_name: str
    customer_phone: Optional[str]
    customer_email: Optional[str]
    customer_doc: Optional[str]
    amount: Decimal
    due_date: datetime
    data_competencia: Optional[datetime]
    status: BillingStatus
    pix_code: Optional[str]
    pix_qr_url: Optional[str]
    payment_method: PaymentMethod
    description: Optional[str]
    project_id: Optional[str]
    notification_count: int
    last_notification_sent_at: Optional[datetime]
    viewed_at: Optional[datetime]
    remaining_balance: Optional[Decimal]
    created_by_name: Optional[str] = None
    updated_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BillingNotificationOut(BaseModel):
    invoice_id: UUID
    channel: str  # 'WHATSAPP' | 'EMAIL'
    recipient: str
    whatsapp_url: Optional[str] = None
    message_body: str
    sent_at: datetime
    status: str

class BillingStatsOut(BaseModel):
    total_invoices: int
    pending_amount: str
    paid_amount: str
    overdue_amount: str
    notifications_sent: int

# ── Bulk & Actions ────────────────────────────────────────────────
class BulkInvoiceAction(BaseModel):
    invoice_ids: List[UUID]

class PartialSettle(BaseModel):
    amount_paid: Decimal

# ── Recurrence ────────────────────────────────────────────────────
class RecurrenceCreate(BaseModel):
    category_id: Optional[UUID] = None
    crm_contact_id: Optional[UUID] = None
    cooperado_id: Optional[UUID] = None
    description: str
    amount: Decimal
    frequency: str  # DAILY, WEEKLY, MONTHLY, ANNUAL
    first_due_date: datetime
    parcel_total: Optional[int] = None
    payment_method: Optional[PaymentMethod] = PaymentMethod.PIX

class RecurrenceOut(BaseModel):
    id: UUID
    business_id: UUID
    category_id: Optional[UUID]
    crm_contact_id: Optional[UUID]
    cooperado_id: Optional[UUID]
    description: str
    amount: Decimal
    frequency: str
    first_due_date: datetime
    next_due_date: Optional[datetime]
    parcel_total: Optional[int]
    parcel_current: int
    status: str
    payment_method: PaymentMethod
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
