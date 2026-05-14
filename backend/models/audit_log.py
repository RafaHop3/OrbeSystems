"""
models/audit_log.py — Audit Log Model
════════════════════════════════════════════════
Tabela para registrar todas as ações administrativas.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime
from database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    admin_email = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # e.g. "update_user_role", "delete_user"
    target_type = Column(String, nullable=False)  # e.g. "user", "project"
    target_id = Column(String, nullable=False)
    details = Column(JSON, nullable=True)  # Additional details about the action
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "admin_email": self.admin_email,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat(),
        }
