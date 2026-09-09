from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

# ── Business (Money Layer / Settings) ────────────────────────
class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    municipal_registration: Optional[str] = None
    state_registration: Optional[str] = None
    cashflow_horizon_months: Optional[int] = None
    # category, etc can be added if needed, but these are focus of phase 4

class BusinessOut(BaseModel):
    id: UUID
    user_id: str
    name: str
    cnpj: Optional[str] = None
    category: str
    municipal_registration: Optional[str] = None
    state_registration: Optional[str] = None
    logo_url: Optional[str] = None
    cashflow_horizon_months: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# ── API Tokens ──────────────────────────────────────────────
class ApiTokenCreate(BaseModel):
    name: str

class ApiTokenOut(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    token_hash: str # normally we only show the token once, but the schema will carry the hash
    created_by_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ApiTokenCreateResponse(ApiTokenOut):
    plain_token: str # Emitted only on creation

# ── Bank Integrations ───────────────────────────────────────
class BankIntegrationCreate(BaseModel):
    bank_name: str
    api_key: str # The unencrypted key received from user

class BankIntegrationOut(BaseModel):
    id: UUID
    business_id: UUID
    bank_name: str
    webhook_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Notice we don't output the api_key_encrypted
    
    model_config = ConfigDict(from_attributes=True)
