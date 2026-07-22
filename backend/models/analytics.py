"""
models/analytics.py — Analytics & Session Models
════════════════════════════════════════════════
Tabelas para registrar acessos e rastrear sessões ativas.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Text, Index, Float, JSON
from database import Base
from pydantic import BaseModel
from typing import Optional


class VisitLog(Base):
    __tablename__ = "visit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    ip = Column(String, nullable=False, index=True)
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    isp = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    path = Column(String, nullable=True)
    referrer = Column(String, nullable=True)
    event_type = Column(String, nullable=False, default="page_view")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # ── SIEM / Anomaly Enrichment (Phase 2) ──────────────────────────────────
    # Nullable so existing rows are not affected
    risk_score       = Column(Float,   nullable=True)   # 0.0 – 1.0
    threat_tags      = Column(JSON,    nullable=True)   # e.g. ["rate_abuse", "path_enumeration"]
    session_duration = Column(Integer, nullable=True)   # seconds

    __table_args__ = (
        Index('idx_timestamp_ip', 'timestamp', 'ip'),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ip": self.ip,
            "city": self.city,
            "region": self.region,
            "country": self.country,
            "isp": self.isp,
            "user_agent": self.user_agent,
            "path": self.path,
            "referrer": self.referrer,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "risk_score": self.risk_score,
            "threat_tags": self.threat_tags or [],
            "session_duration": self.session_duration,
        }


class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    session_id = Column(String, nullable=False, unique=True, index=True)
    ip = Column(String, nullable=False, index=True)
    user_agent = Column(Text, nullable=True)
    current_path = Column(String, nullable=True)
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index('idx_last_activity', 'last_activity'),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "ip": self.ip,
            "user_agent": self.user_agent,
            "current_path": self.current_path,
            "last_activity": self.last_activity.isoformat(),
            "created_at": self.created_at.isoformat(),
        }


# Pydantic models for API
class Visit(BaseModel):
    id: str
    ip: str
    city: Optional[str] = "Unknown"
    region: Optional[str] = "Unknown"
    country: Optional[str] = "Unknown"
    isp: Optional[str] = "Unknown"
    browser: Optional[str] = "Unknown"
    os: Optional[str] = "Unknown"
    path: str
    timestamp: datetime
