"""
services/audit_chain_service.py — Cryptographic Audit Chain Service
════════════════════════════════════════════════════════════════════
Provides the ONLY write path to the immutable_audit_chain table.
Enforces hash-chain integrity: every new row includes the SHA-256
of the previous row's content_hash in its own hash computation.

MCI Compliance note:
  Records must be retained for at least 6 months.
  verify_chain_integrity() can be called by a daily scheduled job
  to prove non-tampering.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.immutable_audit import ImmutableAuditChain, _GENESIS_HASH

logger = logging.getLogger("orbe.audit_chain")

# ── Canonical payload serialisation ──────────────────────────────────────────

def _canonical(payload: dict | None, prev_hash: str, actor: str, action: str,
               resource_type: str, resource_id: str, signed_at: str) -> bytes:
    """
    Deterministic JSON encoding for hash computation.
    Sort keys to prevent ordering attacks.
    """
    obj = {
        "actor":         actor,
        "action":        action,
        "resource_type": resource_type,
        "resource_id":   resource_id,
        "payload":       payload or {},
        "prev_hash":     prev_hash,
        "signed_at":     signed_at,
    }
    return json.dumps(obj, sort_keys=True, ensure_ascii=True, default=str).encode("utf-8")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ── Public API ────────────────────────────────────────────────────────────────

def append_audit(
    db: Session,
    actor: str,
    action: str,
    resource_type: str,
    resource_id: str,
    payload: Optional[dict] = None,
) -> ImmutableAuditChain:
    """
    Appends one event to the immutable audit chain.
    Uses SELECT ... FOR UPDATE (serialised) to prevent race conditions
    on concurrent writes that would break the hash chain.

    Returns the newly created row.
    """
    signed_at = datetime.now(timezone.utc)
    signed_at_iso = signed_at.isoformat()

    try:
        # Fetch the last hash in the chain (serialised to prevent races)
        last_row = (
            db.query(ImmutableAuditChain)
            .order_by(ImmutableAuditChain.sequence_num.desc())
            .with_for_update()
            .first()
        )
        prev_hash = last_row.content_hash if last_row else _GENESIS_HASH

        # Compute content hash
        canonical = _canonical(
            payload, prev_hash, actor, action, resource_type, resource_id, signed_at_iso
        )
        content_hash = _sha256(canonical)

        row = ImmutableAuditChain(
            actor         = actor,
            action        = action,
            resource_type = resource_type,
            resource_id   = resource_id,
            payload       = payload or {},
            prev_hash     = prev_hash,
            content_hash  = content_hash,
            signed_at     = signed_at,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

        logger.info(
            f"[AuditChain] seq={row.sequence_num} actor={actor} "
            f"action={action} hash={content_hash[:12]}..."
        )
        return row

    except Exception as e:
        logger.error(f"[AuditChain] append_audit failed: {e}")
        db.rollback()
        raise


def verify_chain_integrity(
    db: Session,
    from_seq: int = 0,
) -> Tuple[bool, int]:
    """
    Scans all rows from `from_seq` onwards and recomputes hashes.
    Returns (is_valid, first_broken_seq).
    first_broken_seq == -1 means the chain is intact.

    Complexity: O(n) — suitable for scheduled nightly jobs.
    """
    rows = (
        db.query(ImmutableAuditChain)
        .filter(ImmutableAuditChain.sequence_num >= from_seq)
        .order_by(ImmutableAuditChain.sequence_num.asc())
        .all()
    )

    if not rows:
        return (True, -1)

    expected_prev = _GENESIS_HASH if rows[0].sequence_num == 1 else None

    for i, row in enumerate(rows):
        # Verify prev_hash linkage (skip genesis row on first iteration if unknown)
        if expected_prev is not None and row.prev_hash != expected_prev:
            logger.error(
                f"[AuditChain] Chain broken at seq={row.sequence_num}: "
                f"expected prev_hash={expected_prev[:12]}... "
                f"got {row.prev_hash[:12]}..."
            )
            return (False, row.sequence_num)

        # Recompute content_hash
        canonical = _canonical(
            row.payload,
            row.prev_hash,
            row.actor,
            row.action,
            row.resource_type,
            row.resource_id,
            row.signed_at.isoformat(),
        )
        expected_hash = _sha256(canonical)

        if row.content_hash != expected_hash:
            logger.error(
                f"[AuditChain] Tampered row at seq={row.sequence_num}: "
                f"expected hash={expected_hash[:12]}... "
                f"got {row.content_hash[:12]}..."
            )
            return (False, row.sequence_num)

        expected_prev = row.content_hash

    logger.info(f"[AuditChain] Integrity verified — {len(rows)} rows are intact.")
    return (True, -1)


def get_audit_window(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    actor: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> List[dict]:
    """
    Export audit records for a time window — used for MCI compliance reports.
    Default window: last 6 months.
    """
    if start_date is None:
        start_date = datetime.now(timezone.utc) - timedelta(days=183)
    if end_date is None:
        end_date = datetime.now(timezone.utc)

    q = (
        db.query(ImmutableAuditChain)
        .filter(
            ImmutableAuditChain.signed_at >= start_date,
            ImmutableAuditChain.signed_at <= end_date,
        )
        .order_by(ImmutableAuditChain.sequence_num.asc())
    )
    if actor:
        q = q.filter(ImmutableAuditChain.actor == actor)
    if action:
        q = q.filter(ImmutableAuditChain.action == action)

    total = q.count()
    rows  = q.offset(offset).limit(limit).all()
    return {"total": total, "records": [r.to_dict() for r in rows]}
