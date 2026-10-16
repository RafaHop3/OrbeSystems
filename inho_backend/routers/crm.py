from sqlalchemy import cast, String
"""
INHO – Router: CRM Completo (Contatos, Contas a Pagar)
Full CRUD + filtros + timeline de inadimplência (spec §2)
"""
import csv
import io
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select, cast, String, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    AccountPayable, BillingInvoice, BillingStatus, CRMContact, ContactCategory,
    PayableStatus, User, Business
)
from routers.billing import _get_user_business
from schemas.crm_schemas import (
    AccountPayableCreate, AccountPayableOut, AccountPayableUpdate,
    CRMContactCreate, CRMContactOut, CRMContactUpdate,
)

router = APIRouter(prefix="/crm", tags=["CRM & Financials"])


# ── Helpers ───────────────────────────────────────────────────────
async def _biz(db: AsyncSession, user: User) -> Business:
    return await _get_user_business(db, user)

def get_uuid(val):
    import os
    from uuid import UUID
    if not val: return val
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")
    if is_sqlite:
        return str(val)
    if isinstance(val, str):
        try:
            return UUID(val)
        except ValueError:
            return val
    return val


# ── CONTACTS ──────────────────────────────────────────────────────

@router.post("/contacts/", response_model=CRMContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact: CRMContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        business = await _biz(db, current_user)
        
        # fix asyncpg datatype mismatch while preserving sqlite pytests compatibility
        b_id = get_uuid(business.id)
        
        db_contact = CRMContact(**contact.model_dump(), business_id=b_id)
        db.add(db_contact)
        await db.commit()
        await db.refresh(db_contact)
        return db_contact
    except HTTPException:
        raise
    except Exception:
        import logging
        logging.getLogger("inho.crm").exception("Erro ao criar contato")
        raise HTTPException(status_code=400, detail="Nao foi possivel criar o contato. Verifique os dados e tente novamente.")


@router.get("/contacts/", response_model=List[CRMContactOut])
async def list_contacts(
    category: Optional[str]  = Query(None, description="EMPLOYEE|SUPPLIER|CUSTOMER|PARTNER"),
    is_active: Optional[bool] = Query(None),
    overdue_only: bool        = Query(False, description="Retorna apenas contatos com faturas vencidas"),
    search: Optional[str]    = Query(None, description="Busca por nome, documento ou e-mail"),
    skip: int                = Query(0, ge=0),
    limit: int               = Query(100, le=500),
    db: AsyncSession         = Depends(get_db),
    current_user: User       = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    b_id = get_uuid(business.id)
    query = select(CRMContact).where(CRMContact.business_id == b_id)

    if category:
        query = query.where(CRMContact.category == ContactCategory("PARTNER" if category.upper() == "COOPERADO" else category))
    if is_active is not None:
        query = query.where(CRMContact.is_active == is_active)
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        query = query.where(
            or_(
                CRMContact.name.ilike(like),
                CRMContact.document.ilike(like),
                CRMContact.email.ilike(like),
            )
        )

    # Inadimplência: vincular faturas vencidas/abertas
    if overdue_only:
        from sqlalchemy import exists
        overdue_sub = (
            select(BillingInvoice.id)
            .where(
                BillingInvoice.business_id == b_id,
                BillingInvoice.crm_contact_id == CRMContact.id,
                BillingInvoice.status.in_([BillingStatus.OVERDUE, BillingStatus.PENDING]),
                BillingInvoice.due_date < datetime.now(timezone.utc)
            )
        )
        query = query.where(exists(overdue_sub))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/contacts/{contact_id}", response_model=CRMContactOut)
async def get_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMContact).where(
            CRMContact.id == get_uuid(contact_id),
            CRMContact.business_id == get_uuid(business.id)
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contato não encontrado")
    return contact


@router.put("/contacts/{contact_id}", response_model=CRMContactOut)
async def update_contact(
    contact_id: str,
    payload: CRMContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMContact).where(
            CRMContact.id == get_uuid(contact_id),
            CRMContact.business_id == get_uuid(business.id)
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contato não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMContact).where(
            CRMContact.id == get_uuid(contact_id),
            CRMContact.business_id == get_uuid(business.id)
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contato não encontrado")
    await db.delete(contact)
    await db.commit()


@router.get("/contacts/{contact_id}/timeline")
async def get_contact_timeline(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Linha do tempo: próximas e últimas transações do contato (spec §2.6)."""
    business = await _biz(db, current_user)
    now = datetime.now(timezone.utc)

    # Próximas contas a receber
    upcoming_q = await db.execute(
        select(BillingInvoice)
        .where(
            BillingInvoice.business_id == get_uuid(business.id),
            BillingInvoice.crm_contact_id == get_uuid(contact_id),
            BillingInvoice.due_date >= now,
            BillingInvoice.status == BillingStatus.PENDING,
        )
        .order_by(BillingInvoice.due_date.asc())
        .limit(5)
    )
    upcoming = upcoming_q.scalars().all()

    # Últimas contas recebidas
    last_q = await db.execute(
        select(BillingInvoice)
        .where(
            BillingInvoice.business_id == get_uuid(business.id),
            BillingInvoice.crm_contact_id == get_uuid(contact_id),
            BillingInvoice.status == BillingStatus.PAID,
        )
        .order_by(BillingInvoice.updated_at.desc())
        .limit(5)
    )
    last_paid = last_q.scalars().all()

    def _serialize(inv):
        return {
            "id": str(inv.id),
            "amount": float(inv.amount),
            "due_date": inv.due_date.isoformat(),
            "status": inv.status.value,
            "description": inv.description,
        }

    return {
        "contact_id": str(contact_id),
        "upcoming_receivables": [_serialize(i) for i in upcoming],
        "last_received": [_serialize(i) for i in last_paid],
        "open_balance": sum(float(i.amount) for i in upcoming),
    }


@router.post("/contacts/import", summary="Importação em lote via CSV (spec §2.5)")
async def import_contacts_csv(
    file: UploadFile = File(..., description="CSV com colunas: name,document,email,phone,category"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    created, skipped = 0, 0
    for row in reader:
        try:
            category = ContactCategory(row.get("category", "CUSTOMER").upper())
            b_id = get_uuid(business.id)
            contact = CRMContact(
                business_id=b_id,
                category=category,
                name=row["name"],
                document=row.get("document"),
                email=row.get("email") or None,
                phone=row.get("phone"),
                address=row.get("address"),
                city=row.get("city"),
                state=row.get("state"),
                zip_code=row.get("zip_code"),
            )
            db.add(contact)
            created += 1
        except Exception:
            skipped += 1

    await db.commit()
    return {"imported": created, "skipped": skipped}


# ── ACCOUNTS PAYABLE ──────────────────────────────────────────────

@router.post("/payable/", response_model=AccountPayableOut, status_code=status.HTTP_201_CREATED)
async def create_payable(
    payable: AccountPayableCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    
    b_id = get_uuid(business.id)
    
    data = payable.model_dump()
    if data.get("supplier_id") and isinstance(data["supplier_id"], str):
        data["supplier_id"] = get_uuid(data["supplier_id"])
    if data.get("category_id") and isinstance(data["category_id"], str):
        data["category_id"] = get_uuid(data["category_id"])
        
    db_payable = AccountPayable(**data, business_id=b_id)
    db.add(db_payable)
    await db.commit()
    await db.refresh(db_payable)
    return db_payable


@router.get("/payable/", response_model=List[AccountPayableOut])
async def list_payables(
    status_filter: Optional[PayableStatus] = Query(None),
    supplier_id: Optional[str]            = Query(None),
    overdue_only: bool                     = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    query = select(AccountPayable).where(AccountPayable.business_id == get_uuid(business.id))

    if status_filter:
        query = query.where(AccountPayable.status == status_filter)
    if supplier_id:
        query = query.where(AccountPayable.supplier_id == get_uuid(supplier_id))
    if overdue_only:
        now = datetime.now(timezone.utc)
        query = query.where(
            AccountPayable.due_date < now,
            AccountPayable.status == PayableStatus.PENDING
        )

    result = await db.execute(query.order_by(AccountPayable.due_date.asc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/payable/{payable_id}", response_model=AccountPayableOut)
async def get_payable(
    payable_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.id == get_uuid(payable_id),
            AccountPayable.business_id == get_uuid(business.id)
        )
    )
    payable = result.scalar_one_or_none()
    if not payable:
        raise HTTPException(404, "Conta a pagar não encontrada")
    return payable


@router.put("/payable/{payable_id}", response_model=AccountPayableOut)
async def update_payable(
    payable_id: str,
    payload: AccountPayableUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.id == get_uuid(payable_id),
            AccountPayable.business_id == get_uuid(business.id)
        )
    )
    payable = result.scalar_one_or_none()
    if not payable:
        raise HTTPException(404, "Conta a pagar não encontrada")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(payable, field, value)

    await db.commit()
    await db.refresh(payable)
    return payable


@router.delete("/payable/{payable_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payable(
    payable_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.id == get_uuid(payable_id),
            AccountPayable.business_id == get_uuid(business.id)
        )
    )
    payable = result.scalar_one_or_none()
    if not payable:
        raise HTTPException(404, "Conta a pagar não encontrada")
    await db.delete(payable)
    await db.commit()


@router.get("/payable/summary/totals")
async def payable_totals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Total a pagar por status (spec §3.6 — painel de totalização)."""
    business = await _biz(db, current_user)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    rows = await db.execute(
        select(AccountPayable).where(AccountPayable.business_id == get_uuid(business.id))
    )
    payables = rows.scalars().all()

    pending = sum(float(p.amount) for p in payables if p.status == PayableStatus.PENDING and p.due_date >= now)
    overdue = sum(float(p.amount) for p in payables if p.status == PayableStatus.PENDING and p.due_date < now)
    paid = sum(float(p.amount) for p in payables if p.status == PayableStatus.PAID)

    return {"pending": pending, "overdue": overdue, "paid": paid, "total": pending + overdue}


# ── DEALS (FUNIL KANBAN) ──────────────────────────────────────────

from models.models import CRMDeal, DealStage, DealStatus
from schemas.crm_schemas import CRMDealCreate, CRMDealUpdate, CRMDealOut

@router.get("/deals", response_model=List[CRMDealOut])
async def list_deals(
    stage: Optional[DealStage] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista as negociações do funil Kanban."""
    business = await _biz(db, current_user)
    stmt = select(CRMDeal).where(CRMDeal.business_id == get_uuid(business.id))
    if stage:
        stmt = stmt.where(CRMDeal.stage == stage)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/deals", response_model=CRMDealOut)
async def create_deal(
    deal: CRMDealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria um Card de Negociação no Funil Kanban."""
    business = await _biz(db, current_user)
    obj = CRMDeal(**deal.model_dump(), business_id=get_uuid(business.id))
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

@router.patch("/deals/{deal_id}", response_model=CRMDealOut)
async def update_deal(
    deal_id: str,
    payload: CRMDealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza o drag-and-drop do Card (Workflow). Se 'WON', pode engatilhar faturamento automático."""
    from models.models import AccountPayable
    from models.models import PayableStatus

    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMDeal).where(CRMDeal.id == get_uuid(deal_id), CRMDeal.business_id == get_uuid(business.id))
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal não encontrado no Funil")
    
    update_data = payload.model_dump(exclude_unset=True)
    old_stage = deal.stage
    new_stage = update_data.get("stage", None)

    for k, v in update_data.items():
        setattr(deal, k, v)
        
    # Automação Sprint 3: Se arrastou pra Fechado (WON), gera Conta a Receber/Fatura
    if new_stage == DealStage.WON and old_stage != DealStage.WON:
        # TODO: Para simular fatura, ideal seria AccountReceivable. 
        # Como o INHO tem o PayableStatus e a plataforma lida com Recebimentos em outras rotas, injetamos log ou lógica base aqui.
        deal.status = DealStatus.CLOSED
        
    await db.commit()
    await db.refresh(deal)
    return deal

# ── OMNICHANNEL CENTRAL PROXY (WHATSAPP + EMAIL) ───────────────────────────────
import httpx
import os
import asyncio
from pydantic import BaseModel
from typing import Optional

class OmnichannelDirectMessage(BaseModel):
    phone: str
    email: Optional[str] = None
    subject: Optional[str] = "Orbe Systems - Nova Mensagem"
    message: str

@router.post("/whatsapp/send")
async def proxy_omnichannel_message(
    payload: OmnichannelDirectMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Despacha a mensagem digitada pelo Usuário para:
    1. A API Baileys no container `orbe_whatsapp:3001` (WhatsApp)
    2. A API Resend para E-mail B2B
    """
    try:
        business = await _biz(db, current_user)
        b_id = get_uuid(business.id)
        sender_id = get_uuid(current_user.id)

        sender_name = (
            getattr(current_user, "full_name_db", None)
            or getattr(current_user, "full_name", None)
            or (current_user.email.split("@")[0] if getattr(current_user, "email", None) else "Operador")
        ).strip()
        raw_msg = payload.message.strip()
        if ">orbrick>" not in raw_msg.lower():
            final_message = f"*{sender_name}>Orbrick>* {raw_msg}"
        else:
            final_message = raw_msg

        import re
        digits = re.sub(r'\D', '', payload.phone)
        if len(digits) in [10, 11]:
            digits = "55" + digits
            
        phones_to_try = [digits]
        if len(digits) == 13 and digits.startswith("55"):
            sem_9 = digits[:4] + digits[5:]
            phones_to_try.append(sem_9)
            
        wa_status = []
        email_status = None
        global_db_status = "SENT"
        
        delivered = False
        async with httpx.AsyncClient() as client:
            for num in phones_to_try:
                try:
                    wa_res = await client.post("http://orbe_whatsapp:3001/send", json={
                        "phone": num,
                        "message": final_message
                    }, timeout=10.0)
                    if wa_res.status_code == 200:
                        wa_status.append("DELIVERED:200")
                        delivered = True
                        break
                    wa_status.append(f"HTTP:{wa_res.status_code}")
                except Exception:
                    wa_status.append("FAILED:Erro")
            if not delivered:
                global_db_status = "FAILED"
                
            resend_key = os.environ.get("RESEND_API_KEY", "")
            if payload.email and resend_key:
                try:
                    html_msg = f"<div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'><h2 style='color: #00fff5; background: #020406; padding: 15px; border-radius: 8px;'>Orbe Systems - Central B2B</h2><p>Ola,</p><p><strong>{sender_name}&gt;Orbrick&gt;</strong> {raw_msg}</p><hr style='border: top: 1px solid #eee; margin: 20px 0;'><p style='font-size: 11px; color: #888;'>Orbe Systems Central Omnichannel.</p></div>"
                    em_res = await client.post(
                        "https://api.resend.com/emails",
                        headers={"Authorization": f"Bearer {resend_key}"},
                        json={
                            "from": "INHO <suporte@orbesystems.com.br>",
                            "to": [payload.email],
                            "subject": payload.subject,
                            "html": html_msg
                        },
                        timeout=10.0
                    )
                    email_status = em_res.status_code
                except Exception as e:
                    email_status = f"Resend Error: {str(e)}"
            else:
                email_status = "Ignorado"

        # Multi-Tenant DB Persistence (Secured Session Binding)
        from models.models import OmnichannelLog, OmnichannelStatus
        
        db_log = OmnichannelLog(
            business_id=b_id,
            sender_id=sender_id,
            channel="WHATSAPP",
            recipient=phones_to_try[0] if phones_to_try else payload.phone,
            message_content=final_message,
            status=OmnichannelStatus.SENT if global_db_status == "SENT" else OmnichannelStatus.FAILED
        )
        db.add(db_log)
        await db.commit()
                
        return {
            "status": "success",
            "sender": sender_name,
            "formatted_message": final_message,
            "whatsapp_delivery_code": wa_status,
            "email_delivery_code": email_status,
            "message_id": str(db_log.id)
        }
    except HTTPException:
        raise
    except Exception:
        import logging
        logging.getLogger("inho.crm").exception("Erro no envio omnichannel")
        raise HTTPException(status_code=500, detail="Erro interno ao enviar a mensagem. Tente novamente.")

@router.get("/whatsapp/history")
async def get_whatsapp_history(
    recipient: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna o histórico seguro associado apenas à empresa atual."""
    from models.models import OmnichannelLog
    business = await _biz(db, current_user)
    b_id = get_uuid(business.id)
    
    query = select(OmnichannelLog).where(OmnichannelLog.business_id == b_id)
    if recipient:
        query = query.where(OmnichannelLog.recipient.ilike(f"%{recipient}%"))
        
    query = query.order_by(OmnichannelLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": str(log.id),
            "channel": log.channel,
            "recipient": log.recipient,
            "message": log.message_content,
            "status": log.status,
            "created_at": log.created_at
        } for log in logs
    ]

@router.get("/whatsapp/queue")
async def get_whatsapp_reminder_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fila de lembretes/cobranças automáticas pendentes (régua D-3, D0, D+3) da empresa."""
    from datetime import timedelta
    business = await _biz(db, current_user)
    b_id = get_uuid(business.id)
    result = await db.execute(
        select(BillingInvoice).where(
            BillingInvoice.business_id == b_id,
            BillingInvoice.status.in_([BillingStatus.PENDING, BillingStatus.OVERDUE]),
        ).order_by(BillingInvoice.due_date.asc()).limit(200)
    )
    queue = []
    for inv in result.scalars().all():
        due = inv.due_date
        steps = [
            ("D-3", due - timedelta(days=3), inv.reminder_before_sent_at),
            ("D0", due, inv.reminder_due_sent_at),
            ("D+3", due + timedelta(days=3), inv.reminder_after_sent_at),
        ]
        for label, when, sent_at in steps:
            queue.append({
                "invoice_id": str(inv.id),
                "customer_name": inv.customer_name,
                "customer_phone": inv.customer_phone,
                "amount": float(inv.amount),
                "due_date": inv.due_date,
                "step": label,
                "scheduled_for": when,
                "sent_at": sent_at,
                "state": "SENT" if sent_at else ("NO_PHONE" if not inv.customer_phone else "QUEUED"),
            })
    queue.sort(key=lambda x: x["scheduled_for"])
    return queue

from fastapi.responses import HTMLResponse
import httpx

@router.get("/whatsapp-qr", response_class=HTMLResponse)
async def proxy_whatsapp_qr(current_user: User = Depends(get_current_user)):
    """Proxy the internal Baileys QR interface to the public INHO API."""
    try:
        urls = ["http://whatsapp:3001/qr", "http://orbe_whatsapp:3001/qr", "http://localhost:3001/qr"]
        async with httpx.AsyncClient(timeout=5.0) as client:
            for url in urls:
                try:
                    res = await client.get(url)
                    if res.status_code == 200:
                        return HTMLResponse(res.text)
                except httpx.RequestError:
                    continue
        return HTMLResponse("<h2>Erro: Container Docker do Bot WhatsApp indisponível no ambiente interno.</h2>", status_code=502)
    except Exception as e:
        return HTMLResponse(f"<h2>Erro interno no proxy: {str(e)}</h2>", status_code=500)
