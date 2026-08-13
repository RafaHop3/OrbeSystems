from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from models.models import UserRole

class GlobalStatsOut(BaseModel):
    total_users: int
    active_accounts: int
    total_transactions_volume: str
    total_pdv_sales_volume: str

class UserListOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    role: UserRole

class UserStatusUpdate(BaseModel):
    is_active: bool

class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    action: str
    resource: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
