import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import AsyncSessionLocal
from models.models import BillingInvoice, BillingStatus
from services.messaging import format_whatsapp_phone

logger = logging.getLogger("notification_job")
WHATSAPP_SERVICE_URL = "http://orbe_whatsapp:3001/send"

async def process_billing_reminders():
    """Motor automático de varredura de Faturas e disparos de WhatsApp"""
    today = datetime.now(timezone.utc).date()
    
    async with AsyncSessionLocal() as db:
        try:
            target_date_d_minus_3 = today + timedelta(days=3)
            query_preventive = select(BillingInvoice).where(
                BillingInvoice.status == BillingStatus.PENDING,
                BillingInvoice.due_date == target_date_d_minus_3,
                BillingInvoice.reminder_before_sent_at.is_(None)
            )
            res_prev = await db.execute(query_preventive)
            invoices_d_minus_3 = res_prev.scalars().all()

            target_date_d0 = today
            query_today = select(BillingInvoice).where(
                BillingInvoice.status == BillingStatus.PENDING,
                BillingInvoice.due_date == target_date_d0,
                BillingInvoice.reminder_due_sent_at.is_(None)
            )
            res_today = await db.execute(query_today)
            invoices_today = res_today.scalars().all()

            target_date_d_plus_3 = today - timedelta(days=3)
            query_overdue = select(BillingInvoice).where(
                BillingInvoice.status == BillingStatus.OVERDUE,
                BillingInvoice.due_date == target_date_d_plus_3,
                BillingInvoice.reminder_after_sent_at.is_(None)
            )
            res_ov = await db.execute(query_overdue)
            invoices_overdue = res_ov.scalars().all()

            await _dispatch_whatsapp_batch(db, invoices_d_minus_3, "preventive")
            await _dispatch_whatsapp_batch(db, invoices_today, "due")
            await _dispatch_whatsapp_batch(db, invoices_overdue, "after")

        except Exception as e:
            logger.error(f"[Scheduler] Erro ao varrer banco para disparos: {e}")

async def _dispatch_whatsapp_batch(db: AsyncSession, invoices: list, category: str):
    import httpx
    import urllib.parse
    
    if not invoices:
        return
        
    async with httpx.AsyncClient(timeout=10.0) as client:
        for inv in invoices:
            raw_phone = inv.customer_phone or "5511999999999"
            phone = format_whatsapp_phone(raw_phone)
            
            clean_pix = str(inv.pix_code) if inv.pix_code else ""
            amt_str = f"R$ {inv.amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            due_str = inv.due_date.strftime("%d/%m/%Y")
            
            if category == "preventive":
                msg = (
                    f"Olá, *{inv.customer_name}*!\n\n"
                    f"Passando para lembrar que sua fatura de {amt_str} vence em breve ({due_str}).\n"
                    f"Para sua comodidade, você pode pagar via Pix usando o código abaixo:\n\n"
                    f"*{clean_pix}*"
                )
            elif category == "due":
                msg = (
                    f"Olá, *{inv.customer_name}*! 🚨\n\n"
                    f"Sua fatura de {amt_str} vence **HOJE** ({due_str}).\n"
                    f"Realize o pagamento copiando o código Pix abaixo:\n\n"
                    f"*{clean_pix}*"
                )
            else: # category == "after"
                msg = (
                    f"Olá, *{inv.customer_name}*. ⚠️\n\n"
                    f"Consta em aberto a sua fatura de {amt_str} com vencimento em {due_str}.\n"
                    f"Caso já tenha efetuado o pagamento, por favor desconsidere.\n"
                    f"Segue o Pix atualizado para regularização rápida:\n\n"
                    f"*{clean_pix}*"
                )
                
            try:
                res = await client.post(WHATSAPP_SERVICE_URL, json={"phone": phone, "message": msg})
                if res.status_code == 200:
                    now_ts = datetime.now(timezone.utc)
                    if category == "preventive":
                        inv.reminder_before_sent_at = now_ts
                    elif category == "due":
                        inv.reminder_due_sent_at = now_ts
                    elif category == "after":
                        inv.reminder_after_sent_at = now_ts
                        
                    inv.notification_count += 1
                    inv.last_notification_sent_at = now_ts
                    await db.commit()
            except Exception as e:
                logger.error(f"[Scheduler] Falha no disparo WhatsApp para a Fatura {inv.id}: {e}")
