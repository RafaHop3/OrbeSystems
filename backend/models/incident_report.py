"""
models/incident_report.py — IR Lifecycle Model (NIST SP 800-61)
═══════════════════════════════════════════════════════════════
Persists a full Incident Response record, tracking each NIST phase
transition from Detection → Containment → Post-Incident.
Linked to SecurityAlert by alert_id for bidirectional navigation.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import (
    Column, String, Text, Boolean, Integer,
    DateTime, JSON, Index,
)
from database import Base


# ── NIST SP 800-61 Phase constants ───────────────────────────────────────────
PHASE_PREPARATION   = "preparation"
PHASE_DETECTION     = "detection"
PHASE_CONTAINMENT   = "containment"
PHASE_POST_INCIDENT = "post_incident"

NIST_PHASES = [
    PHASE_PREPARATION,
    PHASE_DETECTION,
    PHASE_CONTAINMENT,
    PHASE_POST_INCIDENT,
]

# IR record lifecycle
IR_STATUS_OPEN   = "open"
IR_STATUS_CLOSED = "closed"


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))

    # Link to the triggering SecurityAlert (non-FK soft reference)
    alert_id        = Column(String(36), nullable=True, index=True)

    # NIST lifecycle
    nist_phase      = Column(String(30), nullable=False, default=PHASE_DETECTION, index=True)
    status          = Column(String(20), nullable=False, default=IR_STATUS_OPEN, index=True)

    # Incident context
    severity        = Column(String(20), nullable=False, default="HIGH", index=True)
    vector          = Column(String(200), nullable=True)           # e.g. "sqli_unvalidated_route"
    affected_route  = Column(String(500), nullable=True)           # FastAPI route under attack
    source_ip       = Column(String(50), nullable=True, index=True)

    # Automated actions log (SOAR playbooks executed)
    containment_actions = Column(JSON, nullable=True)              # [{"action": "block_ip", "ts": "..."}]

    # Post-incident retroalimentação flags
    lessons_learned     = Column(Text, nullable=True)
    sast_rule_added     = Column(Boolean, nullable=False, default=False)  # Semgrep/Bandit rule flagged
    waf_signature_added = Column(Boolean, nullable=False, default=False)  # WAF signature flagged
    arch_revision_needed = Column(Boolean, nullable=False, default=False) # Architecture revision flagged

    # Performance metrics
    mttr_seconds    = Column(Integer, nullable=True)               # Mean Time To Recovery

    # Lifecycle timestamps
    opened_at       = Column(DateTime, nullable=False,
                             default=lambda: datetime.now(timezone.utc), index=True)
    closed_at       = Column(DateTime, nullable=True)
    closed_by       = Column(String(200), nullable=True)           # admin email

    __table_args__ = (
        Index("idx_ir_phase_status",   "nist_phase", "status"),
        Index("idx_ir_severity_opened", "severity",  "opened_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id":                    self.id,
            "alert_id":              self.alert_id,
            "nist_phase":            self.nist_phase,
            "status":                self.status,
            "severity":              self.severity,
            "vector":                self.vector,
            "affected_route":        self.affected_route,
            "source_ip":             self.source_ip,
            "containment_actions":   self.containment_actions or [],
            "lessons_learned":       self.lessons_learned,
            "sast_rule_added":       self.sast_rule_added,
            "waf_signature_added":   self.waf_signature_added,
            "arch_revision_needed":  self.arch_revision_needed,
            "mttr_seconds":          self.mttr_seconds,
            "opened_at":             self.opened_at.isoformat(),
            "closed_at":             self.closed_at.isoformat() if self.closed_at else None,
            "closed_by":             self.closed_by,
        }
