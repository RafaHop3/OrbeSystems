"""
models/security_alert.py — Security Alert Model
════════════════════════════════════════════════
Tabela para registrar alertas de segurança gerados automaticamente
pelo motor de detecção de anomalias e regras SIEM.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, JSON, DateTime, Text, Index
from database import Base


# Severity levels (ascending risk)
SEVERITY_LOW      = "LOW"
SEVERITY_MEDIUM   = "MEDIUM"
SEVERITY_HIGH     = "HIGH"
SEVERITY_CRITICAL = "CRITICAL"

# Alert lifecycle states
STATUS_OPEN         = "open"
STATUS_ACKNOWLEDGED = "acknowledged"
STATUS_RESOLVED     = "resolved"


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id             = Column(String, primary_key=True, default=lambda: str(uuid4()))
    rule_name      = Column(String(100), nullable=False, index=True)
    severity       = Column(String(20), nullable=False, default=SEVERITY_MEDIUM, index=True)
    status         = Column(String(20), nullable=False, default=STATUS_OPEN, index=True)

    # Source context
    source_ip      = Column(String(50), nullable=True, index=True)
    session_id     = Column(String(200), nullable=True)
    visit_log_id   = Column(String(36), nullable=True)  # non-FK reference to visit_logs.id

    # Rich forensic payload — full event snapshot for investigation
    context        = Column(JSON, nullable=True)

    # Lifecycle timestamps
    triggered_at   = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at    = Column(DateTime, nullable=True)
    resolved_by    = Column(String(200), nullable=True)  # admin email

    __table_args__ = (
        Index("idx_sec_alert_severity_status", "severity", "status"),
        Index("idx_sec_alert_triggered_at",    "triggered_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id":               self.id,
            "rule_name":        self.rule_name,
            "severity":         self.severity,
            "status":           self.status,
            "source_ip":        self.source_ip,
            "session_id":       self.session_id,
            "visit_log_id":     self.visit_log_id,
            "context":          self.context,
            "triggered_at":     self.triggered_at.isoformat(),
            "acknowledged_at":  self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "resolved_at":      self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by":      self.resolved_by,
        }
