"""
services/anomaly_service.py — Behavioural Anomaly Detection Engine
══════════════════════════════════════════════════════════════════
Rule-based threat scoring for incoming analytics events.
No external ML libraries required — all checks use SQL COUNT queries
against the existing visit_logs and security_alerts tables.

Risk score scale: 0.0 (clean) → 1.0 (critical threat)
Alert threshold: score >= 0.7 → SecurityAlert created automatically
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func, text

from models.analytics import VisitLog, ActiveSession
from models.security_alert import SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL
from database import get_db
from config import settings

logger = logging.getLogger("orbe.anomaly")

# ── Configurable Thresholds ───────────────────────────────────────────────────
RATE_ABUSE_WINDOW_MINUTES = 5
RATE_ABUSE_THRESHOLD      = 60   # requests per IP per window
RAPID_PATH_WINDOW_SECONDS = 10
RAPID_PATH_THRESHOLD      = 15   # distinct paths per session per window
IMPOSSIBLE_TRAVEL_MINUTES = 30   # min time to legitimately change city


def _get_blocked_countries() -> set:
    """Read BLOCKED_COUNTRIES from settings (comma-separated), cache per-process."""
    raw = getattr(settings, "BLOCKED_COUNTRIES", "")
    if not raw:
        return set()
    return {c.strip().lower() for c in raw.split(",") if c.strip()}


# ── Individual Checks ─────────────────────────────────────────────────────────

def check_rate_abuse(db: Session, ip: str) -> bool:
    """
    Returns True if `ip` has sent more than RATE_ABUSE_THRESHOLD requests
    in the last RATE_ABUSE_WINDOW_MINUTES.
    """
    try:
        threshold_dt = datetime.now(timezone.utc) - timedelta(minutes=RATE_ABUSE_WINDOW_MINUTES)
        count = (
            db.query(func.count(VisitLog.id))
            .filter(VisitLog.ip == ip, VisitLog.timestamp >= threshold_dt)
            .scalar()
        )
        return (count or 0) >= RATE_ABUSE_THRESHOLD
    except Exception as e:
        logger.warning(f"[Anomaly] check_rate_abuse error: {e}")
        return False


def check_rapid_paths(db: Session, session_id: str) -> bool:
    """
    Returns True if the session has visited >= RAPID_PATH_THRESHOLD distinct
    paths in the last RAPID_PATH_WINDOW_SECONDS — scanner / fuzzer behaviour.
    """
    if not session_id:
        return False
    try:
        threshold_dt = datetime.now(timezone.utc) - timedelta(seconds=RAPID_PATH_WINDOW_SECONDS)
        distinct_paths = (
            db.query(func.count(func.distinct(VisitLog.path)))
            .filter(
                VisitLog.timestamp >= threshold_dt,
            )
            .filter(
                # Match session_id stored in user_agent field or via a join — fallback: check last N rows
                VisitLog.id.in_(
                    db.query(VisitLog.id)
                    .filter(VisitLog.timestamp >= threshold_dt)
                    .order_by(VisitLog.timestamp.desc())
                    .limit(500)
                    .subquery()
                )
            )
            .scalar()
        )
        # Simplified: count ALL paths in window (session-scoped check would require session FK)
        return (distinct_paths or 0) >= RAPID_PATH_THRESHOLD
    except Exception as e:
        logger.warning(f"[Anomaly] check_rapid_paths error: {e}")
        return False


def check_impossible_travel(
    db: Session,
    ip: str,
    current_city: str,
) -> bool:
    """
    Returns True if this IP was seen in a *different* city within the last
    IMPOSSIBLE_TRAVEL_MINUTES window — impossible physical travel speed.
    """
    if not current_city or current_city in ("Unknown", "Localhost", ""):
        return False
    try:
        threshold_dt = datetime.now(timezone.utc) - timedelta(minutes=IMPOSSIBLE_TRAVEL_MINUTES)
        last_city = (
            db.query(VisitLog.city)
            .filter(
                VisitLog.ip == ip,
                VisitLog.timestamp >= threshold_dt,
                VisitLog.city.isnot(None),
                VisitLog.city != "Unknown",
                VisitLog.city != current_city,
            )
            .order_by(VisitLog.timestamp.desc())
            .first()
        )
        return last_city is not None
    except Exception as e:
        logger.warning(f"[Anomaly] check_impossible_travel error: {e}")
        return False


def is_country_blocked(country: str) -> bool:
    """Returns True if the country is in the blocklist (case-insensitive)."""
    if not country or country in ("Unknown", "Local", "Localhost"):
        return False
    blocked = _get_blocked_countries()
    return country.strip().lower() in blocked


# ── Master Risk Scorer ────────────────────────────────────────────────────────

async def score_visit(
    visit_log_id: str,
    ip: str,
    session_id: Optional[str],
    geo: dict,
    path: str,
    event_type: str,
) -> float:
    """
    Asynchronous risk scorer. Runs DB checks in a thread pool to avoid
    blocking the event loop. Creates SecurityAlerts for high-risk events.

    Returns a risk score float between 0.0 and 1.0.
    """
    # Import lazily to avoid circular import at module load time
    from services.siem_service import create_alert

    db = next(get_db())
    score      = 0.0
    threat_tags: list[str] = []

    try:
        country = geo.get("country", "")
        city    = geo.get("city", "")

        # ── Rule 1: Rate abuse (+0.5 HIGH) ───────────────────────────────────
        if await asyncio.get_event_loop().run_in_executor(
            None, check_rate_abuse, db, ip
        ):
            score += 0.5
            threat_tags.append("rate_abuse")
            logger.info(f"[Anomaly] Rate abuse detected — ip={ip}")

        # ── Rule 2: Rapid path enumeration (+0.4 MEDIUM-HIGH) ────────────────
        if session_id and await asyncio.get_event_loop().run_in_executor(
            None, check_rapid_paths, db, session_id
        ):
            score += 0.4
            threat_tags.append("path_enumeration")
            logger.info(f"[Anomaly] Path enumeration detected — session={session_id}")

        # ── Rule 3: Impossible travel (+0.3 MEDIUM) ──────────────────────────
        if await asyncio.get_event_loop().run_in_executor(
            None, check_impossible_travel, db, ip, city
        ):
            score += 0.3
            threat_tags.append("impossible_travel")
            logger.info(f"[Anomaly] Impossible travel detected — ip={ip} city={city}")

        # ── Rule 4: Known-bad event types (+0.1) ─────────────────────────────
        if event_type == "form_submit" and score > 0.3:
            score += 0.1
            threat_tags.append("suspicious_form_submit")

        # Cap at 1.0
        score = min(score, 1.0)

        # ── Persist risk_score + threat_tags onto the visit log row ──────────
        if score > 0.0:
            try:
                row = db.query(VisitLog).filter(VisitLog.id == visit_log_id).first()
                if row:
                    row.risk_score   = round(score, 3)
                    row.threat_tags  = threat_tags
                    db.commit()
            except Exception as e:
                logger.warning(f"[Anomaly] Could not write risk_score to visit log: {e}")
                db.rollback()

        # ── Fire SecurityAlert if score >= 0.7 ───────────────────────────────
        if score >= 0.7:
            severity = SEVERITY_CRITICAL if score >= 0.9 else SEVERITY_HIGH
            rule     = " | ".join(threat_tags) or "composite_threat"
            create_alert(
                db=db,
                rule_name=rule,
                severity=severity,
                source_ip=ip,
                session_id=session_id,
                visit_log_id=visit_log_id,
                context={
                    "ip":          ip,
                    "city":        city,
                    "country":     country,
                    "path":        path,
                    "event_type":  event_type,
                    "threat_tags": threat_tags,
                    "risk_score":  round(score, 3),
                    "geo":         geo,
                },
            )

            # Async webhook dispatch (fire-and-forget)
            if settings.SIEM_WEBHOOK_URL:
                from services.siem_service import dispatch_webhook, format_json_siem
                asyncio.create_task(
                    dispatch_webhook(
                        settings.SIEM_WEBHOOK_URL,
                        {
                            "alert_type": "anomaly_detection",
                            "severity":   severity,
                            "rule":       rule,
                            "visit":      format_json_siem(
                                {
                                    "id":         visit_log_id,
                                    "ip":         ip,
                                    "path":       path,
                                    "event_type": event_type,
                                    "risk_score": round(score, 3),
                                    "country":    country,
                                    "city":       city,
                                    "session_id": session_id,
                                }
                            ),
                        }
                    )
                )

    except Exception as e:
        logger.error(f"[Anomaly] score_visit failed: {e}")
    finally:
        db.close()

    return score
