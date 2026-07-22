"""
models/immutable_audit.py — Cryptographic Audit Chain (MCI Compliance)
════════════════════════════════════════════════════════════════════════
Append-only audit table with SHA-256 hash chaining for legal chain of
custody. Compliant with Marco Civil da Internet (MCI) minimum 6-month
retention requirement.

SECURITY GUARANTEE:
  Each row's content_hash = SHA256(canonical_payload + prev_hash).
  Tampering with ANY row breaks all subsequent hashes — detectable
  in O(n) by verify_chain_integrity().

ENFORCEMENT:
  - Application layer: append_audit() is the ONLY write path.
  - No UPDATE / DELETE routes are exposed.
  - PostgreSQL: DB-level triggers can be added via run_migrations() (future).
  - SQLite: Enforced by application only (acceptable for dev/staging).
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON, BigInteger, Index
from database import Base


_GENESIS_HASH = "0" * 64  # sentinel for the first row


class ImmutableAuditChain(Base):
    __tablename__ = "immutable_audit_chain"

    # Auto-incrementing sequence number is the chain key
    sequence_num  = Column(BigInteger, primary_key=True, autoincrement=True)

    # Who performed the action
    actor         = Column(String(200), nullable=False, index=True)  # email | ip | "system"

    # What happened
    action        = Column(String(100), nullable=False)   # e.g. "login", "delete_user"
    resource_type = Column(String(100), nullable=False)   # e.g. "user", "project"
    resource_id   = Column(String(200), nullable=False)   # PK of the affected resource

    # Full event snapshot — immutable forensic record
    payload       = Column(JSON, nullable=True)

    # Cryptographic chain
    prev_hash     = Column(String(64), nullable=False)    # previous row's content_hash
    content_hash  = Column(String(64), nullable=False, unique=True)  # SHA256(payload+prev_hash)

    # Timestamp (UTC only, never local time)
    signed_at     = Column(DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_audit_chain_actor",      "actor"),
        Index("idx_audit_chain_signed_at",  "signed_at"),
        Index("idx_audit_chain_action",     "action"),
    )

    def to_dict(self) -> dict:
        return {
            "sequence_num":  self.sequence_num,
            "actor":         self.actor,
            "action":        self.action,
            "resource_type": self.resource_type,
            "resource_id":   self.resource_id,
            "payload":       self.payload,
            "prev_hash":     self.prev_hash,
            "content_hash":  self.content_hash,
            "signed_at":     self.signed_at.isoformat(),
        }
