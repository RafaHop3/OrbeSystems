"""
services/soar_service.py — SOAR Automated Response Engine
══════════════════════════════════════════════════════════
Security Orchestration, Automation, and Response.

Playbooks (application-layer — no WAF/CDN required):
  - rate_abuse_block:    Block IP for 1 hour after rate_abuse detection
  - path_enum_block:     Block IP + terminate session after path enumeration
  - auth_bruteforce_block: Block IP for 1 hour after 5 failed auth attempts
  - escalation_webhook:  Webhook for CRITICAL alerts open > 30 min

PERFORMANCE NOTE:
  is_ip_blocked() uses an in-process TTL cache to avoid a DB query
  on every request. Cache is invalidated when block_ip() is called.
  Cache TTL = 60 seconds (safe lag for automated unblocking).
"""

import asyncio
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from models.ip_blocklist import IpBlocklist
from models.analytics import ActiveSession
from database import get_db
from config import settings

logger = logging.getLogger("orbe.soar")

# ── In-process TTL cache ──────────────────────────────────────────────────────
# {ip: expiry_epoch_float}  — populated from DB on first check, refreshed every 60s
_block_cache: dict[str, float] = {}
_cache_built_at: float = 0.0
_CACHE_TTL_SECONDS = 60


def _refresh_cache_if_stale(db: Session) -> None:
    """Reload all active blocks from DB into the in-process cache."""
    global _block_cache, _cache_built_at

    now = time.time()
    if now - _cache_built_at < _CACHE_TTL_SECONDS:
        return  # Cache still fresh

    try:
        active_blocks = (
            db.query(IpBlocklist)
            .filter(IpBlocklist.blocked_until > datetime.now(timezone.utc))
            .all()
        )
        _block_cache = {
            b.ip: b.blocked_until.timestamp() for b in active_blocks
        }
        _cache_built_at = now
        logger.debug(f"[SOAR] Cache refreshed — {len(_block_cache)} active blocks")
    except Exception as e:
        logger.warning(f"[SOAR] Cache refresh failed: {e}")


def is_ip_blocked(ip: str) -> bool:
    """
    Fast check — uses in-process cache to avoid DB I/O on every request.
    A DB session is needed only when the cache is stale.
    """
    now = time.time()

    # Check cache first without a DB call
    if ip in _block_cache:
        if _block_cache[ip] > now:
            return True
        else:
            del _block_cache[ip]  # Expired block — evict from cache
            return False

    # Cache miss: refresh from DB only if cache is stale
    if now - _cache_built_at >= _CACHE_TTL_SECONDS:
        db = next(get_db())
        try:
            _refresh_cache_if_stale(db)
        finally:
            db.close()

    return _block_cache.get(ip, 0.0) > now


def block_ip(
    db: Session,
    ip: str,
    reason: str,
    hours: int = 1,
    playbook: Optional[str] = None,
    created_by: str = "soar_engine",
) -> IpBlocklist:
    """
    Block an IP for `hours` hours. Invalidates the in-process cache entry.
    Upserts: if the IP is already blocked, extends the expiry.
    """
    global _block_cache, _cache_built_at

    expiry = datetime.now(timezone.utc) + timedelta(hours=hours)

    try:
        existing = db.query(IpBlocklist).filter(IpBlocklist.ip == ip).first()
        if existing:
            existing.blocked_until      = expiry
            existing.reason             = reason
            existing.playbook_triggered = playbook or existing.playbook_triggered
            db.commit()
            db.refresh(existing)
            entry = existing
        else:
            entry = IpBlocklist(
                ip                 = ip,
                reason             = reason,
                playbook_triggered = playbook,
                created_by         = created_by,
                blocked_until      = expiry,
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)

        # Immediately update in-process cache — don't wait for TTL
        _block_cache[ip] = expiry.timestamp()
        logger.warning(
            f"[SOAR] IP blocked — ip={ip} reason={reason} "
            f"playbook={playbook} until={expiry.isoformat()}"
        )
        return entry

    except Exception as e:
        logger.error(f"[SOAR] block_ip failed for {ip}: {e}")
        db.rollback()
        raise


def unblock_ip(db: Session, ip: str, admin: str) -> bool:
    """Manually remove a block (admin action)."""
    global _block_cache
    entry = db.query(IpBlocklist).filter(IpBlocklist.ip == ip).first()
    if entry:
        db.delete(entry)
        db.commit()
        _block_cache.pop(ip, None)
        logger.info(f"[SOAR] IP unblocked by {admin}: {ip}")
        return True
    return False


def terminate_session(db: Session, session_id: str) -> bool:
    """Remove an active session from the DB (SOAR isolation response)."""
    try:
        deleted = (
            db.query(ActiveSession)
            .filter(ActiveSession.session_id == session_id)
            .delete()
        )
        db.commit()
        if deleted:
            logger.info(f"[SOAR] Session terminated — session_id={session_id}")
        return deleted > 0
    except Exception as e:
        logger.error(f"[SOAR] terminate_session failed: {e}")
        db.rollback()
        return False


# ── Playbook Dispatcher ───────────────────────────────────────────────────────

def run_playbook(db: Session, alert) -> None:
    """
    Maps SecurityAlert rule_name + severity → automated response playbook.
    Called automatically by anomaly_service when score >= 0.9.
    """
    rule     = alert.rule_name or ""
    ip       = alert.source_ip
    session  = alert.session_id

    if not ip:
        logger.debug(f"[SOAR] No source_ip on alert {alert.id} — skipping playbook")
        return

    playbook_name = None

    if "rate_abuse" in rule:
        block_ip(db, ip, reason=f"SOAR: {rule}", hours=1, playbook="rate_abuse_block")
        playbook_name = "rate_abuse_block"

    elif "path_enumeration" in rule:
        block_ip(db, ip, reason=f"SOAR: {rule}", hours=2, playbook="path_enum_block")
        if session:
            terminate_session(db, session)
        playbook_name = "path_enum_block"

    elif "impossible_travel" in rule:
        block_ip(db, ip, reason=f"SOAR: {rule}", hours=1, playbook="impossible_travel_block")
        playbook_name = "impossible_travel_block"

    if playbook_name:
        logger.warning(
            f"[SOAR] Playbook executed — playbook={playbook_name} "
            f"ip={ip} alert_id={alert.id}"
        )
        # Append to immutable audit chain
        try:
            from services.audit_chain_service import append_audit
            append_audit(
                db           = db,
                actor        = "soar_engine",
                action       = f"execute_playbook:{playbook_name}",
                resource_type= "security_alert",
                resource_id  = alert.id,
                payload       = {
                    "ip":         ip,
                    "session_id": session,
                    "rule":       rule,
                    "severity":   alert.severity,
                },
            )
        except Exception as e:
            logger.error(f"[SOAR] Failed to write to audit chain: {e}")


# ── APScheduler job: escalation check ────────────────────────────────────────

def escalation_check_job() -> None:
    """
    APScheduler job — runs every 5 minutes.
    Finds CRITICAL alerts open for > 30 minutes without acknowledgement
    and dispatches an escalation webhook.
    """
    from models.security_alert import SecurityAlert, STATUS_OPEN, SEVERITY_CRITICAL

    db = next(get_db())
    try:
        threshold = datetime.now(timezone.utc) - timedelta(minutes=30)
        unacked = (
            db.query(SecurityAlert)
            .filter(
                SecurityAlert.severity    == SEVERITY_CRITICAL,
                SecurityAlert.status      == STATUS_OPEN,
                SecurityAlert.triggered_at <= threshold,
            )
            .all()
        )

        if unacked:
            logger.warning(
                f"[SOAR] {len(unacked)} CRITICAL alert(s) unacknowledged > 30 min. "
                f"Dispatching escalation webhook."
            )
            if settings.SIEM_WEBHOOK_URL:
                payload = {
                    "event":   "soar_escalation",
                    "message": f"{len(unacked)} CRITICAL alert(s) require immediate attention",
                    "alerts": [a.id for a in unacked],
                    "ts":      datetime.now(timezone.utc).isoformat(),
                }
                asyncio.run(_dispatch(payload))

    except Exception as e:
        logger.error(f"[SOAR] escalation_check_job failed: {e}")
    finally:
        db.close()


async def _dispatch(payload: dict) -> None:
    from services.siem_service import dispatch_webhook
    await dispatch_webhook(settings.SIEM_WEBHOOK_URL, payload)
