from sqlalchemy.dialects.postgresql import UUID
"""
models/test_event.py — Test Event Model
════════════════════════════════════════════════
Tabela para registrar eventos de teste e logs do sistema.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime
from database import Base


class TestEvent(Base):
    __tablename__ = "test_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    event_type = Column(String, nullable=False, index=True)  # e.g., "simulation", "auth", "fuzzing", "z3_proof"
    service = Column(String, nullable=False, index=True)     # e.g., "gateway", "imobverse", "imortal", "powershell_bot"
    status = Column(String, nullable=False, index=True)      # e.g., "success", "failed", "warning", "info"
    message = Column(String, nullable=False)
    details = Column(JSON, nullable=True)                    # Payload or details about the event
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "event_type": self.event_type,
            "service": self.service,
            "status": self.status,
            "message": self.message,
            "details": self.details,
            "created_at": self.created_at.isoformat(),
        }
