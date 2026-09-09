import uuid
import hashlib
import base64
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from models.models import User, Business, ApiToken, BankIntegration, UserRole
from core.deps import get_current_user
from schemas.settings_schemas import ApiTokenCreate, ApiTokenOut, ApiTokenCreateResponse, BankIntegrationCreate, BankIntegrationOut
from routers.billing import _get_user_business

router = APIRouter()

def _require_admin(user: User):
    if user.role != UserRole.ADMIN and user.role != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem gerenciar configurações globais.")

# Dummy encryption for bank keys without external dependencies (production uses KMS/Vault)
def _encrypt_key(key: str) -> str:
    return base64.b64encode(key.encode()).decode()

# ── API Tokens ──────────────────────────────────────────────────
@router.post("/api-tokens", response_model=ApiTokenCreateResponse)
async def create_api_token(
    payload: ApiTokenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    
    plain_token = f"inho_{os.urandom(24).hex()}"
    token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
    
    api_token = ApiToken(
        business_id=business.id,
        name=payload.name,
        token_hash=token_hash,
        created_by_id=current_user.id,
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
    
    result = await db.execute(select(ApiToken).where(ApiToken.business_id == business.id))
    return result.scalars().all()

@router.delete("/api-tokens/{id}")
async def revoke_api_token(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    
    result = await db.execute(select(ApiToken).where(ApiToken.id == id, ApiToken.business_id == business.id))
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
    
    # Upsert logic to replace existing integration for the same bank if desired, but we will simplify
    existing = await db.execute(select(BankIntegration).where(BankIntegration.business_id == business.id, BankIntegration.bank_name == payload.bank_name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta integração bancária já existe para a empresa.")
    
    encrypted_key = _encrypt_key(payload.api_key)
    
    integration = BankIntegration(
        business_id=business.id,
        bank_name=payload.bank_name,
        api_key_encrypted=encrypted_key,
        webhook_url=f"https://api.orbein.ho/webhooks/{payload.bank_name.lower()}/{business.id}",
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
    
    result = await db.execute(select(BankIntegration).where(BankIntegration.business_id == business.id))
    return result.scalars().all()

@router.delete("/bank-integrations/{id}")
async def remove_bank_integration(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_admin(current_user)
    business = await _get_user_business(db, current_user)
    
    result = await db.execute(select(BankIntegration).where(BankIntegration.id == id, BankIntegration.business_id == business.id))
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integração bancária não encontrada.")
        
    await db.delete(integration)
    await db.commit()
    return {"message": "Integração removida."}
