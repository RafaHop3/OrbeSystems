"""
services/ir_service.py — Incident Response Lifecycle Engine
════════════════════════════════════════════════════════════
Implements the NIST SP 800-61 Incident Response cycle:

  1. Preparation  → baseline playbooks defined, architecture mapped
  2. Detection    → SIEM/UEBA fires alert → IR record auto-opened
  3. Containment  → SOAR acts, Blue Team investigates, phase advanced
  4. Post-Incident → lessons documented → SAST/WAF retroalimentação flags set

The close_incident() call is the "elo de ouro":
  - calculates MTTR
  - writes a `post_incident_retroalimentacao` record to the immutable audit chain
  - this record carries sast_rule_added + waf_signature_added flags,
    materialising the feedback loop from production incident → Shift-Left.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from models.incident_report import (
    IncidentReport,
    PHASE_DETECTION, PHASE_CONTAINMENT, PHASE_POST_INCIDENT,
    NIST_PHASES, IR_STATUS_OPEN, IR_STATUS_CLOSED,
)

logger = logging.getLogger("orbe.ir")


# ── Risk-Based Severity → SLA hours mapping ────────────────────────────────
_SLA_HOURS = {
    "CRITICAL": 4,
    "HIGH":     24,
    "MEDIUM":   168,   # 7 days
    "LOW":      720,   # 30 days
}


def open_incident(db: Session, alert) -> IncidentReport:
    """
    Auto-create an IR record from a SecurityAlert.
    Called by soar_service.run_playbook() after containment actions fire.
    Phase starts at DETECTION (phase 2 — the alert was already detected).
    """
    try:
        # Avoid duplicate IR records for the same alert
        existing = db.query(IncidentReport).filter(
            IncidentReport.alert_id == str(alert.id),
            IncidentReport.status   == IR_STATUS_OPEN,
        ).first()
        if existing:
            logger.debug(f"[IR] Incident already open for alert {alert.id}")
            return existing

        # Extract SOAR containment actions from alert context if available
        ctx = alert.context or {}
        actions = []
        if ctx.get("playbook"):
            actions.append({
                "action":    f"soar_playbook:{ctx['playbook']}",
                "ts":        datetime.now(timezone.utc).isoformat(),
                "automated": True,
            })
        if ctx.get("ip_blocked"):
            actions.append({
                "action": "block_ip",
                "ip":     alert.source_ip,
                "ts":     datetime.now(timezone.utc).isoformat(),
            })
        if ctx.get("session_terminated"):
            actions.append({
                "action":     "terminate_session",
                "session_id": alert.session_id,
                "ts":         datetime.now(timezone.utc).isoformat(),
            })

        incident = IncidentReport(
            alert_id            = str(alert.id),
            nist_phase          = PHASE_DETECTION,
            status              = IR_STATUS_OPEN,
            severity            = alert.severity,
            source_ip           = alert.source_ip,
            vector              = alert.rule_name,
            affected_route      = (alert.context or {}).get("path"),
            containment_actions = actions,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        logger.warning(
            f"[IR] Incident opened — id={incident.id} "
            f"alert={alert.id} severity={alert.severity} "
            f"vector={alert.rule_name}"
        )
        return incident

    except Exception as e:
        logger.error(f"[IR] open_incident failed: {e}")
        db.rollback()
        raise


def advance_phase(
    db:          Session,
    incident_id: str,
    new_phase:   str,
    notes:       Optional[str] = None,
    analyst:     Optional[str] = None,
    extra_actions: Optional[List[dict]] = None,
) -> IncidentReport:
    """
    Advance the NIST phase of an open incident.
    Validates phase ordering (can only move forward).
    """
    incident = db.query(IncidentReport).filter(
        IncidentReport.id == incident_id
    ).first()
    if not incident:
        raise ValueError(f"Incident {incident_id} not found")
    if incident.status == IR_STATUS_CLOSED:
        raise ValueError("Cannot advance a closed incident")

    current_idx = NIST_PHASES.index(incident.nist_phase) if incident.nist_phase in NIST_PHASES else 0
    new_idx     = NIST_PHASES.index(new_phase)             if new_phase in NIST_PHASES           else -1

    if new_idx < 0:
        raise ValueError(f"Invalid NIST phase: {new_phase}. Must be one of {NIST_PHASES}")
    if new_idx <= current_idx:
        raise ValueError(
            f"Phase '{new_phase}' is not ahead of current phase '{incident.nist_phase}'. "
            "Incident phases can only advance forward."
        )

    # Append analyst note to containment_actions log
    actions = list(incident.containment_actions or [])
    entry = {
        "action":  f"phase_advance:{incident.nist_phase}→{new_phase}",
        "ts":      datetime.now(timezone.utc).isoformat(),
        "analyst": analyst or "admin",
    }
    if notes:
        entry["notes"] = notes
    if extra_actions:
        actions.extend(extra_actions)
    actions.append(entry)

    incident.nist_phase          = new_phase
    incident.containment_actions = actions
    db.commit()
    db.refresh(incident)

    logger.info(
        f"[IR] Phase advanced — incident={incident_id} "
        f"phase={new_phase} analyst={analyst}"
    )
    return incident


def close_incident(
    db:                    Session,
    incident_id:           str,
    admin:                 str,
    lessons_learned:       Optional[str]  = None,
    sast_rule_added:       bool           = False,
    waf_signature_added:   bool           = False,
    arch_revision_needed:  bool           = False,
) -> IncidentReport:
    """
    Close an IR record.
    - Calculates MTTR (opened_at → now)
    - Sets post_incident phase
    - Writes a retroalimentação entry to the immutable audit chain
      with the Shift-Left flags (sast_rule_added, waf_signature_added)

    This is the 'elo de ouro' that closes the NIST cycle:
    production incident → intelligence → pipeline hardening.
    """
    incident = db.query(IncidentReport).filter(
        IncidentReport.id == incident_id
    ).first()
    if not incident:
        raise ValueError(f"Incident {incident_id} not found")
    if incident.status == IR_STATUS_CLOSED:
        raise ValueError("Incident is already closed")

    now  = datetime.now(timezone.utc)
    mttr = int((now - incident.opened_at.replace(tzinfo=timezone.utc)).total_seconds())

    incident.nist_phase           = PHASE_POST_INCIDENT
    incident.status               = IR_STATUS_CLOSED
    incident.closed_at            = now
    incident.closed_by            = admin
    incident.mttr_seconds         = mttr
    incident.lessons_learned      = lessons_learned
    incident.sast_rule_added      = sast_rule_added
    incident.waf_signature_added  = waf_signature_added
    incident.arch_revision_needed = arch_revision_needed

    db.commit()
    db.refresh(incident)

    # ── Retroalimentação: write to immutable audit chain ─────────────────
    try:
        from services.audit_chain_service import append_audit
        append_audit(
            db            = db,
            actor         = admin,
            action        = "post_incident_retroalimentacao",
            resource_type = "incident_report",
            resource_id   = incident_id,
            payload       = {
                "alert_id":             incident.alert_id,
                "severity":             incident.severity,
                "vector":               incident.vector,
                "affected_route":       incident.affected_route,
                "mttr_seconds":         mttr,
                "lessons_learned":      lessons_learned,
                "sast_rule_added":      sast_rule_added,       # → Semgrep/Bandit
                "waf_signature_added":  waf_signature_added,   # → WAF rule
                "arch_revision_needed": arch_revision_needed,  # → Architecture review
                "shift_left_feedback":  (sast_rule_added or waf_signature_added),
            },
        )
        logger.info(
            f"[IR] Retroalimentação recorded — incident={incident_id} "
            f"sast={sast_rule_added} waf={waf_signature_added} "
            f"mttr={mttr}s"
        )
    except Exception as e:
        logger.error(f"[IR] Failed to write retroalimentação to audit chain: {e}")

    logger.warning(
        f"[IR] Incident closed — id={incident_id} "
        f"by={admin} mttr={mttr}s "
        f"sast_rule={sast_rule_added} waf_sig={waf_signature_added}"
    )
    return incident


def get_mttr_stats(db: Session, days: int = 30) -> dict:
    """
    Aggregate IR KPI metrics:
    - Total open / closed incidents
    - Average MTTR for closed incidents in the window
    - Retroalimentação impact: how many incidents generated SAST/WAF updates
    """
    from datetime import timedelta
    start = datetime.now(timezone.utc) - timedelta(days=days)
    base  = db.query(IncidentReport).filter(IncidentReport.opened_at >= start)

    total_open   = base.filter(IncidentReport.status == IR_STATUS_OPEN).count()
    total_closed = base.filter(IncidentReport.status == IR_STATUS_CLOSED).count()

    closed_q = base.filter(
        IncidentReport.status      == IR_STATUS_CLOSED,
        IncidentReport.mttr_seconds.isnot(None),
    )
    avg_mttr_row = closed_q.with_entities(func.avg(IncidentReport.mttr_seconds)).scalar()
    avg_mttr     = round(float(avg_mttr_row), 1) if avg_mttr_row else None

    sast_count = base.filter(IncidentReport.sast_rule_added == True).count()
    waf_count  = base.filter(IncidentReport.waf_signature_added == True).count()

    critical_open = base.filter(
        IncidentReport.status   == IR_STATUS_OPEN,
        IncidentReport.severity == "CRITICAL",
    ).count()

    sla_stats = {}
    for severity, sla_h in _SLA_HOURS.items():
        sla_stats[severity.lower()] = {
            "sla_hours": sla_h,
            "open":      base.filter(
                IncidentReport.status   == IR_STATUS_OPEN,
                IncidentReport.severity == severity,
            ).count(),
        }

    return {
        "period_days":     days,
        "total_open":      total_open,
        "total_closed":    total_closed,
        "critical_open":   critical_open,
        "avg_mttr_seconds": avg_mttr,
        "avg_mttr_human":  _format_mttr(avg_mttr),
        "retroalimentacao": {
            "sast_rules_generated": sast_count,
            "waf_signatures_generated": waf_count,
            "total_shift_left_updates": sast_count + waf_count,
        },
        "sla": sla_stats,
    }


def _format_mttr(seconds: Optional[float]) -> Optional[str]:
    if seconds is None:
        return None
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m {s % 60}s"
    h = s // 3600
    m = (s % 3600) // 60
    return f"{h}h {m}m"
