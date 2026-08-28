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

from pydantic import BaseModel
import httpx
import os
import asyncio
from fastapi import Header
from services.messaging import async_dispatch_whatsapp_receipt, async_dispatch_email_receipt

class WebhookReconcileRequest(BaseModel):
    email: str
    action: str = "payment_succeeded"


@router.post("/webhook/reconcile", response_model=dict, status_code=status.HTTP_200_OK)
async def webhook_reconcile_billing(
    payload: WebhookReconcileRequest,
    x_inho_system_secret: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    INTERNAL USE ONLY: Chamado pelo Webhook do Orbe Hub após pagamento no Stripe para limpeza de faturas e disparo de recibos via Zap/Email.
    """
    expected_secret = os.getenv("INHO_SYSTEM_SECRET", "super_secret_inho_provisioning_key_change_me")
    if not x_inho_system_secret or x_inho_system_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Acesso negado: Secret de sistema inválido.")

    # 1. Tentar encontrar a cobrança pelo E-mail que está PENDENTE ou VENCIDA
    query = select(BillingInvoice).where(
        BillingInvoice.customer_email == payload.email,
        or_(BillingInvoice.status == BillingStatus.PENDING, BillingInvoice.status == BillingStatus.OVERDUE)
    ).order_by(BillingInvoice.due_date.asc())
    
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    if not invoices:
        return {"status": "ok", "message": f"Nenhuma fatura pendente encontrada para {payload.email}"}
        
    for invoice in invoices:
        old_status = invoice.status.value
        invoice.status = BillingStatus.PAID
        invoice.updated_by_name = "Stripe Webhook (System Auto-Clear)"
        
        # Dispatch Async Notifications (Email/WA Receipt)
        phone = (invoice.customer_phone or "5511999999999").replace("+", "").replace("-", "").replace(" ", "")
        business = await db.execute(select(Business).where(Business.id == invoice.business_id))
        biz_obj = business.scalars().first()
        b_name = biz_obj.name if biz_obj else "Orbe Systems"
        
        asyncio.create_task(async_dispatch_whatsapp_receipt(phone, invoice.customer_name, invoice.amount, b_name))
        asyncio.create_task(async_dispatch_email_receipt(payload.email, invoice.customer_name, invoice.amount, b_name))
        
        # Log resolution
        await write_audit(
            db,
            action=AuditAction.UPDATE,
            entity="billing_invoice",
            entity_id=str(invoice.id),
            user_id=invoice.created_by_id,
            user_name="SYSTEM_WEBHOOK",
            user_role="SYSTEM",
            business_id=invoice.business_id,
            detail={
                "action": "AUTO_CLEAR_PAYMENT",
                "customer_email": payload.email,
                "old_status": old_status,
                "new_status": "PAID",
                "notifications_triggered": ["whatsapp_receipt", "email_receipt"]
            }
        )
        
    await db.commit()
    
    return {
        "status": "success", 
        "message": f"Baixa automática efetuada em {len(invoices)} faturas pendentes. Notificações disparadas."
    }

# ── B2B2C Webhook (Universal Bank Integration) ──────────────────────────
# ── B2B2C Webhook (Universal Bank Integration) ──────────────────────────
from fastapi.responses import JSONResponse
import hashlib
from models.models import WebhookLog, WebhookProcessingStatus, InvoiceType, Cooperado, CooperadoStatus

class BankWebhookPayload(BaseModel):
    event_id: Optional[str] = None
    event: str  # e.g., "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"
    document: str # CPF_CNPJ of the end-client
    amount: float
    bank_provider: str = "GENERIC_BANK"
    invoice_id: Optional[uuid.UUID] = None

@router.post("/webhook/bank", response_model=dict, status_code=status.HTTP_200_OK)
async def webhook_bank_boleto_b2b2c(
    payload: BankWebhookPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook universal agnóstico para Billing FSM: 
    Resolve idempotência, processa fila assíncrona, atualiza Invoices e promove status societário (Cooperados).
    """
    # 1. Idempotency Check with lock mapping
    event_id = payload.event_id
    if not event_id:
        raw_str = f"{payload.event}-{payload.document}-{payload.amount}-{payload.bank_provider}"
        event_id = hashlib.sha256(raw_str.encode()).hexdigest()

    existing_log = (await db.execute(select(WebhookLog).where(WebhookLog.event_id == event_id))).scalar_one_or_none()
    if existing_log:
        return JSONResponse(status_code=200, content={"status": "idempotent_ok", "message": "Webhook já processado anteriormente."})
    
    # 2. Persist WebhookLog
    w_log = WebhookLog(
        event_id=event_id,
        provider=payload.bank_provider,
        payload=payload.model_dump_json(),
        status=WebhookProcessingStatus.RECEIVED
    )
    db.add(w_log)
    await db.flush() # Secure Log row ID

    if payload.event not in ["PAYMENT_RECEIVED", "BOLETO_PAGO", "PAYMENT_CONFIRMED"]:
        w_log.status = WebhookProcessingStatus.IGNORED
        await db.commit()
        return {"status": "ignored", "message": "Ignorando evento alheio a liquidação de fatura."}

    # 3. Find and lock Invoice ATOMICALLY (SELECT FOR UPDATE)
    clean_doc = payload.document.replace(".", "").replace("-", "").replace("/", "")
    inv_query = select(BillingInvoice).where(
        BillingInvoice.customer_doc == clean_doc,
        or_(BillingInvoice.status == BillingStatus.PENDING, BillingInvoice.status == BillingStatus.OVERDUE)
    ).order_by(BillingInvoice.due_date.asc())
    
    if payload.invoice_id:
        inv_query = inv_query.where(BillingInvoice.id == payload.invoice_id)
        
    inv_query = inv_query.with_for_update(nowait=False)
    invoices = (await db.execute(inv_query)).scalars().all()

    if not invoices:
        w_log.status = WebhookProcessingStatus.FAILED
        w_log.error_message = "Fatura não combinada ou já paga."
        await db.commit()
        return {"status": "not_found", "message": "Fatura inexistente ou liquidada."}

    cooperado_upgraded = False
    
    # Process First Matching Invoice
    inv = invoices[0] 
    inv.status = BillingStatus.PAID
    inv.updated_by_name = f"System Webhook ({payload.bank_provider})"
    
    # 4. FSM Execution: Advance Cooperado Status if it's an Integralization
    if inv.cooperado_id:
        coop_res = await db.execute(select(Cooperado).where(Cooperado.id == inv.cooperado_id).with_for_update())
    else:
        coop_res = await db.execute(select(Cooperado).where(Cooperado.business_id == inv.business_id, Cooperado.document == clean_doc).with_for_update())
        
    cooperado = coop_res.scalars().first()
    
    if cooperado and inv.invoice_type in [InvoiceType.INTEGRALIZACAO_INICIAL, InvoiceType.OUTROS]:
        if cooperado.status in [CooperadoStatus.PROPOSTA_CADASTRADA, CooperadoStatus.AGUARDANDO_INTEGRALIZACAO]:
            cooperado.status = CooperadoStatus.ATIVO
            cooperado_upgraded = True
            
            biz_obj = (await db.execute(select(Business).where(Business.id == inv.business_id))).scalars().first()
            b_name = biz_obj.name if biz_obj else "Orbe Cooperativa"
            ph = (cooperado.phone or inv.customer_phone or "5511999999999").replace("+", "").replace("-", "").replace(" ", "")
            
            # Queue Async Messaging Tasks (Non-blocking)
            asyncio.create_task(async_dispatch_whatsapp_receipt(ph, cooperado.name, inv.amount, b_name))
            asyncio.create_task(async_dispatch_email_receipt(cooperado.email or inv.customer_email or "admin@inho.com", cooperado.name, inv.amount, b_name))
    
    w_log.status = WebhookProcessingStatus.PROCESSED
    await db.commit()
    
    return {
        "status": "success",
        "invoices_cleared": 1,
        "cooperado_upgraded": cooperado_upgraded
    }
