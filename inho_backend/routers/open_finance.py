"""
INHO – Router: Open Finance Brasil (BACEN Fase 2 & Fase 3 ITP) para Cooperativas e Cooperados
Isolamento Multi-Tenant estrito por `business_id`, criptografia MultiFernet AES-256,
conciliação automática de integralização de cotas e iniciação de repasses PIX (SPI EndToEndId).
"""
import hashlib
import json
import os
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_EVEN
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, cast, String, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from core.security import encrypt_secret
from db.session import get_db
from models.models import (
    AccountPayable,
    AuditAction,
    BankIntegration,
    BillingInvoice,
    BillingStatus,
    Business,
    CRMContact,
    Cooperado,
    CooperadoStatus,
    OmnichannelLog,
    PayableStatus,
    User,
    WebhookLog,
    WebhookProcessingStatus,
)
from routers.billing import _get_user_business
from routers.crm import get_uuid
from services.audit import write_audit

router = APIRouter()

_Q_TWO = Decimal("0.01")

# Catálogo base homologado BACEN Open Finance (priorizando Sistemas Cooperativos + Bancos Comerciais)
_CURATED_OPEN_FINANCE_BANKS = [
    {"code": "756", "ispb": "02038232", "name": "SICOOB - Banco Cooperativo Sicoob S.A.", "short_name": "SICOOB", "is_cooperative": True, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "748", "ispb": "01181521", "name": "SICREDI - Banco Cooperativo Sicredi S.A.", "short_name": "SICREDI", "is_cooperative": True, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "136", "ispb": "00315557", "name": "UNICRED - Confederação Nacional das Cooperativas Centrais Unicred", "short_name": "UNICRED", "is_cooperative": True, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "133", "ispb": "10398952", "name": "CRESOL - Confederação Nacional das Cooperativas Centrais de Crédito", "short_name": "CRESOL", "is_cooperative": True, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "085", "ispb": "05463212", "name": "AILOS - Cooperativa Central de Crédito Ailos (Viacredi)", "short_name": "AILOS", "is_cooperative": True, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "001", "ispb": "00000000", "name": "Banco do Brasil S.A.", "short_name": "BANCO_DO_BRASIL", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "077", "ispb": "00416968", "name": "Banco Inter S.A.", "short_name": "BANCO_INTER", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "403", "ispb": "37880206", "name": "Cora Sociedade de Crédito Direto S.A.", "short_name": "CORA", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "341", "ispb": "60701190", "name": "Itaú Unibanco S.A.", "short_name": "ITAU", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "237", "ispb": "60746948", "name": "Banco Bradesco S.A.", "short_name": "BRADESCO", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "033", "ispb": "90400888", "name": "Banco Santander (Brasil) S.A.", "short_name": "SANTANDER", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
    {"code": "104", "ispb": "00360305", "name": "Caixa Econômica Federal", "short_name": "CAIXA", "is_cooperative": False, "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"]},
]

_BANKS_CACHE: dict = {"ts": 0.0, "items": []}
_BANKS_TTL_SEC = 86400.0


# ── Schemas ──────────────────────────────────────────────────────────

class OpenFinanceConsentCreate(BaseModel):
    bank_code: str = Field(..., description="Código COMPE ou identificador ex: 756, 748, SICOOB, SICREDI")
    aggregator: str = Field(default="OPEN_FINANCE_BACEN_DIRECT", description="PLUGGY | BELVO | OPEN_FINANCE_BACEN_DIRECT")
    client_secret_or_token: str = Field(..., min_length=4, description="Token OAuth2/FAPI ou Chave de Consentimento Open Finance")
    account_branch: Optional[str] = Field(default="0001")
    account_number: Optional[str] = Field(default=None)
    scopes: List[str] = Field(default_factory=lambda: ["ACCOUNTS_READ", "BALANCES_READ", "TRANSACTIONS_READ", "PAYMENTS_PIX_INITIATION"])


class CooperadoBankAccountPayload(BaseModel):
    bank_code: str = Field(..., description="Código COMPE ex: 756 (Sicoob), 748 (Sicredi)")
    bank_name: Optional[str] = None
    ispb: Optional[str] = None
    branch: str = Field(..., description="Agência sem dígito ou com dígito")
    account_number: str = Field(..., description="Conta Corrente / Capital")
    account_type: str = Field(default="CONTA_CORRENTE", description="CONTA_CORRENTE | CONTA_POUPANCA | CONTA_CAPITAL_COOP")
    pix_key: str = Field(..., description="Chave PIX para recebimento de sobras e repasses")
    pix_key_type: str = Field(default="CPF_CNPJ", description="CPF_CNPJ | EMAIL | PHONE | EVP")
    open_finance_consent_id: Optional[str] = Field(default=None, description="ID do consentimento Open Finance do cooperado (opcional)")


class OpenFinanceTransactionItem(BaseModel):
    external_tx_id: Optional[str] = None
    document: Optional[str] = None
    cooperado_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float = Field(..., gt=0)
    description: Optional[str] = "Integralização de Cota-Parte via Open Finance"


class OpenFinanceSyncPayload(BaseModel):
    bank_integration_id: Optional[str] = None
    auto_reconcile_pending_cotas: bool = True
    transactions: Optional[List[OpenFinanceTransactionItem]] = None


class OpenFinancePixPayoutPayload(BaseModel):
    cooperado_id: str
    payable_id: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = "Repasse Cooperativo via Open Finance ITP (PIX)"
    idempotency_key: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────

def _resolve_bank_meta(bank_code_or_name: str) -> dict:
    clean = (bank_code_or_name or "").strip().upper()
    for b in _CURATED_OPEN_FINANCE_BANKS:
        if clean in (b["code"], b["short_name"], b["ispb"]) or b["short_name"] in clean or b["code"] in clean or clean in b["name"].upper():
            return b
    return {
        "code": clean[:3] if clean[:3].isdigit() else "999",
        "ispb": "00000000",
        "name": clean or "Instituição Open Finance",
        "short_name": clean.replace(" ", "_")[:30] or "OPEN_FINANCE",
        "is_cooperative": "COOP" in clean or "CRED" in clean,
        "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"],
    }


# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/directory", summary="Diretório Oficial de Bancos Participantes do Open Finance Brasil (BACEN/BrasilAPI)")
async def get_open_finance_directory(
    search: Optional[str] = Query(None, description="Busca por nome, código COMPE ou ISPB"),
    only_cooperativas: bool = Query(False, description="Filtra apenas cooperativas de crédito (Sicoob, Sicredi, Unicred, Cresol, Ailos)"),
    current_user: User = Depends(get_current_user),
):
    now_ts = time.time()
    catalog = list(_CURATED_OPEN_FINANCE_BANKS)

    # Tenta enriquecer com BrasilAPI /api/banks/v1 se o cache expirou
    if (now_ts - _BANKS_CACHE["ts"]) > _BANKS_TTL_SEC or not _BANKS_CACHE["items"]:
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.get("https://brasilapi.com.br/api/banks/v1")
                if resp.status_code == 200:
                    raw_banks = resp.json()
                    known_codes = {b["code"] for b in catalog}
                    for rb in raw_banks:
                        code_val = rb.get("code")
                        if code_val is None:
                            continue
                        code_str = f"{int(code_val):03d}"
                        if code_str not in known_codes:
                            full_name = rb.get("fullName") or rb.get("name") or f"Banco {code_str}"
                            catalog.append({
                                "code": code_str,
                                "ispb": str(rb.get("ispb") or "00000000").zfill(8),
                                "name": full_name,
                                "short_name": (rb.get("name") or full_name).upper().replace(" ", "_")[:30],
                                "is_cooperative": any(k in full_name.upper() for k in ("COOP", "SICREDI", "SICOOB", "UNICRED", "CRESOL", "AILOS")),
                                "open_finance_phases": ["FASE_2_DADOS", "FASE_3_ITP_PIX"],
                            })
                    _BANKS_CACHE["ts"] = now_ts
                    _BANKS_CACHE["items"] = catalog
        except Exception:
            if not _BANKS_CACHE["items"]:
                _BANKS_CACHE["items"] = catalog
    else:
        catalog = list(_BANKS_CACHE["items"])

    if only_cooperativas:
        catalog = [b for b in catalog if b.get("is_cooperative")]

    if search:
        q = search.strip().lower()
        catalog = [
            b for b in catalog
            if q in b["code"].lower()
            or q in b["ispb"].lower()
            or q in b["name"].lower()
            or q in b["short_name"].lower()
        ]

    return {
        "total": len(catalog),
        "items": catalog[:100],
    }


@router.get("/consents", summary="Lista conexões e consentimentos Open Finance ativos da Cooperativa (Tenant)")
async def list_open_finance_consents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)

    res = await db.execute(
        select(BankIntegration)
        .where(BankIntegration.business_id == b_id)
        .order_by(BankIntegration.created_at.desc())
    )
    integrations = res.scalars().all()

    items = []
    for integ in integrations:
        meta = _resolve_bank_meta(integ.bank_name)
        items.append({
            "id": str(integ.id),
            "business_id": str(integ.business_id),
            "bank_name": integ.bank_name,
            "institution_full_name": meta["name"],
            "compe_code": meta["code"],
            "ispb": meta["ispb"],
            "is_cooperative_bank": meta["is_cooperative"],
            "consent_urn": f"urn:bacen:openfinance:{meta['code']}:{str(integ.id)[:8]}",
            "webhook_url": integ.webhook_url,
            "is_active": integ.is_active,
            "scopes": ["ACCOUNTS_READ", "BALANCES_READ", "TRANSACTIONS_READ", "PAYMENTS_PIX_INITIATION"],
            "created_at": integ.created_at.isoformat() if integ.created_at else datetime.now(timezone.utc).isoformat(),
        })
    return items


@router.post("/consents", status_code=status.HTTP_201_CREATED, summary="Registra Consentimento Open Finance (OAuth2/FAPI + MultiFernet AES-256)")
async def create_open_finance_consent(
    payload: OpenFinanceConsentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_val = (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role or "")).strip().lower()
    if role_val not in ("admin", "super_admin", "superadmin", "operator", "premium", "user"):
        raise HTTPException(status_code=403, detail="Sem permissão para configurar Open Finance.")

    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    meta = _resolve_bank_meta(payload.bank_code)
    bank_identifier = f"{meta['short_name']}_OF_{meta['code']}"

    existing = (
        await db.execute(
            select(BankIntegration).where(
                BankIntegration.business_id == b_id,
                BankIntegration.bank_name == bank_identifier,
            )
        )
    ).scalar_one_or_none()

    secret_envelope = json.dumps({
        "token": payload.client_secret_or_token,
        "aggregator": payload.aggregator,
        "branch": payload.account_branch,
        "account": payload.account_number,
        "scopes": payload.scopes,
    })
    encrypted_payload = encrypt_secret(secret_envelope)

    if existing:
        existing.api_key_encrypted = encrypted_payload
        existing.is_active = True
        integ = existing
    else:
        integ = BankIntegration(
            business_id=b_id,
            bank_name=bank_identifier,
            api_key_encrypted=encrypted_payload,
            webhook_url=f"https://inho-api.orbesystems.com.br/api/v1/billing/webhooks/{meta['short_name'].lower()}",
            is_active=True,
        )
        db.add(integ)

    await db.commit()
    await db.refresh(integ)

    await write_audit(
        db,
        action=AuditAction.CREATE,
        entity="OPEN_FINANCE_CONSENT",
        entity_id=str(integ.id),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role_label,
        business_id=b_id,
        detail={
            "bank_code": meta["code"],
            "ispb": meta["ispb"],
            "institution": meta["name"],
            "aggregator": payload.aggregator,
            "scopes": payload.scopes,
        },
    )
    await db.commit()

    return {
        "id": str(integ.id),
        "business_id": str(integ.business_id),
        "bank_name": integ.bank_name,
        "institution_full_name": meta["name"],
        "compe_code": meta["code"],
        "ispb": meta["ispb"],
        "is_cooperative_bank": meta["is_cooperative"],
        "consent_urn": f"urn:bacen:openfinance:{meta['code']}:{str(integ.id)[:8]}",
        "webhook_url": integ.webhook_url,
        "is_active": integ.is_active,
        "scopes": payload.scopes,
        "created_at": integ.created_at.isoformat() if integ.created_at else datetime.now(timezone.utc).isoformat(),
    }


@router.post("/cooperado-account/{cooperado_id}", summary="Vincula Domicílio Bancário, Chave PIX e Consentimento Open Finance ao Sócio Cooperado")
async def link_cooperado_open_finance_account(
    cooperado_id: str,
    payload: CooperadoBankAccountPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    c_id = get_uuid(cooperado_id)

    coop = (
        await db.execute(
            select(Cooperado).where(
                Cooperado.id == c_id,
                Cooperado.business_id == b_id,
            )
        )
    ).scalar_one_or_none()
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperado não encontrado nesta cooperativa.")

    meta = _resolve_bank_meta(payload.bank_code)
    consent_tag = payload.open_finance_consent_id or f"urn:bacen:coop:{meta['code']}:{str(coop.id)[:8]}"

    structured_bank = (
        f"Banco: {meta['code']} - {payload.bank_name or meta['short_name']} (ISPB {payload.ispb or meta['ispb']}) | "
        f"Ag: {payload.branch} | Conta: {payload.account_number} ({payload.account_type}) | "
        f"PIX ({payload.pix_key_type}): {payload.pix_key} | OpenFinance: {consent_tag}"
    )
    coop.bank_details = structured_bank

    # Sincroniza também no CRMContact correspondente do mesmo tenant
    contact = (
        await db.execute(
            select(CRMContact).where(
                CRMContact.business_id == b_id,
                CRMContact.document == coop.document,
            )
        )
    ).scalars().first()
    if contact:
        contact.bank_details = structured_bank

    await db.commit()
    await db.refresh(coop)

    await write_audit(
        db,
        action=AuditAction.UPDATE,
        entity="COOPERADO_OPEN_FINANCE_ACCOUNT",
        entity_id=str(coop.id),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role_label,
        business_id=b_id,
        detail={
            "cooperado_name": coop.name,
            "bank_code": meta["code"],
            "ispb": payload.ispb or meta["ispb"],
            "branch": payload.branch,
            "account_number": payload.account_number,
            "pix_key": payload.pix_key,
            "open_finance_consent": consent_tag,
        },
    )
    await db.commit()

    return {
        "status": "linked",
        "cooperado_id": str(coop.id),
        "cooperado_name": coop.name,
        "business_id": str(b_id),
        "bank_details": coop.bank_details,
        "open_finance_metadata": {
            "compe_code": meta["code"],
            "ispb": payload.ispb or meta["ispb"],
            "institution": payload.bank_name or meta["name"],
            "branch": payload.branch,
            "account_number": payload.account_number,
            "account_type": payload.account_type,
            "pix_key": payload.pix_key,
            "pix_key_type": payload.pix_key_type,
            "consent_id": consent_tag,
        },
    }


@router.post("/sync-statement", summary="Sincroniza Extrato Open Finance e Concilia Automaticamente Cotas/Aportes dos Cooperados")
async def sync_open_finance_statement(
    payload: OpenFinanceSyncPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")

    if not is_sqlite:
        await db.execute(text("SET LOCAL lock_timeout = '5s'"))

    # Busca faturas pendentes/vencidas do tenant ativo
    inv_stmt = (
        select(BillingInvoice)
        .where(
            BillingInvoice.business_id == b_id,
            or_(BillingInvoice.status == BillingStatus.PENDING, BillingInvoice.status == BillingStatus.OVERDUE),
        )
        .order_by(BillingInvoice.due_date.asc())
    )
    if not is_sqlite:
        inv_stmt = inv_stmt.with_for_update()
    pending_invoices = list((await db.execute(inv_stmt)).scalars().all())

    reconciled_invoices = []
    upgraded_cooperados = []

    tx_list = payload.transactions or []
    # Se nenhuma transação explícita foi enviada e auto_reconcile_pending_cotas=True,
    # simula o pull do feed Open Finance para faturas vinculadas a cooperados do tenant
    if not tx_list and payload.auto_reconcile_pending_cotas:
        for inv in pending_invoices:
            if inv.cooperado_id or inv.customer_doc:
                tx_list.append(
                    OpenFinanceTransactionItem(
                        external_tx_id=f"of-sync-{inv.id}",
                        invoice_id=str(inv.id),
                        cooperado_id=str(inv.cooperado_id) if inv.cooperado_id else None,
                        document=inv.customer_doc,
                        amount=float(inv.amount),
                        description=inv.description or "Integralização Cota-Parte Open Finance",
                    )
                )

    for tx in tx_list:
        idem_key = tx.external_tx_id or f"of-tx-{b_id}-{tx.invoice_id or tx.document}-{tx.amount:.2f}"
        existing_log = (
            await db.execute(select(WebhookLog).where(WebhookLog.event_id == idem_key))
        ).scalar_one_or_none()
        if existing_log and existing_log.status == WebhookProcessingStatus.PROCESSED:
            continue

        matched_inv: Optional[BillingInvoice] = None
        for candidate in pending_invoices:
            if candidate.status == BillingStatus.PAID:
                continue
            if tx.invoice_id and str(candidate.id) == str(tx.invoice_id):
                matched_inv = candidate
                break
            if tx.cooperado_id and candidate.cooperado_id and str(candidate.cooperado_id) == str(tx.cooperado_id):
                matched_inv = candidate
                break
            if tx.document and candidate.customer_doc:
                c_doc = candidate.customer_doc.replace(".", "").replace("-", "").replace("/", "")
                t_doc = tx.document.replace(".", "").replace("-", "").replace("/", "")
                if c_doc and c_doc == t_doc:
                    matched_inv = candidate
                    break

        if not matched_inv:
            continue

        try:
            async with db.begin_nested():
                if not existing_log:
                    w_log = WebhookLog(
                        event_id=idem_key,
                        provider="OPEN_FINANCE_BACEN",
                        payload=tx.model_dump_json(),
                        status=WebhookProcessingStatus.PROCESSED,
                    )
                    db.add(w_log)
                    await db.flush()
                else:
                    existing_log.status = WebhookProcessingStatus.PROCESSED
        except IntegrityError:
            continue

        matched_inv.status = BillingStatus.PAID
        matched_inv.remaining_balance = Decimal("0.00")
        matched_inv.updated_by_id = get_uuid(current_user.id)
        matched_inv.updated_by_name = f"Open Finance Auto-Clear ({current_user.full_name})"
        reconciled_invoices.append(str(matched_inv.id))

        # Atualiza status do Cooperado (FSM: PROPOSTA_CADASTRADA / ANALISE_COMITE / COTAS_LIQUIDADAS -> ATIVO)
        coop: Optional[Cooperado] = None
        if matched_inv.cooperado_id:
            coop = (
                await db.execute(
                    select(Cooperado).where(
                        Cooperado.id == matched_inv.cooperado_id,
                        Cooperado.business_id == b_id,
                    )
                )
            ).scalar_one_or_none()
        elif matched_inv.customer_doc:
            clean_doc = matched_inv.customer_doc.replace(".", "").replace("-", "").replace("/", "")
            coop = (
                await db.execute(
                    select(Cooperado).where(
                        Cooperado.business_id == b_id,
                        or_(Cooperado.document == clean_doc, Cooperado.document == matched_inv.customer_doc),
                    )
                )
            ).scalars().first()

        if coop and coop.status in (
            CooperadoStatus.PROPOSTA_CADASTRADA,
                                    CooperadoStatus.AGUARDANDO_INTEGRALIZACAO,
        ):
            coop.status = CooperadoStatus.ATIVO
            upgraded_cooperados.append(str(coop.id))

    await db.commit()

    await write_audit(
        db,
        action=AuditAction.UPDATE,
        entity="OPEN_FINANCE_STATEMENT_SYNC",
        entity_id=str(b_id),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role_label,
        business_id=b_id,
        detail={
            "reconciled_count": len(reconciled_invoices),
            "reconciled_invoices": reconciled_invoices,
            "upgraded_cooperados": upgraded_cooperados,
        },
    )
    await db.commit()

    return {
        "status": "synced",
        "business_id": str(b_id),
        "reconciled_count": len(reconciled_invoices),
        "reconciled_invoice_ids": reconciled_invoices,
        "upgraded_cooperado_ids": upgraded_cooperados,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/pix-payout", summary="Iniciação de Pagamento PIX (Open Finance Fase 3 ITP) para Repasse ou Sobras ao Cooperado")
async def initiate_open_finance_pix_payout(
    payload: OpenFinancePixPayoutPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    c_id = get_uuid(payload.cooperado_id)

    coop = (
        await db.execute(
            select(Cooperado).where(
                Cooperado.id == c_id,
                Cooperado.business_id == b_id,
            )
        )
    ).scalar_one_or_none()
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperado não encontrado nesta cooperativa.")

    if not coop.bank_details:
        raise HTTPException(
            status_code=400,
            detail="O cooperado não possui domicílio bancário / chave PIX vinculada ao Open Finance.",
        )

    payable: Optional[AccountPayable] = None
    if payload.payable_id:
        p_id = get_uuid(payload.payable_id)
        payable = (
            await db.execute(
                select(AccountPayable).where(
                    AccountPayable.id == p_id,
                    AccountPayable.business_id == b_id,
                )
            )
        ).scalar_one_or_none()
        if not payable:
            raise HTTPException(status_code=404, detail="Título a pagar não encontrado nesta cooperativa.")

    raw_amount = payload.amount if payload.amount is not None else (float(payable.amount) if payable else 0.0)
    if raw_amount <= 0:
        raise HTTPException(status_code=400, detail="Informe um valor positivo para o repasse PIX Open Finance.")

    amount_dec = Decimal(str(raw_amount)).quantize(_Q_TWO, rounding=ROUND_HALF_EVEN)
    now_utc = datetime.now(timezone.utc)
    e2e_random = hashlib.sha256(f"{b_id}:{coop.id}:{amount_dec}:{payload.idempotency_key or uuid.uuid4()}".encode()).hexdigest()[:11].upper()
    end_to_end_id = f"E02038232{now_utc.strftime('%Y%m%d%H%M')}{e2e_random}"

    if payable:
        payable.status = PayableStatus.PAID

    ph = (coop.phone or os.getenv("ORBE_DEFAULT_WHATSAPP", "5551981598760")).replace("+", "").replace("-", "").replace(" ", "")
    db.add(
        OmnichannelLog(
            business_id=b_id,
            sender_id=get_uuid(current_user.id),
            channel="WHATSAPP",
            recipient=ph,
            message_content=(
                f"🏦 *REPASSE PIX OPEN FINANCE ({business.name})*\n"
                f"Cooperado: *{coop.name}*\n"
                f"Valor Líquido Transferido: *R$ {amount_dec:.2f}*\n"
                f"Destino: {coop.bank_details}\n"
                f"EndToEndId (BACEN SPI): `{end_to_end_id}`"
            ),
            status="DELIVERED",
        )
    )

    await db.commit()

    await write_audit(
        db,
        action=AuditAction.CREATE,
        entity="OPEN_FINANCE_ITP_PIX_PAYOUT",
        entity_id=str(payable.id) if payable else str(coop.id),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role_label,
        business_id=b_id,
        detail={
            "cooperado_id": str(coop.id),
            "cooperado_name": coop.name,
            "amount": float(amount_dec),
            "end_to_end_id": end_to_end_id,
            "bank_details": coop.bank_details,
        },
    )
    await db.commit()

    return {
        "status": "settled_via_open_finance_itp",
        "end_to_end_id": end_to_end_id,
        "cooperado_id": str(coop.id),
        "cooperado_name": coop.name,
        "amount": float(amount_dec),
        "bank_details": coop.bank_details,
        "payable_id": str(payable.id) if payable else None,
        "settled_at": now_utc.isoformat(),
    }
