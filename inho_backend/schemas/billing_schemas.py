from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal
from models.models import BillingStatus, PaymentMethod

class BillingInvoiceCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_doc: Optional[str] = None
    amount: Decimal
    due_date: datetime
    payment_method: Optional[PaymentMethod] = PaymentMethod.PIX
    description: Optional[str] = None

class BillingInvoiceStatusUpdate(BaseModel):
    status: BillingStatus

class BillingInvoiceOut(BaseModel):
    id: UUID
    business_id: UUID
    customer_name: str
    customer_phone: Optional[str]
    customer_email: Optional[str]
    customer_doc: Optional[str]
    amount: Decimal
    due_date: datetime
    status: BillingStatus
    pix_code: Optional[str]
    pix_qr_url: Optional[str]
    payment_method: PaymentMethod
    description: Optional[str]
    notification_count: int
    last_notification_sent_at: Optional[datetime]
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
