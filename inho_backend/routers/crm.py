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
    PayableStatus, User, Business, AuditLog, AuditAction
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

    if float(data.get("amount") or 0) > 5000.0:
        data["status"] = PayableStatus.PENDING_APPROVAL
        
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
@router.patch("/payable/{payable_id}", response_model=AccountPayableOut)
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

    dump = payload.model_dump(exclude_unset=True)
    new_status = dump.get("status")

    # ── Trava de Alçada Dual-Control (> R$ 5.000,00) ──────────────────
    if new_status in (PayableStatus.PAID, "PAID"):
        is_approved = (
            payable.status in ("APPROVED", PayableStatus.APPROVED)
            or "APPROVED" in str(payable.payment_account or "")
            or "APPROVED" in str(dump.get("payment_account") or "")
        )
        if float(payable.amount or 0) > 5000.0 and not is_approved:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="DUAL_CONTROL_REQUIRED: Despesas acima de R$ 5.000,00 exigem aprovação de alçada antes da baixa."
            )

    for field, value in dump.items():
        setattr(payable, field, value)

    if payable.status == PayableStatus.PAID and not payable.paid_date:
        payable.paid_date = datetime.now(timezone.utc)
        try:
            audit = AuditLog(
                business_id=get_uuid(business.id),
                user_id=get_uuid(current_user.id) if current_user.id else None,
                user_name=getattr(current_user, "full_name", current_user.email),
                user_role=str(getattr(current_user, "role", "operator")),
                action=AuditAction.UPDATE,
                entity="accounts_payable",
                entity_id=get_uuid(payable.id),
                detail=f"Liquidação de despesa R$ {float(payable.amount):.2f} - {payable.description}"
            )
            db.add(audit)
        except Exception:
            pass

    await db.commit()
    await db.refresh(payable)
    return payable


@router.post("/payable/{payable_id}/approve", response_model=AccountPayableOut)
async def approve_payable(
    payable_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aprovação de alçada prévia para Contas a Pagar >= R$ 5.000,00."""
    user_role = (getattr(current_user, "role", "") or "").lower()
    if user_role not in ("admin", "super_admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores (admin / super_admin) podem aprovar despesas em alçada."
        )
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

    payable.status = PayableStatus.APPROVED
    payable.payment_account = f"APPROVED_BY:{current_user.email}"
    try:
        audit = AuditLog(
            business_id=get_uuid(business.id),
            user_id=get_uuid(current_user.id) if current_user.id else None,
            user_name=getattr(current_user, "full_name", current_user.email),
            user_role=user_role,
            action=AuditAction.UPDATE,
            entity="accounts_payable",
            entity_id=get_uuid(payable.id),
            detail=f"APPROVE_PAYABLE_DUAL_CONTROL: Aprovação de Alçada para despesa R$ {float(payable.amount):.2f} por {current_user.email}"
        )
        db.add(audit)
    except Exception:
        pass

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
    """Total a pagar por status via SQL indexado (spec §3.6 — painel de totalização)."""
    from sqlalchemy import case
    business = await _biz(db, current_user)
    b_id = get_uuid(business.id)
    now = datetime.now(timezone.utc)

    stmt = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        (AccountPayable.status == PayableStatus.PENDING) & (AccountPayable.due_date >= now),
                        AccountPayable.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("pending"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (AccountPayable.status == PayableStatus.PENDING) & (AccountPayable.due_date < now),
                        AccountPayable.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("overdue"),
        func.coalesce(
            func.sum(
                case(
                    (AccountPayable.status == PayableStatus.PAID, AccountPayable.amount),
                    else_=0,
                )
            ),
            0,
        ).label("paid"),
    ).where(AccountPayable.business_id == b_id)

    row = (await db.execute(stmt)).one()
    pending = float(row.pending or 0.0)
    overdue = float(row.overdue or 0.0)
    paid = float(row.paid or 0.0)

    return {"pending": pending, "overdue": overdue, "paid": paid, "total": pending + overdue}


# ── IDEMPOTENT BATCH SETTLEMENT & EXTERNAL LOOKUP CACHE ───────────
import os
import time
import re
from collections import OrderedDict
from fastapi import Header
from pydantic import BaseModel

_IDEMPOTENCY_CACHE: "OrderedDict[str, tuple]" = OrderedDict()  # key -> (timestamp, response_dict)
_LOOKUP_CACHE: "OrderedDict[str, tuple]" = OrderedDict()       # key -> (timestamp, data_dict)
_IDEMPOTENCY_TTL_SEC = 900     # 15 minutes
_LOOKUP_TTL_SEC = 86400        # 24 hours
_MAX_IDEMPOTENCY_KEYS = 2000
_MAX_LOOKUP_KEYS = 1000

def _cache_get(store: OrderedDict, key: str, ttl: int):
    item = store.get(key)
    if not item:
        return None
    if (time.time() - item[0]) >= ttl:
        store.pop(key, None)
        return None
    store.move_to_end(key)
    return item[1]

def _cache_set(store: OrderedDict, key: str, val: dict, max_keys: int):
    if key in store:
        store.move_to_end(key)
    elif len(store) >= max_keys:
        store.popitem(last=False)
    store[key] = (time.time(), val)

class BatchSettlePayload(BaseModel):
    payable_ids: List[str]
    idempotency_key: Optional[str] = None

@router.post("/payable/batch-settle")
async def batch_settle_payables(
    payload: BatchSettlePayload,
    idempotency_header: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Liquidação em lote com suporte a Idempotency-Key (header ou payload) +
    SELECT ... FOR UPDATE (bloqueio pessimista em PostgreSQL) para prevenir
    condições de corrida entre múltiplos workers ou sessões concorrentes.
    """
    business = await _biz(db, current_user)
    b_id = get_uuid(business.id)
    idem_key = (payload.idempotency_key or idempotency_header or "").strip()

    if idem_key:
        scoped_key = f"{b_id}:{idem_key}"
        cached = _cache_get(_IDEMPOTENCY_CACHE, scoped_key, _IDEMPOTENCY_TTL_SEC)
        if cached:
            replay = dict(cached)
            replay["cached_replay"] = True
            return replay

    settled_ids = []
    skipped_ids = []
    now_dt = datetime.now(timezone.utc)
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")

    try:
        if not is_sqlite:
            from sqlalchemy import text
            await db.execute(text("SET LOCAL lock_timeout = '5s'"))

        for raw_id in sorted(set(payload.payable_ids)):
            stmt = select(AccountPayable).where(
                AccountPayable.id == get_uuid(raw_id),
                AccountPayable.business_id == b_id,
            )
            if not is_sqlite:
                stmt = stmt.with_for_update()
            res = await db.execute(stmt)
            p = res.scalar_one_or_none()
            if not p:
                continue
            if p.status == PayableStatus.PAID:
                skipped_ids.append(str(p.id))
                continue
            is_approved = (
                p.status in ("APPROVED", PayableStatus.APPROVED)
                or "APPROVED" in str(p.payment_account or "")
            )
            if float(p.amount or 0) > 5000.0 and not is_approved:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="DUAL_CONTROL_REQUIRED: Despesas acima de R$ 5.000,00 exigem aprovação de alçada antes da baixa."
                )
            p.status = PayableStatus.PAID
            if not p.paid_date:
                p.paid_date = now_dt
            settled_ids.append(str(p.id))

        await db.commit()
    except Exception as exc:
        await db.rollback()
        err_msg = str(exc).lower()
        if "55p03" in err_msg or "lock timeout" in err_msg or "locknotavailable" in err_msg:
            raise HTTPException(
                status_code=409,
                detail="Um ou mais títulos estão sendo processados por outro operador no momento. Tente novamente em instantes.",
            )
        raise

    response_data = {
        "settled_count": len(settled_ids),
        "settled_ids": settled_ids,
        "skipped_already_paid": len(skipped_ids),
        "idempotency_key": idem_key or None,
        "cached_replay": False,
    }
    if idem_key:
        _cache_set(_IDEMPOTENCY_CACHE, f"{b_id}:{idem_key}", response_data, _MAX_IDEMPOTENCY_KEYS)
    return response_data


@router.get("/lookup/cnpj/{cnpj}")
async def lookup_cnpj_cached(
    cnpj: str,
    current_user: User = Depends(get_current_user),
):
    """
    Consulta CNPJ com Cache LRU+TTL em Memória (24h, max 1000 chaves) + Fallback Automático
    (Primário: BrasilAPI -> Secundário: ReceitaWS / CNPJ.ws).
    """
    digits = re.sub(r"\D", "", cnpj)
    if len(digits) != 14:
        raise HTTPException(status_code=400, detail="CNPJ deve conter 14 dígitos.")

    cache_key = f"cnpj:{digits}"
    cached = _cache_get(_LOOKUP_CACHE, cache_key, _LOOKUP_TTL_SEC)
    if cached:
        return {**cached, "cached": True}

    import httpx
    async with httpx.AsyncClient(timeout=8.0) as client:
        # 1. Primary: BrasilAPI
        try:
            r = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{digits}")
            if r.status_code == 200:
                d = r.json()
                normalized = {
                    "cnpj": digits,
                    "razao_social": d.get("razao_social") or d.get("nome_fantasia") or "",
                    "nome_fantasia": d.get("nome_fantasia") or "",
                    "email": d.get("email") or "",
                    "ddd_telefone_1": d.get("ddd_telefone_1") or "",
                    "cep": d.get("cep") or "",
                    "logradouro": d.get("logradouro") or "",
                    "numero": d.get("numero") or "",
                    "bairro": d.get("bairro") or "",
                    "municipio": d.get("municipio") or "",
                    "uf": d.get("uf") or "",
                    "provider": "BrasilAPI",
                }
                _cache_set(_LOOKUP_CACHE, cache_key, normalized, _MAX_LOOKUP_KEYS)
                return {**normalized, "cached": False}
        except Exception:
            pass

        # 2. Fallback: publica.cnpj.ws
        try:
            r2 = await client.get(f"https://publica.cnpj.ws/cnpj/{digits}")
            if r2.status_code == 200:
                d2 = r2.json()
                est = d2.get("estabelecimento") or {}
                normalized = {
                    "cnpj": digits,
                    "razao_social": d2.get("razao_social") or est.get("nome_fantasia") or "",
                    "nome_fantasia": est.get("nome_fantasia") or "",
                    "email": est.get("email") or "",
                    "ddd_telefone_1": f"{est.get('ddd1', '')}{est.get('telefone1', '')}".strip(),
                    "cep": est.get("cep") or "",
                    "logradouro": est.get("logradouro") or "",
                    "numero": est.get("numero") or "",
                    "bairro": est.get("bairro") or "",
                    "municipio": (est.get("cidade") or {}).get("nome") or "",
                    "uf": (est.get("estado") or {}).get("sigla") or "",
                    "provider": "CNPJ.ws (Fallback)",
                }
                _cache_set(_LOOKUP_CACHE, cache_key, normalized, _MAX_LOOKUP_KEYS)
                return {**normalized, "cached": False}
        except Exception:
            pass

    raise HTTPException(status_code=502, detail="Serviços externos de consulta CNPJ temporariamente indisponíveis.")


@router.get("/lookup/cep/{cep}")
async def lookup_cep_cached(
    cep: str,
    current_user: User = Depends(get_current_user),
):
    """
    Consulta CEP com Cache LRU+TTL em Memória (24h, max 1000 chaves) + Fallback Automático
    (Primário: BrasilAPI v2 -> Secundário: ViaCEP).
    """
    digits = re.sub(r"\D", "", cep)
    if len(digits) != 8:
        raise HTTPException(status_code=400, detail="CEP deve conter 8 dígitos.")

    cache_key = f"cep:{digits}"
    cached = _cache_get(_LOOKUP_CACHE, cache_key, _LOOKUP_TTL_SEC)
    if cached:
        return {**cached, "cached": True}

    import httpx
    async with httpx.AsyncClient(timeout=6.0) as client:
        # 1. Primary: BrasilAPI
        try:
            r = await client.get(f"https://brasilapi.com.br/api/cep/v2/{digits}")
            if r.status_code == 200:
                d = r.json()
                normalized = {
                    "cep": digits,
                    "street": d.get("street") or "",
                    "neighborhood": d.get("neighborhood") or "",
                    "city": d.get("city") or "",
                    "state": d.get("state") or "",
                    "provider": "BrasilAPI",
                }
                _cache_set(_LOOKUP_CACHE, cache_key, normalized, _MAX_LOOKUP_KEYS)
                return {**normalized, "cached": False}
        except Exception:
            pass

        # 2. Fallback: ViaCEP
        try:
            r2 = await client.get(f"https://viacep.com.br/ws/{digits}/json/")
            if r2.status_code == 200:
                d2 = r2.json()
                if not d2.get("erro"):
                    normalized = {
                        "cep": digits,
                        "street": d2.get("logradouro") or "",
                        "neighborhood": d2.get("bairro") or "",
                        "city": d2.get("localidade") or "",
                        "state": d2.get("uf") or "",
                        "provider": "ViaCEP (Fallback)",
                    }
                    _cache_set(_LOOKUP_CACHE, cache_key, normalized, _MAX_LOOKUP_KEYS)
                    return {**normalized, "cached": False}
        except Exception:
            pass

    raise HTTPException(status_code=502, detail="Serviços externos de consulta CEP temporariamente indisponíveis.")


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
    """Atualiza o drag-and-drop do Card (Workflow). Se 'WON', engatilha faturamento automático em Contas a Receber."""
    import uuid
    import urllib.parse
    from datetime import timedelta
    from models.models import PaymentMethod, InvoiceType
    from routers.billing import _generate_authenticated_pix_code

    business = await _biz(db, current_user)
    b_id = get_uuid(business.id)
    result = await db.execute(
        select(CRMDeal).where(CRMDeal.id == get_uuid(deal_id), CRMDeal.business_id == b_id)
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal não encontrado no Funil")
    
    update_data = payload.model_dump(exclude_unset=True)
    old_stage = deal.stage
    new_stage = update_data.get("stage", None)

    for k, v in update_data.items():
        setattr(deal, k, v)
        
    # Automação Esteira Comercial -> Financeiro: Se arrastou pra Fechado (WON), gera Conta a Receber/Fatura
    if new_stage == DealStage.WON and old_stage != DealStage.WON:
        deal.status = DealStatus.CLOSED
        tag = f"[DEAL #{str(deal.id)[:8].upper()}]"
        existing_inv = (
            await db.execute(
                select(BillingInvoice.id).where(
                    BillingInvoice.business_id == b_id,
                    BillingInvoice.description.ilike(f"%{tag}%"),
                )
            )
        ).scalars().first()
        if not existing_inv and deal.value and float(deal.value) > 0:
            inv_id = uuid.uuid4()
            due_dt = datetime.now(timezone.utc) + timedelta(days=7)
            pix_code, _ = await _generate_authenticated_pix_code(
                db, b_id, inv_id, deal.value, deal.title
            )
            pix_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(pix_code)}"
            db.add(
                BillingInvoice(
                    id=inv_id,
                    business_id=b_id,
                    crm_contact_id=deal.contact_id,
                    invoice_type=InvoiceType.OUTROS,
                    customer_name=deal.title,
                    amount=deal.value,
                    due_date=due_dt,
                    data_competencia=datetime.now(timezone.utc),
                    status=BillingStatus.PENDING,
                    pix_code=pix_code,
                    pix_qr_url=pix_qr_url,
                    payment_method=PaymentMethod.PIX,
                    description=f"[FUNIL KANBAN WON] {deal.title} {tag}",
                    created_by_id=current_user.id,
                    created_by_name=f"{current_user.full_name} ({current_user.role_label})",
                    updated_by_id=current_user.id,
                    updated_by_name=f"{current_user.full_name} ({current_user.role_label})",
                )
            )
        
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
        biz_name = getattr(business, "name", "Orbe Systems").strip()
        raw_msg = payload.message.strip()

        # Formatação Executiva Humanizada (Padrão Ouro — Sem termos técnicos confusos)
        if sender_name.lower() == biz_name.lower():
            header = f"*{biz_name}*"
        else:
            header = f"*{sender_name} | {biz_name}*"

        if not raw_msg.startswith("*"):
            final_message = f"{header}\n\n" + raw_msg
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
                    html_msg = f"<div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'><h2 style='color: #00fff5; background: #020406; padding: 15px; border-radius: 8px;'>Orbe Systems - Central B2B</h2><p>Ola,</p><p><strong>{sender_name} ({biz_name})</strong><br/><br/>{raw_msg}</p><hr style='border: top: 1px solid #eee; margin: 20px 0;'><p style='font-size: 11px; color: #888;'>Orbe Systems Central Omnichannel.</p></div>"
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
