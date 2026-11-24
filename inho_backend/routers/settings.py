from sqlalchemy import cast, String
import uuid
import hashlib
import base64
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String

from db.session import get_db
from models.models import User, Business, ApiToken, BankIntegration, UserRole
from core.deps import get_current_user
from core.security import encrypt_secret, rotate_secret
from schemas.settings_schemas import ApiTokenCreate, ApiTokenOut, ApiTokenCreateResponse, BankIntegrationCreate, BankIntegrationOut
from routers.billing import _get_user_business
from routers.crm import get_uuid

router = APIRouter()

def _require_admin(user: User):
    role_val = (user.role.value if hasattr(user.role, "value") else str(user.role or "")).strip().lower()
    if role_val not in ("admin", "super_admin", "superadmin", "premium", "user"):
        raise HTTPException(status_code=403, detail="Apenas administradores podem gerenciar configurações globais.")

def _encrypt_key(key: str) -> str:
    return encrypt_secret(key)

# ── Overview / Plan & Quotas (05/11/2026) ────────────────────────
@router.get("", response_model=dict)
@router.get("/", response_model=dict)
async def get_settings_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna dados de plano_tier, monthly_price_cents, max_operators,
    consumo da franquia RAG/IA e operadores para o tenant ativo.
    """
    from models.models import BusinessOperator, AIKnowledgeChunk
    from core.config import PLAN_CATALOG
    from sqlalchemy import func

    business = await _get_user_business(db, current_user)
    if not business:
        raise HTTPException(status_code=404, detail="Negócio não encontrado.")

    b_id = get_uuid(business.id)

    operators_count = (await db.execute(
        select(func.count(BusinessOperator.id)).where(BusinessOperator.business_id == b_id)
    )).scalar() or 0

    rag_chunks_count = (await db.execute(
        select(func.count(AIKnowledgeChunk.id)).where(
            AIKnowledgeChunk.business_id == b_id,
            AIKnowledgeChunk.is_active == True,
        )
    )).scalar() or 0

    tier = getattr(business, "plan_tier", "INHO_ESSENCIAL")
    plan_info = PLAN_CATALOG.get(tier, {
        "tier": tier,
        "name": tier,
        "badge": "PLANO ATIVO",
        "monthly_price_cents": getattr(business, "monthly_price_cents", 29000),
        "max_operators": getattr(business, "max_operators", 3),
        "ai_rag_enabled": getattr(business, "ai_rag_enabled", False),
        "cbm_predictive_enabled": getattr(business, "cbm_predictive_enabled", False),
        "cooperativa_module_enabled": getattr(business, "cooperativa_module_enabled", False),
        "monthly_ai_quota": getattr(business, "monthly_ai_quota", 500),
    })

    return {
        "plan_tier": tier,
        "billing_cycle": getattr(business, "billing_cycle", "MONTHLY"),
        "monthly_price_cents": getattr(business, "monthly_price_cents", 29000),
        "max_operators": getattr(business, "max_operators", 3),
        "operators_count": operators_count,
        "ai_rag_enabled": getattr(business, "ai_rag_enabled", False),
        "cbm_predictive_enabled": getattr(business, "cbm_predictive_enabled", False),
        "cooperativa_module_enabled": getattr(business, "cooperativa_module_enabled", False),
        "monthly_ai_quota": getattr(business, "monthly_ai_quota", 500),
        "rag_chunks_count": rag_chunks_count,
        "business_id": str(business.id),
        "business_name": business.name,
        "plan_details": plan_info,
        "available_plans": PLAN_CATALOG,
    }

# ── API Tokens ──────────────────────────────────────────────────
@router.post("/api-tokens", response_model=ApiTokenCreateResponse)
async def create_api_token(
    payload: ApiTokenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    
    plain_token = f"inho_{os.urandom(24).hex()}"
    token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
    
    api_token = ApiToken(
        business_id=b_id,
        name=payload.name,
        token_hash=token_hash,
        created_by_id=get_uuid(current_user.id),
        expires_at=datetime.now(timezone.utc) + timedelta(days=365)
    )
    db.add(api_token)
    await db.commit()
    await db.refresh(api_token)
    
    return {
        "id": api_token.id,
        "business_id": api_token.business_id,
        "name": api_token.name,
        "token_hash": api_token.token_hash,
        "created_by_id": api_token.created_by_id,
        "expires_at": api_token.expires_at,
        "created_at": api_token.created_at,
        "plain_token": plain_token
    }

@router.get("/api-tokens", response_model=List[ApiTokenOut])
async def list_api_tokens(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    
    result = await db.execute(select(ApiToken).where(ApiToken.business_id == b_id))
    return result.scalars().all()

@router.delete("/api-tokens/{id}")
async def revoke_api_token(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    
    result = await db.execute(select(ApiToken).where(ApiToken.id == get_uuid(id), ApiToken.business_id == b_id))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token não encontrado.")
        
    await db.delete(token)
    await db.commit()
    return {"message": "Token revogado com sucesso"}

# ── Integrações Bancárias ───────────────────────────────────────
@router.post("/bank-integrations", response_model=BankIntegrationOut)
async def create_bank_integration(
    payload: BankIntegrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    
    existing = await db.execute(select(BankIntegration).where(BankIntegration.business_id == b_id, BankIntegration.bank_name == payload.bank_name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta integração bancária já existe para a empresa.")
    
    encrypted_key = _encrypt_key(payload.api_key)
    
    integration = BankIntegration(
        business_id=b_id,
        bank_name=payload.bank_name,
        api_key_encrypted=encrypted_key,
        webhook_url=f"https://inho-api.orbesystems.com.br/api/v1/webhooks/{payload.bank_name.lower()}/{business.id}",
        is_active=True
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return integration

@router.get("/bank-integrations", response_model=List[BankIntegrationOut])
async def list_bank_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    
    result = await db.execute(select(BankIntegration).where(BankIntegration.business_id == b_id))
    return result.scalars().all()

@router.delete("/bank-integrations/{id}")
async def remove_bank_integration(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)
    
    result = await db.execute(select(BankIntegration).where(BankIntegration.id == get_uuid(id), BankIntegration.business_id == b_id))
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integração bancária não encontrada.")
        
    await db.delete(integration)
    await db.commit()
    return {"message": "Integração removida."}

@router.post("/rotate-secrets")
async def rotate_business_secrets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Job de rotação em lote: re-criptografa todas as chaves bancárias do tenant
    (e o TOTP secret do operador, se presente) usando a chave primária ativa do MultiFernet,
    com lock_timeout de 5s e registro imutável na Trilha de Auditoria.
    """
    from sqlalchemy import text
    from models.models import AuditAction
    from services.audit import write_audit

    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)

    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")
    try:
        if not is_sqlite:
            await db.execute(text("SET LOCAL lock_timeout = '5s'"))

        stmt = select(BankIntegration).where(BankIntegration.business_id == b_id)
        if not is_sqlite:
            stmt = stmt.with_for_update()

        result = await db.execute(stmt)
        integrations = result.scalars().all()
        rotated_banks = 0
        for integ in integrations:
            if integ.api_key_encrypted:
                integ.api_key_encrypted = rotate_secret(integ.api_key_encrypted)
                rotated_banks += 1

        rotated_totp = 0
        if getattr(current_user, "totp_secret", None):
            current_user.totp_secret = rotate_secret(current_user.totp_secret)
            rotated_totp = 1

        role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        await write_audit(
            db,
            AuditAction.UPDATE,
            "KMS_MultiFernet",
            user_id=current_user.id,
            user_name=current_user.full_name,
            user_role=getattr(current_user, "role_label", role_val),
            business_id=b_id,
            entity_id=str(b_id),
            detail={
                "event": "KMS_SECRET_ROTATION",
                "rotated_bank_integrations": rotated_banks,
                "rotated_totp_secrets": rotated_totp,
            },
        )

        await db.commit()
    except Exception as exc:
        await db.rollback()
        err_msg = str(exc).lower()
        if "55p03" in err_msg or "lock timeout" in err_msg or "locknotavailable" in err_msg:
            raise HTTPException(
                status_code=409,
                detail="Rotação de chaves já em andamento por outro administrador. Aguarde alguns segundos e tente novamente.",
            )
        raise

    return {
        "status": "rotated",
        "rotated_bank_integrations": rotated_banks,
        "rotated_totp_secrets": rotated_totp,
        "audit_logged": True,
        "rotated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Frente IV: Backup Redundante Multi-Cloud (AES-256 + SHA-256) & Teste de Restore ──
from pydantic import BaseModel as _PydanticBaseModel


class BackupVerifyRestoreRequest(_PydanticBaseModel):
    encrypted_bundle: str
    expected_sha256: str


@router.post("/backup/snapshot")
async def create_encrypted_tenant_backup_snapshot(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json
    from models.models import (
        CRMContact,
        Cooperado,
        BillingInvoice,
        AccountPayable,
        AccountCategory,
        AIKnowledgeChunk,
        TenantAIPolicy,
        AuditAction,
    )
    from services.audit import write_audit

    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    b_id = get_uuid(business.id)

    contacts = (await db.execute(select(CRMContact).where(CRMContact.business_id == b_id))).scalars().all()
    coops = (await db.execute(select(Cooperado).where(Cooperado.business_id == b_id))).scalars().all()
    invoices = (await db.execute(select(BillingInvoice).where(BillingInvoice.business_id == b_id))).scalars().all()
    payables = (await db.execute(select(AccountPayable).where(AccountPayable.business_id == b_id))).scalars().all()
    categories = (await db.execute(select(AccountCategory).where(AccountCategory.business_id == b_id))).scalars().all()
    rag_chunks = (await db.execute(select(AIKnowledgeChunk).where(AIKnowledgeChunk.business_id == b_id))).scalars().all()
    policies = (await db.execute(select(TenantAIPolicy).where(TenantAIPolicy.business_id == b_id))).scalars().all()

    snapshot_payload = {
        "schema_version": "2026.11.24",
        "business_id": str(business.id),
        "business_name": business.name,
        "plan_tier": getattr(business, "plan_tier", "INHO_ESSENCIAL"),
        "tables": {
            "crm_contacts": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "category": c.category.value if hasattr(c.category, "value") else str(c.category),
                    "document": c.document,
                    "birth_date": getattr(c, "birth_date", None),
                    "filiation": getattr(c, "filiation", None),
                    "phones": c.phones,
                    "emails": c.emails,
                    "bank_accounts": c.bank_accounts,
                }
                for c in contacts
            ],
            "cooperados": [
                {
                    "id": str(cp.id),
                    "name": cp.name,
                    "document": cp.document,
                    "birth_date": getattr(cp, "birth_date", None),
                    "filiation": getattr(cp, "filiation", None),
                    "status": cp.status.value if hasattr(cp.status, "value") else str(cp.status),
                    "phones": cp.phones,
                    "emails": cp.emails,
                    "bank_accounts": cp.bank_accounts,
                }
                for cp in coops
            ],
            "billing_invoices": [
                {
                    "id": str(i.id),
                    "customer_name": i.customer_name,
                    "amount": float(i.amount or 0),
                    "status": i.status.value if hasattr(i.status, "value") else str(i.status),
                    "due_date": i.due_date.isoformat() if i.due_date else None,
                }
                for i in invoices
            ],
            "accounts_payable": [
                {
                    "id": str(p.id),
                    "description": p.description,
                    "amount": float(p.amount or 0),
                    "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                    "due_date": p.due_date.isoformat() if p.due_date else None,
                }
                for p in payables
            ],
            "account_categories": [{"id": str(cat.id), "name": cat.name} for cat in categories],
            "ai_knowledge_chunks": [{"id": str(ch.id), "title": ch.title, "category": ch.category} for ch in rag_chunks],
            "tenant_ai_policies": [{"id": str(pol.id), "status": pol.status} for pol in policies],
        },
    }

    canonical_json = json.dumps(snapshot_payload, sort_keys=True, ensure_ascii=False)
    sha256_checksum = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
    encrypted_bundle = encrypt_secret(canonical_json)
    snapshot_id = f"bkp_{str(business.id)[:8]}_{int(datetime.now(timezone.utc).timestamp())}"

    table_counts = {k: len(v) for k, v in snapshot_payload["tables"].items()}

    await write_audit(
        db,
        AuditAction.CREATE,
        "MULTI_CLOUD_BACKUP_SNAPSHOT",
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=getattr(current_user, "role_label", "admin"),
        business_id=b_id,
        entity_id=snapshot_id,
        detail={
            "sha256_checksum": sha256_checksum,
            "table_counts": table_counts,
            "targets": ["GCS_VAULT_READY", "NEON_CONTINGENCY_READY"],
        },
    )
    await db.commit()

    return {
        "status": "snapshot_created",
        "snapshot_id": snapshot_id,
        "business_id": str(business.id),
        "business_name": business.name,
        "sha256_checksum": sha256_checksum,
        "encryption": "MultiFernet_AES256",
        "replication_targets": ["GCS_VAULT_READY", "NEON_CONTINGENCY_READY"],
        "table_counts": table_counts,
        "encrypted_bundle": encrypted_bundle,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/backup/verify-restore")
async def verify_and_simulate_backup_restore(
    payload: BackupVerifyRestoreRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json
    from core.security import decrypt_secret

    _require_admin(current_user)
    business = await _get_user_business(db, current_user)

    try:
        decrypted_json = decrypt_secret(payload.encrypted_bundle)
    except Exception:
        raise HTTPException(status_code=400, detail="Falha ao descriptografar bundle de backup (chave inválida ou dados corrompidos).")

    computed_sha256 = hashlib.sha256(decrypted_json.encode("utf-8")).hexdigest()
    if computed_sha256 != payload.expected_sha256.strip().lower():
        raise HTTPException(status_code=400, detail="Divergência de checksum SHA-256: integridade do backup comprometida.")

    restored_data = json.loads(decrypted_json)
    if str(restored_data.get("business_id")) != str(business.id):
        raise HTTPException(status_code=403, detail="Bloqueio Multi-Tenant: Este snapshot pertence a outra organização.")

    tables = restored_data.get("tables") or {}
    restored_counts = {k: len(v) for k, v in tables.items()}

    return {
        "status": "restore_verified",
        "integrity_verified": True,
        "business_id": str(business.id),
        "sha256_checksum": computed_sha256,
        "restored_table_counts": restored_counts,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }


def _end_settings():
    return {
    }
