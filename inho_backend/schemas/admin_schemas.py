from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from models.models import UserRole

class GlobalStatsOut(BaseModel):
    total_users: int
    active_accounts: int
    total_transactions_volume: str
    total_pdv_sales_volume: str

class UserListOut(BaseModel):
    id: UUID | str
    email: str
    full_name: str
    role: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    @field_validator("role", mode="before")
    @classmethod
    def _norm_role(cls, v):
        raw = (v.value if hasattr(v, "value") else str(v or "admin")).strip().lower()
        if raw in ("superadmin", "super_admin"):
            return "super_admin"
        if raw in ("admin", "premium", "user"):
            return "admin"
        return raw

    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    role: str

class UserStatusUpdate(BaseModel):
    is_active: bool

class AuditLogOut(BaseModel):
    id: UUID | str
    user_id: Optional[UUID | str] = None
    action: str
    resource: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
