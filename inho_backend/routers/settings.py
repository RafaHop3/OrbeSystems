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
