"""
INHO – Contracts Router (Gestão de Contratos)
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    Contract, ContractStatus, User,
    AuditAction, BusinessOperator
)
from schemas.schemas import ContractCreate, ContractOut
from services.audit import write_audit
from routers.billing import _get_user_business

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("/", response_model=ContractOut, status_code=status.HTTP_201_CREATED)
async def create_contract(
    request: Request,
    body: ContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)

    contract = Contract(**body.model_dump(), business_id=business.id)
    db.add(contract)
    await db.flush()
    await write_audit(
        db, AuditAction.CREATE, "Contract",
        user_id=current_user.id, entity_id=str(contract.id),
        detail={"title": body.title}, request=request
    )
    await db.commit()
    await db.refresh(contract)
    return contract


@router.get("/", response_model=List[ContractOut])
async def list_contracts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(Contract).where(Contract.business_id == business.id).order_by(Contract.created_at.desc()))
    return result.scalars().all()


@router.get("/{contract_id}", response_model=ContractOut)
async def get_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.business_id == business.id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return contract


@router.post("/{contract_id}/activate", response_model=ContractOut)
async def activate_contract(
    request: Request,
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ativa o contrato."""
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.business_id == business.id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if contract.status == ContractStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Contrato já está ativo")

    contract.status = ContractStatus.ACTIVE

    await write_audit(
        db, AuditAction.UPDATE, "Contract",
        user_id=current_user.id, entity_id=str(contract_id),
        detail={"activated": True},
        request=request
    )
    await db.commit()
    await db.refresh(contract)
    return contract


@router.patch("/{contract_id}/status", response_model=ContractOut)
async def update_contract_status(
    request: Request,
    contract_id: str,
    new_status: ContractStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)

    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.business_id == business.id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    contract.status = new_status
    await write_audit(
        db, AuditAction.UPDATE, "Contract",
        user_id=current_user.id, entity_id=str(contract_id),
        detail={"new_status": new_status}, request=request
    )
    await db.commit()
    await db.refresh(contract)
    return contract


@router.post("/{contract_id}/generate-schedule", response_model=dict)
async def generate_contract_schedule(
    request: Request,
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Conversão transacional (Passo 4B) de Contrato ativo em parcelas no Agendar Recebíveis /
    Contas a Receber (ou Contas a Pagar) + registro de Recorrência.
    Protegido por Idempotency-Key, SET LOCAL lock_timeout = '5s' e SELECT ... FOR UPDATE.
    """
    import os
    import uuid
    import urllib.parse
    from decimal import Decimal, ROUND_HALF_UP
    from dateutil.relativedelta import relativedelta
    from datetime import timedelta
    from sqlalchemy import text
    from models.models import (
        BillingInvoice, BillingStatus, PaymentMethod, InvoiceType,
        AccountPayable, PayableStatus, Recurrence, RecurrenceFrequency, RecurrenceStatus,
    )
    from routers.billing import _generate_authenticated_pix_code
    from routers.crm import (
        get_uuid, _IDEMPOTENCY_CACHE, _IDEMPOTENCY_TTL_SEC, _MAX_IDEMPOTENCY_KEYS,
        _cache_get, _cache_set,
    )

    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    c_id = get_uuid(contract_id)
    idem_key = (request.headers.get("Idempotency-Key") or "").strip()

    if idem_key:
        scoped_key = f"contract_sched:{b_id}:{idem_key}"
        cached = _cache_get(_IDEMPOTENCY_CACHE, scoped_key, _IDEMPOTENCY_TTL_SEC)
        if cached:
            replay = dict(cached)
            replay["cached_replay"] = True
            return replay

    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")

    try:
        if not is_sqlite:
            await db.execute(text("SET LOCAL lock_timeout = '5s'"))

        stmt = select(Contract).where(Contract.id == c_id, Contract.business_id == b_id)
        if not is_sqlite:
            stmt = stmt.with_for_update()
        contract = (await db.execute(stmt)).scalar_one_or_none()
        if not contract:
            raise HTTPException(status_code=404, detail="Contrato não encontrado")

        if contract.status != ContractStatus.ACTIVE:
            contract.status = ContractStatus.ACTIVE

        tag = f"[CONTRATO #{str(contract.id)[:8].upper()}]"
        n_parcels = max(1, int(contract.installments or 1))
        rec_type = (contract.record_type or "RECEIVABLE").upper()

        # Guard de idempotência por estado no banco
        if rec_type == "PAYABLE":
            existing_rows = (
                await db.execute(
                    select(AccountPayable.id).where(
                        AccountPayable.business_id == b_id,
                        AccountPayable.description.ilike(f"%{tag}%"),
                    )
                )
            ).scalars().all()
        else:
            existing_rows = (
                await db.execute(
                    select(BillingInvoice.id).where(
                        BillingInvoice.business_id == b_id,
                        BillingInvoice.description.ilike(f"%{tag}%"),
                    )
                )
            ).scalars().all()

        if existing_rows:
            resp_existing = {
                "contract_id": str(contract.id),
                "record_type": rec_type,
                "generated_count": 0,
                "skipped_existing": len(existing_rows),
                "installment_ids": [str(x) for x in existing_rows],
                "recurrence_id": None,
                "cached_replay": False,
                "message": "Parcelas deste contrato já foram geradas anteriormente.",
            }
            if idem_key:
                _cache_set(_IDEMPOTENCY_CACHE, f"contract_sched:{b_id}:{idem_key}", resp_existing, _MAX_IDEMPOTENCY_KEYS)
            return resp_existing

        total_dec = Decimal(str(contract.total_value))
        base_parcel = (total_dec / Decimal(n_parcels)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        freq_str = (contract.frequency or "MONTHLY").upper()
        freq_enum = RecurrenceFrequency.MONTHLY
        if freq_str in ("DAILY", "WEEKLY", "MONTHLY", "ANNUAL"):
            freq_enum = RecurrenceFrequency(freq_str)

        installment_ids = []
        for idx in range(n_parcels):
            # Última parcela absorve eventual diferença de centavos
            if idx == n_parcels - 1:
                parcel_amt = total_dec - (base_parcel * Decimal(n_parcels - 1))
            else:
                parcel_amt = base_parcel

            if freq_enum == RecurrenceFrequency.DAILY:
                due_dt = contract.start_date + timedelta(days=idx)
            elif freq_enum == RecurrenceFrequency.WEEKLY:
                due_dt = contract.start_date + timedelta(weeks=idx)
            elif freq_enum == RecurrenceFrequency.ANNUAL:
                due_dt = contract.start_date + relativedelta(years=idx)
            else:
                due_dt = contract.start_date + relativedelta(months=idx)

            desc = f"{contract.title} ({idx + 1}/{n_parcels}) {tag}"

            if rec_type == "PAYABLE":
                pay_id = uuid.uuid4()
                db.add(
                    AccountPayable(
                        id=pay_id,
                        business_id=b_id,
                        description=f"{contract.contact_name} — {desc}",
                        amount=parcel_amt,
                        due_date=due_dt,
                        data_competencia=due_dt,
                        status=PayableStatus.PENDING,
                    )
                )
                installment_ids.append(str(pay_id))
            else:
                inv_id = uuid.uuid4()
                pix_code, _ = await _generate_authenticated_pix_code(
                    db, b_id, inv_id, parcel_amt, contract.contact_name
                )
                pix_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(pix_code)}"
                db.add(
                    BillingInvoice(
                        id=inv_id,
                        business_id=b_id,
                        invoice_type=InvoiceType.MENSALIDADE,
                        customer_name=contract.contact_name,
                        customer_doc=contract.contact_doc,
                        amount=parcel_amt,
                        due_date=due_dt,
                        data_competencia=due_dt,
                        status=BillingStatus.PENDING,
                        pix_code=pix_code,
                        pix_qr_url=pix_qr_url,
                        payment_method=PaymentMethod.PIX,
                        description=desc,
                        created_by_id=current_user.id,
                        created_by_name=f"{current_user.full_name} ({current_user.role_label})",
                        updated_by_id=current_user.id,
                        updated_by_name=f"{current_user.full_name} ({current_user.role_label})",
                    )
                )
                installment_ids.append(str(inv_id))

        # Registra agendamento em Recurrences para governança de recorrência
        rec_id = uuid.uuid4()
        db.add(
            Recurrence(
                id=rec_id,
                business_id=b_id,
                description=f"{contract.title} — {contract.contact_name} {tag}",
                amount=base_parcel,
                frequency=freq_enum,
                first_due_date=contract.start_date,
                next_due_date=contract.start_date + relativedelta(months=1),
                parcel_total=n_parcels,
                parcel_current=n_parcels,
                status=RecurrenceStatus.ACTIVE,
                payment_method=PaymentMethod.PIX,
            )
        )

        await write_audit(
            db,
            AuditAction.CREATE,
            "ContractSchedule",
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=current_user.role_label,
            business_id=b_id,
            entity_id=str(contract.id),
            detail={"generated_count": len(installment_ids), "record_type": rec_type, "recurrence_id": str(rec_id)},
            request=request,
        )
        await db.commit()

        response_data = {
            "contract_id": str(contract.id),
            "record_type": rec_type,
            "generated_count": len(installment_ids),
            "skipped_existing": 0,
            "installment_ids": installment_ids,
            "recurrence_id": str(rec_id),
            "cached_replay": False,
        }
        if idem_key:
            _cache_set(_IDEMPOTENCY_CACHE, f"contract_sched:{b_id}:{idem_key}", response_data, _MAX_IDEMPOTENCY_KEYS)
        return response_data

    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        err_msg = str(exc).lower()
        if "55p03" in err_msg or "lock timeout" in err_msg or "locknotavailable" in err_msg:
            raise HTTPException(
                status_code=409,
                detail="Este contrato está sendo processado concorrentemente por outro operador. Tente novamente.",
            )
        raise
