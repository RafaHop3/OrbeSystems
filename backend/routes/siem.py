"""
routes/siem.py — SIEM Export & Alert Management
════════════════════════════════════════════════
Admin-protected endpoints for exporting visit logs in SIEM formats
(JSON, CEF, LEEF), managing security alerts, and testing webhook delivery.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from security.auth import get_current_admin_user
from database import get_db
from models.analytics import VisitLog
from models.security_alert import SecurityAlert, STATUS_ACKNOWLEDGED, STATUS_RESOLVED
from services.siem_service import (
    format_cef, format_leef, format_json_siem,
    dispatch_webhook, create_alert,
)
from config import settings

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    rule_name: str
    severity: str
    status: str
    source_ip: Optional[str]
    session_id: Optional[str]
    visit_log_id: Optional[str]
    context: Optional[dict]
    triggered_at: str
    acknowledged_at: Optional[str]
    resolved_at: Optional[str]
    resolved_by: Optional[str]


class ResolveRequest(BaseModel):
    resolved_by: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _visits_to_dicts(visits: List[VisitLog]) -> List[dict]:
    """Convert SQLAlchemy objects to plain dicts with optional new fields."""
    rows = []
    for v in visits:
        d = v.to_dict()
        # Attach new nullable columns (may not exist on older rows)
        d["risk_score"]       = getattr(v, "risk_score", None)
        d["threat_tags"]      = getattr(v, "threat_tags", None) or []
        d["session_duration"] = getattr(v, "session_duration", None)
        rows.append(d)
    return rows


# ── Export Endpoint ───────────────────────────────────────────────────────────

@router.get("/export")
async def export_siem_logs(
    format: str = Query(default="json", pattern="^(json|cef|leef)$"),
    days: int   = Query(default=7,  ge=1, le=90),
    limit: int  = Query(default=500, ge=1, le=5000),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Bulk-export visit logs in the requested SIEM format.
    - **json** → enriched JSON array (ELK / Azure Sentinel)
    - **cef**  → newline-delimited CEF 0 strings (Splunk / ArcSight)
    - **leef** → newline-delimited LEEF 1.0 strings (IBM QRadar)
    """
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    visits = (
        db.query(VisitLog)
        .filter(VisitLog.timestamp >= start_date)
        .order_by(VisitLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    rows = _visits_to_dicts(visits)

    if format == "cef":
        body = "\n".join(format_cef(r) for r in rows)
        return PlainTextResponse(content=body, media_type="text/plain")

    if format == "leef":
        body = "\n".join(format_leef(r) for r in rows)
        return PlainTextResponse(content=body, media_type="text/plain")

    # Default: JSON
    return {
        "format":       "json",
        "count":        len(rows),
        "period_days":  days,
        "events":       [format_json_siem(r) for r in rows],
    }


# ── Alert Listing ─────────────────────────────────────────────────────────────

@router.get("/alerts")
async def list_alerts(
    status:   Optional[str] = Query(default=None, pattern="^(open|acknowledged|resolved)$"),
    severity: Optional[str] = Query(default=None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    limit:    int           = Query(default=50, ge=1, le=500),
    offset:   int           = Query(default=0,  ge=0),
    admin: str              = Depends(get_current_admin_user),
    db: Session             = Depends(get_db),
):
    """
    Paginated alert list with optional filtering by status and severity.
    Default: open alerts first, ordered by triggered_at descending.
    """
    q = db.query(SecurityAlert).order_by(SecurityAlert.triggered_at.desc())

    if status:
        q = q.filter(SecurityAlert.status == status)
    if severity:
        q = q.filter(SecurityAlert.severity == severity)

    total   = q.count()
    alerts  = q.offset(offset).limit(limit).all()

    return {
        "total":  total,
        "alerts": [a.to_dict() for a in alerts],
    }


# ── Alert Acknowledge ─────────────────────────────────────────────────────────

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Mark an alert as acknowledged (being investigated)."""
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != "open":
        raise HTTPException(status_code=400, detail=f"Alert is already '{alert.status}'")

    alert.status         = STATUS_ACKNOWLEDGED
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return {"message": "Alert acknowledged", "alert": alert.to_dict()}


# ── Alert Resolve ─────────────────────────────────────────────────────────────

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    body: ResolveRequest,
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Mark an alert as resolved."""
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert is already resolved")

    alert.status      = STATUS_RESOLVED
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = body.resolved_by or admin
    db.commit()
    db.refresh(alert)
    return {"message": "Alert resolved", "alert": alert.to_dict()}


# ── Alert Stats ───────────────────────────────────────────────────────────────

@router.get("/alerts/stats")
async def alert_stats(
    days: int   = Query(default=7, ge=1, le=90),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Summary counts for the security dashboard KPIs."""
    start = datetime.now(timezone.utc) - timedelta(days=days)
    base  = db.query(SecurityAlert).filter(SecurityAlert.triggered_at >= start)

    return {
        "period_days": days,
        "total":       base.count(),
        "open":        base.filter(SecurityAlert.status == "open").count(),
        "critical":    base.filter(SecurityAlert.severity == "CRITICAL").count(),
        "high":        base.filter(SecurityAlert.severity == "HIGH").count(),
        "medium":      base.filter(SecurityAlert.severity == "MEDIUM").count(),
        "low":         base.filter(SecurityAlert.severity == "LOW").count(),
        "resolved":    base.filter(SecurityAlert.status == "resolved").count(),
    }


# ── Webhook Test ──────────────────────────────────────────────────────────────

@router.post("/webhook/test")
async def test_webhook(
    admin: str = Depends(get_current_admin_user),
):
    """
    Sends a synthetic test event to the configured SIEM_WEBHOOK_URL.
    Useful to validate connectivity and HMAC signature verification.
    """
    if not settings.SIEM_WEBHOOK_URL:
        raise HTTPException(
            status_code=400,
            detail="SIEM_WEBHOOK_URL is not configured. Set it in your environment variables.",
        )

    test_payload = {
        "alert_type":  "webhook_test",
        "severity":    "LOW",
        "message":     "OrbeSystems SIEM webhook connectivity test",
        "source":      "orbe-systems-api",
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }

    success = await dispatch_webhook(settings.SIEM_WEBHOOK_URL, test_payload)

    if success:
        return {"status": "delivered", "webhook_url": settings.SIEM_WEBHOOK_URL[:30] + "..."}
    raise HTTPException(
        status_code=502,
        detail="Webhook delivery failed. Check SIEM_WEBHOOK_URL and network connectivity.",
    )
