import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import AsyncSessionLocal
from models.models import BillingInvoice, BillingStatus, Business, CRMContact
from services.messaging import format_whatsapp_phone
from services.ai_agent import is_ai_kill_switch_active, format_orbrick_ai_message

logger = logging.getLogger("notification_job")
WHATSAPP_SERVICE_URL = "http://orbe_whatsapp:3001/send"


def _day_start(d):
    """Início do dia (UTC) para comparar due_date (DateTime) com uma data, sem depender de igualdade exata."""
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


async def process_billing_reminders():
    """Motor automático de varredura de Faturas e disparos de WhatsApp (Régua D-3, D0, D+3 + OrBrick-IA)"""
    today = datetime.now(timezone.utc).date()

    async with AsyncSessionLocal() as db:
        try:
            target_date_d_minus_3 = today + timedelta(days=3)
            query_preventive = select(BillingInvoice).where(
                BillingInvoice.status == BillingStatus.PENDING,
                BillingInvoice.due_date >= _day_start(target_date_d_minus_3),
                BillingInvoice.due_date < _day_start(target_date_d_minus_3) + timedelta(days=1),
                BillingInvoice.reminder_before_sent_at.is_(None),
            )
            res_prev = await db.execute(query_preventive)
            invoices_d_minus_3 = res_prev.scalars().all()

            target_date_d0 = today
            query_today = select(BillingInvoice).where(
                BillingInvoice.status == BillingStatus.PENDING,
                BillingInvoice.due_date >= _day_start(target_date_d0),
                BillingInvoice.due_date < _day_start(target_date_d0) + timedelta(days=1),
                BillingInvoice.reminder_due_sent_at.is_(None),
            )
            res_today = await db.execute(query_today)
            invoices_today = res_today.scalars().all()

            target_date_d_plus_3 = today - timedelta(days=3)
            query_overdue = select(BillingInvoice).where(
                BillingInvoice.status == BillingStatus.OVERDUE,
                BillingInvoice.due_date >= _day_start(target_date_d_plus_3),
                BillingInvoice.due_date < _day_start(target_date_d_plus_3) + timedelta(days=1),
                BillingInvoice.reminder_after_sent_at.is_(None),
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

    if not invoices:
        return

    async with httpx.AsyncClient(timeout=10.0) as client:
        for inv in invoices:
            raw_phone = inv.customer_phone
            if not raw_phone:
                logger.warning(f"[Scheduler] Fatura {inv.id} sem telefone; lembrete ignorado.")
                continue
            phone = format_whatsapp_phone(raw_phone)

            clean_pix = str(inv.pix_code) if inv.pix_code else ""
            amt_str = f"R$ {inv.amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            due_str = inv.due_date.strftime("%d/%m/%Y")

            # Verificar status da IA no tenant e no contato (com fallback gracioso)
            biz_name = "Orbe Systems"
            ai_active = True
            try:
                biz_res = await db.execute(select(Business).where(Business.id == inv.business_id))
                biz_obj = biz_res.scalar_one_or_none()
                if biz_obj and biz_obj.name:
                    biz_name = biz_obj.name
                if is_ai_kill_switch_active(str(inv.business_id)):
                    ai_active = False
                elif inv.crm_contact_id:
                    c_res = await db.execute(
                        select(CRMContact).where(
                            CRMContact.id == inv.crm_contact_id,
                            CRMContact.business_id == inv.business_id,
                        )
                    )
                    c_obj = c_res.scalar_one_or_none()
                    if c_obj:
                        if not getattr(c_obj, "ai_attendance_enabled", True):
                            ai_active = False
                        handoff_dt = getattr(c_obj, "ai_handoff_until", None)
                        if handoff_dt and handoff_dt > datetime.now(timezone.utc):
                            ai_active = False
            except Exception:
                ai_active = False

            if category == "preventive":
                base_msg = (
                    f"Olá, *{inv.customer_name}*!\n\n"
                    f"Passando para lembrar que sua fatura de {amt_str} vence em breve ({due_str}).\n"
                    f"Para sua comodidade, você pode pagar via Pix usando o código abaixo:\n\n"
                    f"*{clean_pix}*"
                )
            elif category == "due":
                base_msg = (
                    f"Olá, *{inv.customer_name}*! 🚨\n\n"
                    f"Sua fatura de {amt_str} vence **HOJE** ({due_str}).\n"
                    f"Realize o pagamento copiando o código Pix abaixo:\n\n"
                    f"*{clean_pix}*"
                )
            else:  # category == "after"
                base_msg = (
                    f"Olá, *{inv.customer_name}*. ⚠️\n\n"
                    f"Consta em aberto a sua fatura de {amt_str} com vencimento em {due_str}.\n"
                    f"Caso já tenha efetuado o pagamento, por favor desconsidere.\n"
                    f"Segue o Pix atualizado para regularização rápida:\n\n"
                    f"*{clean_pix}*"
                )

            if ai_active:
                msg = format_orbrick_ai_message(
                    biz_name,
                    base_msg + "\n\n_Dúvidas ou comprovante PIX? Responda esta mensagem ou digite ATENDENTE._",
                )
            else:
                msg = base_msg

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
