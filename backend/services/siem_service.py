"""
services/siem_service.py — SIEM Event Formatting & Dispatch
════════════════════════════════════════════════════════════
Formats VisitLog / SecurityAlert events into SIEM-standard formats
(CEF 0, LEEF 1.0, enriched JSON) and dispatches them to configured
webhook endpoints with HMAC-SHA256 signing.
"""

import hashlib
import hmac
import json
import time
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

import httpx

from config import settings
from models.security_alert import SecurityAlert, STATUS_OPEN, SEVERITY_MEDIUM

logger = logging.getLogger("orbe.siem")

# ── CEF field escaping ────────────────────────────────────────────────────────
def _cef_escape(value: str) -> str:
    """Escape CEF extension field values (backslash, pipe, equals)."""
    return str(value).replace("\\", "\\\\").replace("|", "\\|").replace("=", "\\=")


def _cef_header_escape(value: str) -> str:
    """Escape CEF header fields (backslash and pipe only)."""
    return str(value).replace("\\", "\\\\").replace("|", "\\|")


# ── CEF Formatter ─────────────────────────────────────────────────────────────
def format_cef(visit: dict) -> str:
    """
    Formats a VisitLog dict as a CEF 0 syslog string.
    Compatible with: Splunk, ArcSight, IBM QRadar (CEF mode).

    CEF:Version|Device Vendor|Device Product|Device Version|
        Signature ID|Name|Severity|Extension
    """
    severity_map = {
        "page_view":   3,
        "page_exit":   1,
        "click":       2,
        "form_submit": 4,
        "download":    5,
        "search":      2,
        "video_play":  1,
        "video_pause": 1,
        "share":       2,
    }
    sig_id   = _cef_header_escape(visit.get("event_type", "page_view").upper())
    name     = _cef_header_escape(f"Orbe Analytics - {visit.get('event_type', 'page_view')}")
    severity = severity_map.get(visit.get("event_type", "page_view"), 3)

    ext_parts = [
        f"src={_cef_escape(visit.get('ip', 'unknown'))}",
        f"requestURL={_cef_escape(visit.get('path', '/'))}",
        f"requestClientApplication={_cef_escape((visit.get('user_agent') or '')[:100])}",
        f"cs1={_cef_escape(visit.get('country', 'Unknown'))}",
        f"cs1Label=Country",
        f"cs2={_cef_escape(visit.get('city', 'Unknown'))}",
        f"cs2Label=City",
        f"cs3={_cef_escape(str(visit.get('risk_score', 0.0)))}",
        f"cs3Label=RiskScore",
        f"rt={_cef_escape(visit.get('timestamp', datetime.now(timezone.utc).isoformat()))}",
        f"deviceExternalId={_cef_escape(visit.get('id', ''))}",
    ]
    if visit.get("referrer"):
        ext_parts.append(f"ref={_cef_escape(visit['referrer'])}")

    extension = " ".join(ext_parts)
    return (
        f"CEF:0|OrbeSystems|Analytics Gateway|1.0.0|"
        f"{sig_id}|{name}|{severity}|{extension}"
    )


# ── LEEF Formatter ────────────────────────────────────────────────────────────
def format_leef(visit: dict) -> str:
    """
    Formats a VisitLog dict as a LEEF 1.0 event.
    Compatible with: IBM QRadar.
    """
    sep = "\t"
    fields = sep.join([
        f"src={visit.get('ip', 'unknown')}",
        f"url={visit.get('path', '/')}",
        f"usrName={visit.get('session_id', 'anonymous')}",
        f"srcCountry={visit.get('country', 'Unknown')}",
        f"srcCity={visit.get('city', 'Unknown')}",
        f"devTime={visit.get('timestamp', '')}",
        f"eventType={visit.get('event_type', 'page_view')}",
        f"riskScore={visit.get('risk_score', 0.0)}",
        f"logSourceId={visit.get('id', '')}",
    ])
    return f"LEEF:1.0|OrbeSystems|Analytics Gateway|1.0.0|PageEvent|{fields}"


# ── Enriched JSON Formatter ───────────────────────────────────────────────────
def format_json_siem(visit: dict) -> dict:
    """
    Returns an enriched JSON event suitable for ELK Stack / Azure Sentinel.
    Adds MITRE ATT&CK technique tagging and event category classification.
    """
    risk_score = float(visit.get("risk_score") or 0.0)

    # Simple heuristic MITRE tagging based on risk score and event type
    mitre_techniques = []
    if risk_score >= 0.8:
        mitre_techniques.append("T1078")  # Valid Accounts (abuse of legitimate access)
    if risk_score >= 0.7:
        mitre_techniques.append("T1110")  # Brute Force
    if visit.get("event_type") == "download":
        mitre_techniques.append("T1005")  # Data from Local System

    return {
        "@timestamp":        visit.get("timestamp"),
        "event": {
            "id":            visit.get("id"),
            "category":      "web",
            "type":          visit.get("event_type", "page_view"),
            "provider":      "orbe-systems-analytics",
            "risk_score":    risk_score,
        },
        "source": {
            "ip":            visit.get("ip"),
            "geo": {
                "country_name":  visit.get("country"),
                "region_name":   visit.get("region"),
                "city_name":     visit.get("city"),
            },
            "as": {
                "organization": {"name": visit.get("isp")},
            },
        },
        "url": {"full": visit.get("path")},
        "http": {
            "request": {
                "referrer":    visit.get("referrer"),
                "method":      "GET",
                "user_agent":  {"original": visit.get("user_agent")},
            },
        },
        "threat": {
            "technique": [{"id": t} for t in mitre_techniques],
        },
        "labels": {
            "session_id":    visit.get("session_id"),
            "threat_tags":   visit.get("threat_tags") or [],
        },
    }


# ── Webhook Dispatcher ────────────────────────────────────────────────────────
def _sign_payload(payload_bytes: bytes, secret: str) -> str:
    """HMAC-SHA256 signature identical to the Stripe webhook pattern."""
    return hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()


async def dispatch_webhook(url: str, payload: dict) -> bool:
    """
    Sends an event to the configured SIEM webhook URL with HMAC-SHA256 signing.
    Returns True on success, False on any failure. Retries once on network error.
    """
    if not url:
        return False

    try:
        body = json.dumps(payload, default=str).encode("utf-8")
        headers = {
            "Content-Type":     "application/json",
            "User-Agent":       "OrbeSystems-SIEM/1.0",
            "X-Orbe-Timestamp": str(int(time.time())),
        }
        if settings.SIEM_WEBHOOK_SECRET:
            headers["X-Orbe-Signature"] = f"sha256={_sign_payload(body, settings.SIEM_WEBHOOK_SECRET)}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(2):
                try:
                    r = await client.post(url, content=body, headers=headers)
                    if r.status_code < 300:
                        logger.info(f"[SIEM] Webhook delivered → {url} ({r.status_code})")
                        return True
                    logger.warning(f"[SIEM] Webhook non-2xx on attempt {attempt + 1}: {r.status_code}")
                except httpx.TransportError as e:
                    logger.warning(f"[SIEM] Webhook transport error on attempt {attempt + 1}: {e}")
                    if attempt == 0:
                        continue
            return False
    except Exception as e:
        logger.error(f"[SIEM] Webhook dispatch failed: {e}")
        return False


# ── Alert Creator ─────────────────────────────────────────────────────────────
def create_alert(
    db: Session,
    rule_name: str,
    severity: str,
    source_ip: Optional[str] = None,
    session_id: Optional[str] = None,
    visit_log_id: Optional[str] = None,
    context: Optional[dict] = None,
) -> SecurityAlert:
    """
    Persists a new SecurityAlert row and returns it.
    Fires-and-forgets a webhook delivery if SIEM_WEBHOOK_URL is configured.
    """
    alert = SecurityAlert(
        rule_name=rule_name,
        severity=severity,
        status=STATUS_OPEN,
        source_ip=source_ip,
        session_id=session_id,
        visit_log_id=visit_log_id,
        context=context or {},
    )
    try:
        db.add(alert)
        db.commit()
        db.refresh(alert)
        logger.info(
            f"[SIEM] Alert created — rule={rule_name} severity={severity} ip={source_ip}"
        )
    except Exception as e:
        logger.error(f"[SIEM] Failed to persist alert: {e}")
        db.rollback()

    return alert
