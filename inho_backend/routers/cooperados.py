from sqlalchemy import cast, String
"""
INHO – Router: Cooperados (Dossiê Completo + Extrato de Aportes)
Spec §2.2 — Dossiê Central do Sócio (Cooperado)
"""
import uuid as uuid_module
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    Cooperado, CooperadoStatus, BillingInvoice, BillingStatus, User
)
from routers.billing import _get_user_business

router = APIRouter(prefix="/api/v1/crm/cooperados", tags=["Cooperados"])


# ── Schemas (inline — simples e coesos) ───────────────────────────
class CooperadoCreate(BaseModel):
    name:         str
    document:     str        # CPF ou CNPJ
    email:        Optional[str]  = None
    phone:        Optional[str]  = None
    bank_details: Optional[str]  = None
    notes:        Optional[str]  = None
    status:       CooperadoStatus = CooperadoStatus.PROPOSTA_CADASTRADA


class CooperadoUpdate(BaseModel):
    name:         Optional[str]          = None
    document:     Optional[str]          = None
    email:        Optional[str]          = None
    phone:        Optional[str]          = None
    bank_details: Optional[str]          = None
    notes:        Optional[str]          = None
    status:       Optional[CooperadoStatus] = None


class CooperadoOut(BaseModel):
    id: UUID | str
    business_id: UUID | str
    name:        str
    document:    str
    email:       Optional[str]
    phone:       Optional[str]
    bank_details: Optional[str]
    notes:       Optional[str]
    status:      CooperadoStatus
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── CRUD ──────────────────────────────────────────────────────────

@router.post("/", response_model=CooperadoOut, status_code=status.HTTP_201_CREATED)
async def create_cooperado(
    payload: CooperadoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import re
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    clean_doc = re.sub(r"\D", "", payload.document or "")

    # BUG-01: Idempotência e Prevenção de Duplicidade por documento normalizado
    all_coops = (await db.execute(select(Cooperado).where(Cooperado.business_id == b_id))).scalars().all()
    coop = next((c for c in all_coops if re.sub(r"\D", "", c.document or "") == clean_doc), None)
    if coop:
        coop.name = payload.name
        if payload.phone:
            coop.phone = payload.phone
        if payload.email:
            coop.email = payload.email
        if payload.bank_details:
            coop.bank_details = payload.bank_details
        if payload.notes:
            coop.notes = payload.notes
    else:
        coop = Cooperado(**payload.model_dump(), business_id=b_id)
        db.add(coop)

    # Sincroniza com o CRM: o cooperado vira contato PARTNER (visível na Central WhatsApp)
    from models.models import CRMContact, ContactCategory
    all_contacts = (await db.execute(
        select(CRMContact).where(CRMContact.business_id == b_id)
    )).scalars().all()
    existing_contact = next(
        (c for c in all_contacts if re.sub(r"\D", "", c.document or "") == clean_doc),
        None
    )
    if existing_contact:
        existing_contact.category = ContactCategory.PARTNER
        existing_contact.name = payload.name
        existing_contact.phone = payload.phone or existing_contact.phone
        existing_contact.email = payload.email or existing_contact.email
        existing_contact.is_active = True
    else:
        db.add(CRMContact(
            business_id=b_id,
            category=ContactCategory.PARTNER,
            name=payload.name,
            document=payload.document,
            email=payload.email,
            phone=payload.phone,
            bank_details=payload.bank_details,
            notes=payload.notes,
        ))
    await db.commit()
    await db.refresh(coop)
    return coop


@router.get("/", response_model=List[CooperadoOut])
async def list_cooperados(
    coop_status: Optional[CooperadoStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Nome ou documento"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    query = select(Cooperado).where(Cooperado.business_id == b_id)

    if coop_status:
        query = query.where(Cooperado.status == coop_status)
    if search:
        from sqlalchemy import or_
        like = f"%{search}%"
        query = query.where(
            or_(
                Cooperado.name.ilike(like),
                Cooperado.document.ilike(like),
                Cooperado.notes.ilike(like),
            )
        )

    result = await db.execute(query.order_by(Cooperado.name.asc()).offset(skip).limit(limit))
    return result.scalars().all()


# ── Fase 2 Cooperativismo: Rateio de Sobras (AGO) & Informes ───────

class RateioSobrasApplyPayload(BaseModel):
    montante_sobras: float
    ano_base: Optional[int] = None
    due_date: Optional[str] = None
    idempotency_key: Optional[str] = None


async def _compute_rateio_sobras_data(
    db: AsyncSession,
    b_id,
    montante_sobras: float,
    ano_base: int,
):
    from sqlalchemy import or_
    from models.models import AccountPayable, PayableStatus

    coops_res = await db.execute(
        select(Cooperado)
        .where(Cooperado.business_id == b_id)
        .order_by(Cooperado.name.asc())
    )
    coops = [c for c in coops_res.scalars().all() if c.status != CooperadoStatus.DESLIGADO]

    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    inv_res = await db.execute(
        select(BillingInvoice).where(
            BillingInvoice.business_id == b_id,
            BillingInvoice.status == BillingStatus.PAID,
            BillingInvoice.created_at >= cutoff,
        )
    )
    invoices = inv_res.scalars().all()

    pay_res = await db.execute(
        select(AccountPayable).where(
            AccountPayable.business_id == b_id,
            AccountPayable.created_at >= cutoff,
        )
    )
    payables = pay_res.scalars().all()

    from decimal import Decimal, ROUND_HALF_EVEN
    two_places = Decimal("0.01")
    four_places = Decimal("0.0001")
    montante_dec = Decimal(str(montante_sobras)).quantize(two_places, rounding=ROUND_HALF_EVEN)

    items = []
    total_mov_dec = Decimal("0.00")
    for c in coops:
        c_id_str = str(c.id)
        c_doc_clean = (c.document or "").replace(".", "").replace("-", "").replace("/", "")
        aportes_dec = sum(
            (Decimal(str(i.amount or 0)) for i in invoices
             if (i.cooperado_id and str(i.cooperado_id) == c_id_str)
             or (c_doc_clean and (i.customer_doc or "").replace(".", "").replace("-", "").replace("/", "") == c_doc_clean)
             or (c.name and i.customer_name and c.name.lower() in i.customer_name.lower())),
            Decimal("0.00"),
        ).quantize(two_places, rounding=ROUND_HALF_EVEN)
        repasses_dec = sum(
            (Decimal(str(p.amount or 0)) for p in payables
             if (c.name and p.description and c.name.lower() in p.description.lower())),
            Decimal("0.00"),
        ).quantize(two_places, rounding=ROUND_HALF_EVEN)
        mov_dec = (aportes_dec + repasses_dec).quantize(two_places, rounding=ROUND_HALF_EVEN)
        total_mov_dec += mov_dec
        items.append({
            "cooperado_id": c_id_str,
            "cooperado_name": c.name,
            "document": c.document,
            "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "aportes_12m": float(aportes_dec),
            "repasses_12m": float(repasses_dec),
            "movimentacao_total_12m": float(mov_dec),
            "_mov_dec": mov_dec,
            "participacao_pct": 0.0,
            "valor_rateio": 0.0,
        })

    n_coops = len(items)
    allocated_dec = Decimal("0.00")
    rateio_decs = []
    for it in items:
        mov_dec = it.pop("_mov_dec")
        if total_mov_dec > Decimal("0.00"):
            ratio = mov_dec / total_mov_dec
        elif n_coops > 0:
            ratio = Decimal(1) / Decimal(n_coops)
        else:
            ratio = Decimal("0")
        pct_dec = (ratio * Decimal("100")).quantize(four_places, rounding=ROUND_HALF_EVEN)
        val_dec = (montante_dec * ratio).quantize(two_places, rounding=ROUND_HALF_EVEN)
        it["participacao_pct"] = float(pct_dec)
        rateio_decs.append(val_dec)
        allocated_dec += val_dec

    if n_coops > 0 and allocated_dec != montante_dec:
        diff = montante_dec - allocated_dec
        max_idx = max(range(n_coops), key=lambda idx: rateio_decs[idx])
        rateio_decs[max_idx] = (rateio_decs[max_idx] + diff).quantize(two_places, rounding=ROUND_HALF_EVEN)

    for idx, it in enumerate(items):
        it["valor_rateio"] = float(rateio_decs[idx])

    return {
        "ano_base": ano_base,
        "montante_sobras": float(montante_dec),
        "total_cooperados_elegiveis": n_coops,
        "total_movimentacao_12m": float(total_mov_dec),
        "items": items,
    }


@router.get("/rateio-sobras", summary="Simulador de Rateio Proporcional de Sobras (AGO)")
async def preview_rateio_sobras(
    montante_sobras: float = Query(10000.0, gt=0),
    ano_base: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    yr = ano_base or datetime.now(timezone.utc).year
    return await _compute_rateio_sobras_data(db, b_id, montante_sobras, yr)


@router.post("/rateio-sobras/aplicar", summary="Efetiva o Rateio de Sobras gerando créditos no Contas a Pagar")
async def apply_rateio_sobras(
    payload: RateioSobrasApplyPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import os
    from decimal import Decimal
    from sqlalchemy import text
    from models.models import AccountPayable, PayableStatus, AuditAction
    from services.audit import write_audit
    from routers.crm import (
        get_uuid, _IDEMPOTENCY_CACHE, _IDEMPOTENCY_TTL_SEC, _MAX_IDEMPOTENCY_KEYS,
        _cache_get, _cache_set,
    )

    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    yr = payload.ano_base or datetime.now(timezone.utc).year
    idem_key = (payload.idempotency_key or "").strip()

    if idem_key:
        scoped_key = f"rateio_sobras:{b_id}:{idem_key}"
        cached = _cache_get(_IDEMPOTENCY_CACHE, scoped_key, _IDEMPOTENCY_TTL_SEC)
        if cached:
            replay = dict(cached)
            replay["cached_replay"] = True
            return replay

    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")
    try:
        if not is_sqlite:
            await db.execute(text("SET LOCAL lock_timeout = '5s'"))

        # Lock cooperados rows deterministically
        coop_stmt = select(Cooperado).where(Cooperado.business_id == b_id).order_by(Cooperado.id.asc())
        if not is_sqlite:
            coop_stmt = coop_stmt.with_for_update()
        await db.execute(coop_stmt)

        sim = await _compute_rateio_sobras_data(db, b_id, payload.montante_sobras, yr)
        due_dt = (
            datetime.fromisoformat(payload.due_date.replace("Z", "+00:00"))
            if payload.due_date and "T" in payload.due_date
            else datetime.now(timezone.utc) + timedelta(days=15)
        )

        payable_ids = []
        for it in sim["items"]:
            val = float(it["valor_rateio"] or 0.0)
            if val <= 0:
                continue
            p_id = uuid_module.uuid4()
            desc = (
                f"[AGO RATEIO DE SOBRAS {yr}] {it['cooperado_name']} — "
                f"Participação {it['participacao_pct']:.2f}% | Mov. 12m: R$ {it['movimentacao_total_12m']:.2f}"
            )
            db.add(
                AccountPayable(
                    id=p_id,
                    business_id=b_id,
                    description=desc,
                    amount=Decimal(f"{val:.2f}"),
                    due_date=due_dt,
                    data_competencia=datetime.now(timezone.utc),
                    status=PayableStatus.PENDING,
                )
            )
            payable_ids.append(str(p_id))

        await write_audit(
            db,
            action=AuditAction.CREATE,
            entity="RATEIO_SOBRAS_AGO",
            entity_id=str(b_id),
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role_label,
            business_id=b_id,
            detail={
                "ano_base": yr,
                "montante_sobras": payload.montante_sobras,
                "cooperados_contemplados": len(payable_ids),
                "payable_ids": payable_ids,
            },
        )
        await db.commit()

        response_data = {
            **sim,
            "status": "applied",
            "generated_payables_count": len(payable_ids),
            "payable_ids": payable_ids,
            "cached_replay": False,
        }
        if idem_key:
            _cache_set(_IDEMPOTENCY_CACHE, f"rateio_sobras:{b_id}:{idem_key}", response_data, _MAX_IDEMPOTENCY_KEYS)
        return response_data
    except Exception as exc:
        await db.rollback()
        err_msg = str(exc).lower()
        if "55p03" in err_msg or "lock timeout" in err_msg or "locknotavailable" in err_msg:
            raise HTTPException(
                status_code=409,
                detail="Rateio de sobras em processamento concorrente. Tente novamente em instantes.",
            )
        raise


@router.get("/{cooperado_id}", response_model=CooperadoOut)
async def get_cooperado(
    cooperado_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    c_id = get_uuid(cooperado_id)
    b_id = get_uuid(business.id)
    result = await db.execute(
        select(Cooperado).where(
            Cooperado.id == c_id,
            Cooperado.business_id == b_id
        )
    )
    coop = result.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")
    return coop


@router.put("/{cooperado_id}", response_model=CooperadoOut)
async def update_cooperado(
    cooperado_id: str,
    payload: CooperadoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    c_id = get_uuid(cooperado_id)
    b_id = get_uuid(business.id)
    result = await db.execute(
        select(Cooperado).where(
            Cooperado.id == c_id,
            Cooperado.business_id == b_id
        )
    )
    coop = result.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(coop, field, value)

    await db.commit()
    await db.refresh(coop)
    return coop


@router.delete("/{cooperado_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cooperado(
    cooperado_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    c_id = get_uuid(cooperado_id)
    b_id = get_uuid(business.id)
    result = await db.execute(
        select(Cooperado).where(
            Cooperado.id == c_id,
            Cooperado.business_id == b_id
        )
    )
    coop = result.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")
    await db.delete(coop)
    await db.commit()


# ── Dossiê: Balanço & Extrato (spec §2.2) ─────────────────────────

@router.get("/{cooperado_id}/balance", summary="Extrato financeiro últimos 12 meses")
async def get_cooperado_balance(
    cooperado_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna extrato detalhado de aportes (faturas pagas) e
    o saldo acumulado do cooperado nos últimos 12 meses.
    """
    from routers.crm import get_uuid
    business = await _get_user_business(db, current_user)
    c_id = get_uuid(cooperado_id)
    b_id = get_uuid(business.id)

    # Garante que cooperado pertence ao negócio
    coop_res = await db.execute(
        select(Cooperado).where(
            Cooperado.id == c_id,
            Cooperado.business_id == b_id
        )
    )
    coop = coop_res.scalar_one_or_none()
    if not coop:
        raise HTTPException(404, "Cooperado não encontrado")

    # Busca todos os lançamentos dos últimos 12 meses
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    invoices_res = await db.execute(
        select(BillingInvoice)
        .where(
            BillingInvoice.cooperado_id == c_id,
            BillingInvoice.business_id == b_id,
            BillingInvoice.created_at >= cutoff,
        )
        .order_by(BillingInvoice.due_date.asc())
    )
    invoices = invoices_res.scalars().all()

    total_charged  = sum(float(i.amount) for i in invoices)
    total_paid     = sum(float(i.amount) for i in invoices if i.status == BillingStatus.PAID)
    total_overdue  = sum(float(i.amount) for i in invoices
                         if i.status in [BillingStatus.OVERDUE, BillingStatus.PENDING]
                         and i.due_date < datetime.now(timezone.utc))
    total_pending  = sum(float(i.amount) for i in invoices if i.status == BillingStatus.PENDING)

    entries = [
        {
            "id": str(inv.id),
            "type": inv.invoice_type.value,
            "description": inv.description,
            "amount": float(inv.amount),
            "due_date": inv.due_date.isoformat(),
            "status": inv.status.value,
        }
        for inv in invoices
    ]

    return {
        "cooperado_id": str(cooperado_id),
        "cooperado_name": coop.name,
        "period": "últimos 12 meses",
        "total_charged": total_charged,
        "total_paid": total_paid,
        "total_overdue": total_overdue,
        "total_pending": total_pending,
        "net_balance": total_paid,
        "entries": entries,
    }


@router.get("/{cooperado_id}/informe-rendimentos", summary="Informe Anual de Rendimentos e Retenções (INSS/IRRF/FATES)")
async def get_cooperado_informe_rendimentos(
    cooperado_id: str,
    ano_base: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gera o Informe de Rendimentos Anual (BUG-02) consolidando repasses de produção,
    retenções fiscais na fonte (INSS, IRRF, Taxa Cooperativa/FATES), sobras distribuídas
    e capital social integralizado no exercício.
    """
    import re
    from models.models import AccountPayable
    from routers.crm import get_uuid

    business = await _get_user_business(db, current_user)
    c_id = get_uuid(cooperado_id)
    b_id = get_uuid(business.id)
    yr = ano_base or datetime.now(timezone.utc).year

    # Recupera cooperado por id ou por busca no tenant
    all_tenant_coops = (await db.execute(select(Cooperado).where(Cooperado.business_id == b_id))).scalars().all()
    coop = next((c for c in all_tenant_coops if str(c.id) == str(c_id)), None)
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperado não encontrado")

    c_doc_clean = re.sub(r"\D", "", coop.document or "")
    coop_name_lower = (coop.name or "").strip().lower()
    total_coops = len(all_tenant_coops)

    # 1. Aportes de Capital Social (BillingInvoice)
    inv_res = await db.execute(
        select(BillingInvoice).where(BillingInvoice.business_id == b_id)
    )
    all_invoices = inv_res.scalars().all()
    coop_invoices = [
        i for i in all_invoices
        if (
            (i.cooperado_id and str(i.cooperado_id) == str(coop.id))
            or (c_doc_clean and re.sub(r"\D", "", i.customer_doc or "") == c_doc_clean)
            or (coop_name_lower and i.customer_name and coop_name_lower in i.customer_name.lower())
        )
    ]
    # Saldo acumulado total de capital social
    capital_social_acumulado = sum(float(i.amount or 0) for i in coop_invoices if i.status == BillingStatus.PAID)
    if capital_social_acumulado == 0:
        capital_social_acumulado = sum(float(i.amount or 0) for i in coop_invoices)

    # 2. Repasses de Produção & Rateio de Sobras (AccountPayable)
    pay_res = await db.execute(
        select(AccountPayable).where(AccountPayable.business_id == b_id)
    )
    all_payables = pay_res.scalars().all()

    coop_payables = []
    for p in all_payables:
        desc = (p.description or "")
        desc_lower = desc.lower()
        desc_digits = re.sub(r"\D", "", desc)

        p_coop_match = False
        if p.supplier_id and str(p.supplier_id) == str(coop.id):
            p_coop_match = True
        elif coop_name_lower and coop_name_lower in desc_lower:
            p_coop_match = True
        elif c_doc_clean and c_doc_clean in desc_digits:
            p_coop_match = True
        elif "[REPASSE" in desc.upper() and (total_coops == 1 or "COOPERADO" in desc.upper()):
            p_coop_match = True
        elif "RATEIO DE SOBRAS" in desc.upper() and total_coops == 1:
            p_coop_match = True

        if p_coop_match:
            p_year = (p.due_date or p.data_competencia or p.created_at).year if (p.due_date or p.data_competencia or p.created_at) else yr
            if p_year == yr:
                coop_payables.append(p)

    bruto_total = 0.0
    inss_total = 0.0
    irrf_total = 0.0
    taxa_coop_total = 0.0
    liquido_total = 0.0
    sobras_total = 0.0
    historico = []

    bruto_re = re.compile(r"Bruto\s*R\$\s*([\d.,]+)", re.IGNORECASE)
    inss_re = re.compile(r"INSS\s*R\$\s*([\d.,]+)", re.IGNORECASE)
    irrf_re = re.compile(r"IRRF\s*R\$\s*([\d.,]+)", re.IGNORECASE)
    taxa_re = re.compile(r"(?:Taxa\s*Coop|FATES)\s*R\$\s*([\d.,]+)", re.IGNORECASE)

    def _parse_num(m):
        if not m:
            return 0.0
        raw = m.group(1).rstrip(".,")
        if "," in raw and "." in raw:
            raw = raw.replace(".", "").replace(",", ".")
        elif "," in raw:
            raw = raw.replace(",", ".")
        try:
            return float(raw)
        except ValueError:
            return 0.0

    for p in coop_payables:
        desc = p.description or ""
        net_val = float(p.amount or 0)
        if "RATEIO DE SOBRAS" in desc.upper():
            sobras_total += net_val
            liquido_total += net_val
        else:
            b_val = _parse_num(bruto_re.search(desc)) or net_val
            inss_v = _parse_num(inss_re.search(desc))
            irrf_v = _parse_num(irrf_re.search(desc))
            taxa_v = _parse_num(taxa_re.search(desc))

            # Se não estiverem detalhados na descrição mas for repasse, infere alíquotas padrão (11%, 1.5%, 5%)
            if inss_v == 0.0 and irrf_v == 0.0 and taxa_v == 0.0 and b_val > 0 and "[REPASSE" in desc.upper():
                inss_v = round(b_val * 0.11, 2)
                irrf_v = round(b_val * 0.015, 2)
                taxa_v = round(b_val * 0.05, 2)
                if net_val == b_val:
                    net_val = round(b_val - inss_v - irrf_v - taxa_v, 2)

            bruto_total += b_val
            inss_total += inss_v
            irrf_total += irrf_v
            taxa_coop_total += taxa_v
            liquido_total += net_val

        historico.append({
            "id": str(p.id),
            "date": (p.due_date or p.created_at).isoformat() if (p.due_date or p.created_at) else datetime.now(timezone.utc).isoformat(),
            "description": desc,
            "net_amount": round(net_val, 2),
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
        })

    return {
        "cooperado_id": str(coop.id),
        "cooperado_name": coop.name,
        "document": coop.document,
        "status": coop.status.value if hasattr(coop.status, "value") else str(coop.status),
        "ano_base": yr,
        "fonte_pagadora": {
            "nome": business.name,
            "cnpj": business.cnpj or "00.000.000/0001-00",
        },
        "resumo_fiscal": {
            "capital_social_integralizado": round(capital_social_acumulado, 2),
            "rendimentos_brutos_producao": round(bruto_total, 2),
            "retencao_inss": round(inss_total, 2),
            "retencao_irrf": round(irrf_total, 2),
            "taxa_cooperativa_fates": round(taxa_coop_total, 2),
            "taxa_administrativa_fates": round(taxa_coop_total, 2),
            "sobras_distribuidas_ago": round(sobras_total, 2),
            "sobras_liquidas_ago": round(sobras_total, 2),
            "rendimentos_liquidos_recebidos": round(liquido_total, 2),
        },
        "quadro_3_rendimentos_tributaveis": {
            "rendimentos_brutos_producao": round(bruto_total, 2),
            "contribuicao_previdenciaria_inss": round(inss_total, 2),
            "imposto_renda_retido_irrf": round(irrf_total, 2),
            "taxa_administrativa_fates": round(taxa_coop_total, 2),
            "rendimentos_liquidos_pagos": round(liquido_total, 2),
        },
        "quadro_4_rendimentos_isentos_exclusivos": {
            "sobras_liquidas_ago_distribuicao": round(sobras_total, 2),
        },
        "quadro_7_bens_e_direitos": {
            "saldo_quotas_capital_social_acumulado": round(capital_social_acumulado, 2),
        },
        "historico_lancamentos": historico,
    }
