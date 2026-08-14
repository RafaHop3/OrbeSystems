import uuid
import urllib.parse
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from db.session import get_db
from models.models import User, Business, BillingInvoice, BillingStatus, PaymentMethod, AuditAction
from services.audit import write_audit
from core.deps import get_current_user
from schemas.billing_schemas import (
    BillingInvoiceCreate, BillingInvoiceOut, BillingInvoiceStatusUpdate,
    BillingNotificationOut, BillingStatsOut
)

router = APIRouter()

async def _get_user_business(db: AsyncSession, user: User) -> Business:
    result = await db.execute(select(Business).where(Business.user_id == user.id))
    business = result.scalars().first()
    if not business:
        # Create a default business for the user if none exists
        business = Business(
            id=uuid.uuid4(),
            user_id=user.id,
            name=f"Empresa de {user.full_name}"
        )
        db.add(business)
        await db.commit()
        await db.refresh(business)
    return business

def _generate_mock_pix_code(invoice_id: uuid.UUID, amount: Decimal, customer_name: str) -> str:
    clean_id = str(invoice_id).replace('-', '')
    amt_str = f"{amount:.2f}".replace('.', '')
    return f"00020126580014br.gov.bcb.pix0136{clean_id}5204000053039865405{amt_str}5802BR5925INHO_PAYMENTS6009SAO_PAULO62070503***6304"

@router.get("/", response_model=List[BillingInvoiceOut])
async def list_invoices(
    status_filter: Optional[BillingStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    query = select(BillingInvoice).where(BillingInvoice.business_id == business.id).order_by(BillingInvoice.due_date.asc())
    if status_filter:
        query = query.where(BillingInvoice.status == status_filter)
    
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    # Auto-update status to OVERDUE for pending invoices past due date
    now = datetime.now(timezone.utc)
    updated = False
    for inv in invoices:
        if inv.status == BillingStatus.PENDING and inv.due_date < now:
            inv.status = BillingStatus.OVERDUE
            updated = True
    if updated:
        await db.commit()
        
    return invoices

@router.post("/", response_model=BillingInvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: BillingInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    invoice_id = uuid.uuid4()
    pix_code = _generate_mock_pix_code(invoice_id, payload.amount, payload.customer_name)
    pix_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(pix_code)}"

    invoice = BillingInvoice(
        id=invoice_id,
        business_id=business.id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        customer_doc=payload.customer_doc,
        amount=payload.amount,
        due_date=payload.due_date,
        status=BillingStatus.PENDING,
        pix_code=pix_code,
        pix_qr_url=pix_qr_url,
        payment_method=payload.payment_method or PaymentMethod.PIX,
        description=payload.description,
        created_by_id=current_user.id,
        created_by_name=f"{current_user.full_name} ({current_user.role_label})",
        updated_by_id=current_user.id,
        updated_by_name=f"{current_user.full_name} ({current_user.role_label})"
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    # Immutable Audit Log Registration
    await write_audit(
        db,
        action=AuditAction.CREATE,
        entity="billing_invoice",
        entity_id=str(invoice.id),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role_label,
        business_id=business.id,
        detail={
            "customer_name": payload.customer_name,
            "amount": float(payload.amount),
            "due_date": payload.due_date.isoformat(),
            "status": BillingStatus.PENDING.value
        }
    )

    return invoice

@router.patch("/{invoice_id}/status", response_model=BillingInvoiceOut)
async def update_invoice_status(
    invoice_id: uuid.UUID,
    payload: BillingInvoiceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(BillingInvoice).where(
            BillingInvoice.id == invoice_id,
            BillingInvoice.business_id == business.id
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")

    old_status = invoice.status.value
    invoice.status = payload.status
    invoice.updated_by_id = current_user.id
    invoice.updated_by_name = f"{current_user.full_name} ({current_user.role_label})"

    await db.commit()
    await db.refresh(invoice)

    # Immutable Audit Log Registration
    await write_audit(
        db,
        action=AuditAction.UPDATE,
        entity="billing_invoice",
        entity_id=str(invoice.id),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role_label,
        business_id=business.id,
        detail={
            "customer_name": invoice.customer_name,
            "old_status": old_status,
            "new_status": payload.status.value,
            "updated_by": f"{current_user.full_name} ({current_user.role_label})"
        }
    )

    return invoice

@router.post("/{invoice_id}/notify/whatsapp", response_model=BillingNotificationOut)
async def notify_whatsapp(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(BillingInvoice).where(
            BillingInvoice.id == invoice_id,
            BillingInvoice.business_id == business.id
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")

    phone = (invoice.customer_phone or "").replace("+", "").replace("-", "").replace(" ", "")
    if not phone:
        phone = "5511999999999" # Default fallback for testing

    due_str = invoice.due_date.strftime("%d/%m/%Y")
    amt_str = f"R$ {invoice.amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    status_tag = "AVISO DE COBRANÇA" if invoice.status != BillingStatus.OVERDUE else "URGENTE: COBRANÇA EM ATRASO"

    msg = (
        f"🚨 *{status_tag} - {business.name}*\n\n"
        f"Olá, *{invoice.customer_name}*!\n"
        f"Lembrete referente ao seu pagamento:\n\n"
        f"📌 *Descrição:* {invoice.description or 'Serviços/Produtos'}\n"
        f"💰 *Valor:* {amt_str}\n"
        f"📅 *Vencimento:* {due_str}\n"
        f"📊 *Status:* {invoice.status.value}\n\n"
        f"🔑 *Chave PIX Copia e Cola:*\n`{invoice.pix_code}`\n\n"
        f"Por favor, efetue o pagamento para manter sua conta em dia. Qualquer dúvida, responda esta mensagem."
    )

    encoded_msg = urllib.parse.quote(msg)
    wa_url = f"https://wa.me/{phone}?text={encoded_msg}"

    # Log notification
    invoice.notification_count += 1
    invoice.last_notification_sent_at = datetime.now(timezone.utc)
    await db.commit()

    return BillingNotificationOut(
        invoice_id=invoice.id,
        channel="WHATSAPP",
        recipient=phone,
        whatsapp_url=wa_url,
        message_body=msg,
        sent_at=invoice.last_notification_sent_at,
        status="SENT"
    )

@router.post("/{invoice_id}/notify/email", response_model=BillingNotificationOut)
async def notify_email(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(BillingInvoice).where(
            BillingInvoice.id == invoice_id,
            BillingInvoice.business_id == business.id
        )
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")

    email = invoice.customer_email or f"cliente_{str(invoice.id)[:6]}@cliente.com"
    due_str = invoice.due_date.strftime("%d/%m/%Y")
    amt_str = f"R$ {invoice.amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    msg = (
        f"Assunto: Notice de Cobrança - {business.name}\n\n"
        f"Prezado(a) {invoice.customer_name},\n\n"
        f"Comunicamos o envio da sua cobrança com vencimento em {due_str}.\n"
        f"Valor: {amt_str}\n\n"
        f"Chave PIX: {invoice.pix_code}\n\n"
        f"Atenciosamente,\n{business.name}"
    )

    invoice.notification_count += 1
    invoice.last_notification_sent_at = datetime.now(timezone.utc)
    await db.commit()

    return BillingNotificationOut(
        invoice_id=invoice.id,
        channel="EMAIL",
        recipient=email,
        whatsapp_url=None,
        message_body=msg,
        sent_at=invoice.last_notification_sent_at,
        status="SENT"
    )

@router.get("/stats", response_model=BillingStatsOut)
async def get_billing_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    invoices_res = await db.execute(select(BillingInvoice).where(BillingInvoice.business_id == business.id))
    invoices = invoices_res.scalars().all()

    total_invoices = len(invoices)
    pending_sum = Decimal(0)
    paid_sum = Decimal(0)
    overdue_sum = Decimal(0)
    notifications_count = 0

    now = datetime.now(timezone.utc)

    for inv in invoices:
        notifications_count += inv.notification_count
        if inv.status == BillingStatus.PAID:
            paid_sum += inv.amount
        elif inv.status == BillingStatus.OVERDUE or (inv.status == BillingStatus.PENDING and inv.due_date < now):
            overdue_sum += inv.amount
        elif inv.status == BillingStatus.PENDING:
            pending_sum += inv.amount

    return BillingStatsOut(
        total_invoices=total_invoices,
        pending_amount=f"{pending_sum:.2f}",
        paid_amount=f"{paid_sum:.2f}",
        overdue_amount=f"{overdue_sum:.2f}",
        notifications_sent=notifications_count
    )
