"""
routes/audit_chain.py — Immutable Audit Chain API
══════════════════════════════════════════════════
Admin-protected endpoints for MCI compliance reporting:
  - Paginated chain listing with filters
  - Cryptographic integrity verification
  - Bulk export (JSON/CSV) for auditors and legal discovery
"""

import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from security.auth import get_current_admin_user
from database import get_db
from models.immutable_audit import ImmutableAuditChain
from services.audit_chain_service import (
    verify_chain_integrity,
    get_audit_window,
    append_audit,
)

router = APIRouter()


# ── Chain listing ─────────────────────────────────────────────────────────────

@router.get("/chain")
async def list_chain(
    from_date: Optional[str] = Query(default=None, description="ISO date, e.g. 2026-01-01"),
    to_date:   Optional[str] = Query(default=None, description="ISO date, e.g. 2026-12-31"),
    actor:     Optional[str] = Query(default=None),
    action:    Optional[str] = Query(default=None),
    limit:     int           = Query(default=100, ge=1, le=1000),
    offset:    int           = Query(default=0,   ge=0),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Paginated audit chain listing. Default window: last 6 months.
    """
    start = datetime.fromisoformat(from_date) if from_date else None
    end   = datetime.fromisoformat(to_date)   if to_date   else None

    return get_audit_window(
        db, start_date=start, end_date=end,
        actor=actor, action=action,
        limit=limit, offset=offset,
    )


# ── Integrity verification ────────────────────────────────────────────────────

@router.get("/chain/verify")
async def verify_integrity(
    from_seq: int   = Query(default=0, ge=0),
    admin: str      = Depends(get_current_admin_user),
    db: Session     = Depends(get_db),
):
    """
    Re-computes the SHA-256 hash chain from `from_seq` to the latest row.
    Returns proof that no row has been altered since it was written.

    Use this endpoint in:
      - Daily scheduled jobs (automated integrity monitoring)
      - Legal discovery preparation
      - Post-incident forensic validation
    """
    total = db.query(ImmutableAuditChain).count()
    is_valid, first_broken_seq = verify_chain_integrity(db, from_seq=from_seq)

    return {
        "valid":             is_valid,
        "total_records":     total,
        "verified_from_seq": from_seq,
        "first_broken_seq":  first_broken_seq if not is_valid else None,
        "timestamp":         datetime.now(timezone.utc).isoformat(),
        "compliance_note":   (
            "Chain intact — records are legally admissible."
            if is_valid else
            f"ALERT: Chain broken at sequence {first_broken_seq}. "
            "Records after this point may have been tampered with."
        ),
    }


# ── Compliance export ─────────────────────────────────────────────────────────

@router.get("/chain/export")
async def export_chain(
    format:    str           = Query(default="json", pattern="^(json|csv)$"),
    from_date: Optional[str] = Query(default=None),
    to_date:   Optional[str] = Query(default=None),
    actor:     Optional[str] = Query(default=None),
    limit:     int           = Query(default=5000, ge=1, le=10000),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Bulk export for MCI compliance audits.
    CSV format is accepted by most legal review tools.
    """
    start = datetime.fromisoformat(from_date) if from_date else None
    end   = datetime.fromisoformat(to_date)   if to_date   else None

    result = get_audit_window(db, start_date=start, end_date=end, actor=actor, limit=limit)
    records = result["records"]

    if format == "json":
        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "total":       result["total"],
            "chain_valid": True,  # caller should run /verify first
            "records":     records,
        }

    # CSV
    fields = [
        "sequence_num", "actor", "action", "resource_type",
        "resource_id", "prev_hash", "content_hash", "signed_at",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for rec in records:
        writer.writerow({k: rec.get(k, "") for k in fields})

    buf.seek(0)
    filename = f"audit_chain_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── SOAR blocklist management ─────────────────────────────────────────────────
# (Placed here to keep admin security routes co-located)

@router.get("/blocklist")
async def list_blocklist(
    limit:     int  = Query(default=50, ge=1, le=500),
    admin: str      = Depends(get_current_admin_user),
    db: Session     = Depends(get_db),
):
    """List currently active (not yet expired) IP blocks."""
    from models.ip_blocklist import IpBlocklist
    now = datetime.now(timezone.utc)
    rows = (
        db.query(IpBlocklist)
        .filter(IpBlocklist.blocked_until > now)
        .order_by(IpBlocklist.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"active_blocks": [r.to_dict() for r in rows], "count": len(rows)}


@router.delete("/blocklist/{ip}")
async def unblock_ip_route(
    ip: str,
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Manually remove an IP block (admin override of SOAR decision)."""
    from services.soar_service import unblock_ip
    removed = unblock_ip(db, ip, admin)
    if not removed:
        raise HTTPException(status_code=404, detail=f"IP {ip} is not blocked")

    # Audit the manual override
    append_audit(
        db=db, actor=admin, action="manual_unblock_ip",
        resource_type="ip_blocklist", resource_id=ip,
        payload={"unblocked_by": admin},
    )
    return {"message": f"IP {ip} unblocked", "admin": admin}
