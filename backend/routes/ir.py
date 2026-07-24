"""
routes/ir.py — Incident Response & Vulnerability Management
════════════════════════════════════════════════════════════
Admin-protected endpoints implementing the NIST SP 800-61 cycle.

Endpoints:
  GET    /api/ir/incidents                  → list incidents
  GET    /api/ir/incidents/{id}             → incident detail
  POST   /api/ir/incidents/{id}/advance     → advance NIST phase
  POST   /api/ir/incidents/{id}/close       → close + retroalimentação
  GET    /api/ir/metrics                    → MTTR + KPI dashboard
  GET    /api/ir/vulnerabilities            → risk-based vuln list
  POST   /api/ir/vulnerabilities/{vulnid}/prioritize → set risk priority
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from security.auth import get_current_admin_user
from database import get_db
from models.incident_report import (
    IncidentReport, NIST_PHASES,
    IR_STATUS_OPEN, IR_STATUS_CLOSED,
)
from services.ir_service import (
    advance_phase, close_incident, get_mttr_stats,
)

router  = APIRouter()
logger  = logging.getLogger("orbe.ir.routes")


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class AdvancePhaseRequest(BaseModel):
    phase:         str
    notes:         Optional[str] = None
    extra_actions: Optional[List[dict]] = None


class CloseIncidentRequest(BaseModel):
    lessons_learned:       Optional[str]  = None
    sast_rule_added:       bool           = False
    waf_signature_added:   bool           = False
    arch_revision_needed:  bool           = False


class PrioritizeVulnRequest(BaseModel):
    risk_priority:  str            # CRITICAL / HIGH / MEDIUM / LOW
    sla_deadline:   Optional[str]  = None   # ISO datetime string
    notes:          Optional[str]  = None
    assigned_to:    Optional[str]  = None


# ── Incidents ─────────────────────────────────────────────────────────────────

@router.get("/incidents")
async def list_incidents(
    status:    Optional[str] = Query(default=None, pattern="^(open|closed)$"),
    severity:  Optional[str] = Query(default=None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    phase:     Optional[str] = Query(default=None),
    limit:     int           = Query(default=50, ge=1, le=500),
    offset:    int           = Query(default=0,  ge=0),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    List IR incidents with optional filtering.
    Returns newest-first by default.
    """
    q = db.query(IncidentReport).order_by(IncidentReport.opened_at.desc())

    if status:
        q = q.filter(IncidentReport.status == status)
    if severity:
        q = q.filter(IncidentReport.severity == severity)
    if phase:
        if phase not in NIST_PHASES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid phase. Must be one of: {NIST_PHASES}"
            )
        q = q.filter(IncidentReport.nist_phase == phase)

    total     = q.count()
    incidents = q.offset(offset).limit(limit).all()

    return {
        "total":     total,
        "incidents": [i.to_dict() for i in incidents],
    }


@router.get("/incidents/{incident_id}")
async def get_incident(
    incident_id: str,
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single incident by ID including full forensic context."""
    incident = db.query(IncidentReport).filter(
        IncidentReport.id == incident_id
    ).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident.to_dict()


@router.post("/incidents/{incident_id}/advance")
async def advance_incident_phase(
    incident_id: str,
    body:        AdvancePhaseRequest,
    admin: str   = Depends(get_current_admin_user),
    db: Session  = Depends(get_db),
):
    """
    Advance the NIST phase of an open incident.
    Phases must move forward: detection → containment → post_incident.

    Example:
      POST /api/ir/incidents/{id}/advance
      {"phase": "containment", "notes": "IP bloqueado via SOAR. Sessão encerrada."}
    """
    try:
        incident = advance_phase(
            db          = db,
            incident_id = incident_id,
            new_phase   = body.phase,
            notes       = body.notes,
            analyst     = admin,
            extra_actions = body.extra_actions,
        )
        return {
            "message":  f"Incident advanced to '{body.phase}' phase",
            "incident": incident.to_dict(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/incidents/{incident_id}/close")
async def close_incident_endpoint(
    incident_id: str,
    body:        CloseIncidentRequest,
    admin: str   = Depends(get_current_admin_user),
    db: Session  = Depends(get_db),
):
    """
    Close an incident and trigger the retroalimentação cycle.

    This is the 'elo de ouro' endpoint:
    - Calculates MTTR
    - Records lessons learned
    - Sets Shift-Left flags (sast_rule_added, waf_signature_added)
    - Writes a `post_incident_retroalimentacao` entry to the immutable audit chain

    The attack of today becomes the rule of tomorrow.

    Example:
      POST /api/ir/incidents/{id}/close
      {
        "lessons_learned": "Rota /api/data não validava input. SQL injection possível.",
        "sast_rule_added": true,
        "waf_signature_added": true
      }
    """
    try:
        incident = close_incident(
            db                   = db,
            incident_id          = incident_id,
            admin                = admin,
            lessons_learned      = body.lessons_learned,
            sast_rule_added      = body.sast_rule_added,
            waf_signature_added  = body.waf_signature_added,
            arch_revision_needed = body.arch_revision_needed,
        )
        return {
            "message":  "Incident closed. Retroalimentação recorded in audit chain.",
            "incident": incident.to_dict(),
            "retroalimentacao": {
                "sast_rule_added":      body.sast_rule_added,
                "waf_signature_added":  body.waf_signature_added,
                "arch_revision_needed": body.arch_revision_needed,
                "shift_left_activated": body.sast_rule_added or body.waf_signature_added,
                "audit_chain_entry":    "post_incident_retroalimentacao",
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── IR Metrics (KPI Dashboard) ────────────────────────────────────────────────

@router.get("/metrics")
async def ir_metrics(
    days:    int     = Query(default=30, ge=1, le=365),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    IR KPI dashboard:
    - Total open / closed incidents
    - Average MTTR (Mean Time To Recovery)
    - Retroalimentação impact: SAST rules + WAF signatures generated
    - SLA compliance by severity tier

    Risk-Based SLA thresholds:
      CRITICAL → 4h | HIGH → 24h | MEDIUM → 7d | LOW → 30d
    """
    return get_mttr_stats(db, days=days)


# ── Risk-Based Vulnerability Management ───────────────────────────────────────

# In-memory vuln registry — populated by SBOM/SAST findings imports.
# In a full implementation this would be a DB table (VulnerabilityFinding).
# For now it returns the current SBOM + annotated SAST severity tiers.
_VULN_REGISTRY: List[dict] = []


@router.get("/vulnerabilities")
async def list_vulnerabilities(
    priority:  Optional[str] = Query(default=None, pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$"),
    source:    Optional[str] = Query(default=None, pattern="^(sast|sbom|dast|manual)$"),
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Risk-Based Vulnerability list.

    Priority is NOT just CVSS score — it considers exploitability context:
      A MEDIUM vuln on an exposed public API > CRITICAL on an isolated server.

    Sources: SAST (Bandit/Semgrep), SBOM (CycloneDX), DAST, manual pentest.
    """
    vulns = list(_VULN_REGISTRY)

    if priority:
        vulns = [v for v in vulns if v.get("risk_priority") == priority]
    if source:
        vulns = [v for v in vulns if v.get("source") == source]

    # Enrich with SLA deadline info
    from services.ir_service import _SLA_HOURS
    for v in vulns:
        sla_h = _SLA_HOURS.get(v.get("risk_priority", "LOW"), 720)
        v["sla_hours"] = sla_h

    return {
        "total": len(vulns),
        "risk_model": (
            "Risk-Based Vulnerability Management: priority considers "
            "exposure context (public API >> isolated server), CVSS score, "
            "and EPSS exploitation probability."
        ),
        "sla_policy": {
            "CRITICAL": "4 hours",
            "HIGH":     "24 hours",
            "MEDIUM":   "7 days",
            "LOW":      "30 days",
        },
        "vulnerabilities": vulns,
    }


@router.post("/vulnerabilities/{vuln_id}/prioritize")
async def prioritize_vulnerability(
    vuln_id: str,
    body:    PrioritizeVulnRequest,
    admin: str  = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Set or update the risk priority and SLA deadline for a vulnerability.
    Priority must be driven by context — not just by CVSS score alone.

    Example: A CVE with CVSS 7.0 + EPSS 0.95 (active exploit in the wild)
    should be prioritized over CVSS 9.5 + EPSS 0.01.
    """
    # Find and update in registry
    for v in _VULN_REGISTRY:
        if v.get("id") == vuln_id:
            v["risk_priority"] = body.risk_priority
            v["sla_deadline"]  = body.sla_deadline
            v["notes"]         = body.notes
            v["assigned_to"]   = body.assigned_to
            v["prioritized_by"] = admin
            v["prioritized_at"] = datetime.now(timezone.utc).isoformat()

            # Record the prioritization decision in the audit chain
            try:
                from services.audit_chain_service import append_audit
                append_audit(
                    db            = db,
                    actor         = admin,
                    action        = "vulnerability_prioritized",
                    resource_type = "vulnerability",
                    resource_id   = vuln_id,
                    payload       = {
                        "risk_priority": body.risk_priority,
                        "sla_deadline":  body.sla_deadline,
                        "assigned_to":   body.assigned_to,
                        "notes":         body.notes,
                    },
                )
            except Exception as e:
                logger.warning(f"[IR] Failed to audit vuln prioritization: {e}")

            return {"message": "Vulnerability prioritized", "vulnerability": v}

    raise HTTPException(
        status_code=404,
        detail=f"Vulnerability '{vuln_id}' not found in registry. "
               "Import findings from SBOM or SAST first."
    )


@router.post("/vulnerabilities/import")
async def import_vulnerability(
    vuln:  dict,
    admin: str  = Depends(get_current_admin_user),
):
    """
    Manually register a vulnerability finding into the risk registry.
    In production, this is called automatically by the CI/CD pipeline
    after each Bandit / Semgrep / Trivy scan.

    Expected payload:
    {
      "id": "CVE-2024-XXXX",
      "title": "SQL Injection in /api/data",
      "source": "sast",         // sast | sbom | dast | manual
      "cvss_score": 7.5,
      "epss_probability": 0.82, // 0-1, from exploit prediction scoring
      "affected_component": "routes/data.py:L42",
      "risk_priority": "HIGH"   // override based on context
    }
    """
    from uuid import uuid4
    if "id" not in vuln:
        vuln["id"] = str(uuid4())
    vuln["imported_by"] = admin
    vuln["imported_at"] = datetime.now(timezone.utc).isoformat()
    _VULN_REGISTRY.append(vuln)
    return {"message": "Vulnerability registered", "id": vuln["id"]}
