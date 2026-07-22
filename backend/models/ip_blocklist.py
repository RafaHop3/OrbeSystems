"""
models/ip_blocklist.py — SOAR IP Blocklist Model
══════════════════════════════════════════════════
Persists IPs blocked by automated SOAR playbooks or manual admin action.
The in-memory cache in soar_service.py uses this table as the source of
truth but avoids a DB hit on every request.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Index
from database import Base


class IpBlocklist(Base):
    __tablename__ = "ip_blocklist"

    id                 = Column(String, primary_key=True, default=lambda: str(uuid4()))
    ip                 = Column(String(50), nullable=False, unique=True, index=True)
    reason             = Column(String(200), nullable=False)
    playbook_triggered = Column(String(100), nullable=True)   # e.g. "rate_abuse_block"
    created_by         = Column(String(200), nullable=False, default="soar_engine")
    blocked_until      = Column(DateTime, nullable=False, index=True)  # UTC expiry
    created_at         = Column(DateTime, nullable=False,
                                default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_blocklist_blocked_until", "blocked_until"),
    )

    def to_dict(self) -> dict:
        return {
            "id":                 self.id,
            "ip":                 self.ip,
            "reason":             self.reason,
            "playbook_triggered": self.playbook_triggered,
            "created_by":         self.created_by,
            "blocked_until":      self.blocked_until.isoformat(),
            "created_at":         self.created_at.isoformat(),
        }
