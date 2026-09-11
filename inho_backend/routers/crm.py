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


# ── CONTACTS ──────────────────────────────────────────────────────

@router.post("/contacts/", response_model=CRMContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact: CRMContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        business = await _biz(db, current_user)
        db_contact = CRMContact(**contact.model_dump(), business_id=business.id)
        db.add(db_contact)
        await db.commit()
        await db.refresh(db_contact)
        return db_contact
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        raise HTTPException(status_code=400, detail=f"Dev Override Caught 500: {str(e)}\n\n {traceback_str}")


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
    query = select(CRMContact).where(CRMContact.business_id == business.id)

    if category:
        query = query.where(CRMContact.category == ContactCategory(category))
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
                BillingInvoice.business_id == business.id,
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
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMContact).where(
            CRMContact.id == contact_id,
            CRMContact.business_id == business.id
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contato não encontrado")
    return contact


@router.put("/contacts/{contact_id}", response_model=CRMContactOut)
async def update_contact(
    contact_id: UUID,
    payload: CRMContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMContact).where(
            CRMContact.id == contact_id,
            CRMContact.business_id == business.id
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
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(CRMContact).where(
            CRMContact.id == contact_id,
            CRMContact.business_id == business.id
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contato não encontrado")
    await db.delete(contact)
    await db.commit()


@router.get("/contacts/{contact_id}/timeline")
async def get_contact_timeline(
    contact_id: UUID,
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
            BillingInvoice.business_id == business.id,
            BillingInvoice.crm_contact_id == contact_id,
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
            BillingInvoice.business_id == business.id,
            BillingInvoice.crm_contact_id == contact_id,
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
            contact = CRMContact(
                business_id=business.id,
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
    db_payable = AccountPayable(**payable.model_dump(), business_id=business.id)
    db.add(db_payable)
    await db.commit()
    await db.refresh(db_payable)
    return db_payable


@router.get("/payable/", response_model=List[AccountPayableOut])
async def list_payables(
    status_filter: Optional[PayableStatus] = Query(None),
    supplier_id: Optional[UUID]            = Query(None),
    overdue_only: bool                     = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    query = select(AccountPayable).where(AccountPayable.business_id == business.id)

    if status_filter:
        query = query.where(AccountPayable.status == status_filter)
    if supplier_id:
        query = query.where(AccountPayable.supplier_id == supplier_id)
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
    payable_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.id == payable_id,
            AccountPayable.business_id == business.id
        )
    )
    payable = result.scalar_one_or_none()
    if not payable:
        raise HTTPException(404, "Conta a pagar não encontrada")
    return payable


@router.put("/payable/{payable_id}", response_model=AccountPayableOut)
async def update_payable(
    payable_id: UUID,
    payload: AccountPayableUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.id == payable_id,
            AccountPayable.business_id == business.id
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
    payable_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _biz(db, current_user)
    result = await db.execute(
        select(AccountPayable).where(
            AccountPayable.id == payable_id,
            AccountPayable.business_id == business.id
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
        select(AccountPayable).where(AccountPayable.business_id == business.id)
    )
    payables = rows.scalars().all()

    pending = sum(float(p.amount) for p in payables if p.status == PayableStatus.PENDING and p.due_date >= now)
    overdue = sum(float(p.amount) for p in payables if p.status == PayableStatus.PENDING and p.due_date < now)
    paid = sum(float(p.amount) for p in payables if p.status == PayableStatus.PAID)

    return {"pending": pending, "overdue": overdue, "paid": paid, "total": pending + overdue}
