from fastapi import APIRouter, Request, Depends, HTTPException, Response
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import uuid
import asyncio
from routes.auth import limiter
from services.analytics_service import (
    get_geoip, save_visit_log, get_recent_visits,
    get_visits_by_date_range, get_visit_stats,
    update_or_create_session, get_active_sessions, cleanup_old_sessions
)
from services.anomaly_service import is_country_blocked, score_visit
from services.soar_service import is_ip_blocked
from utils.ip_utils import extract_client_ip
from security.auth import get_current_admin_user

router = APIRouter()

# ── Allowed event types allowlist ─────────────────────────────────────────────
_ALLOWED_EVENT_TYPES = {
    "page_view", "page_exit", "click", "scroll", "form_submit",
    "download", "video_play", "video_pause", "search", "share"
}

class AnalyticsPayload(BaseModel):
    """
    Validated analytics payload. Prevents arbitrary data injection.
    All string fields are capped at 200 chars.
    The `_hp` honeypot field must be absent/empty — filled = bot.
    """
    event_type: str = Field(default="page_view", max_length=50)
    page: Optional[str] = Field(default=None, max_length=200)
    referrer: Optional[str] = Field(default=None, max_length=200)
    session_id: Optional[str] = Field(default=None, max_length=200)
    # Honeypot: bots fill this, humans don't
    hp_field: Optional[str] = Field(default=None, max_length=0)

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in _ALLOWED_EVENT_TYPES:
            # Silently normalise to page_view instead of 422-ing to avoid leaking the allowlist
            return "page_view"
        return v


@router.options("/log")
async def options_log():
    """CORS preflight handler for /log endpoint"""
    return Response(status_code=204)

@router.post("/log")
@limiter.limit("30/minute")
async def log_visit(request: Request, payload: Optional[AnalyticsPayload] = None):
    """
    Publicly accessible endpoint to log a visit.
    Captures IP (X-Forwarded-For) and resolves GeoIP details.
    Rejects requests with honeypot field filled (bot detection).
    Also tracks active sessions if session_id is provided.
    """
    # Bot honeypot check
    if payload and payload.hp_field:
        return {"status": "captured"}

    # SECURITY [C-XFF]: Use trust-rightmost extraction — prevents XFF spoofing.
    # See utils/ip_utils.py for algorithm details.
    ip = extract_client_ip(request)

    # SOAR: Block listed IPs at application layer (serves 429 immediately)
    if is_ip_blocked(ip):
        return Response(status_code=429, content=b"Too Many Requests")
    
    # Get user agent and referer — prefer schema fields if provided
    user_agent = request.headers.get("user-agent", "Unknown")
    path = (payload.page if payload and payload.page else None) \
           or request.headers.get("referer", "Direct Access")
    
    # Fetch GeoIP resolution asynchronously
    geo = await get_geoip(ip)
    
    visit_data = {
        "id": str(uuid.uuid4()),
        "ip": ip,
        "city": geo.get("city", "Unknown"),
        "region": geo.get("region", "Unknown"),
        "country": geo.get("country", "Unknown"),
        "isp": geo.get("isp", "Unknown"),
        "ua": user_agent,
        "path": path,
        "referrer": payload.referrer if payload and payload.referrer else None,
        "event_type": payload.event_type if payload and payload.event_type else "page_view",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # ── Geofencing check ──────────────────────────────────────────
    country = geo.get("country", "")
    if is_country_blocked(country):
        # Don't save, don't reveal detection logic
        return {"status": "blocked"}
    
    save_visit_log(visit_data)
    
    # Track session if session_id is provided
    if payload and payload.session_id:
        update_or_create_session(
            session_id=payload.session_id,
            ip=ip,
            user_agent=user_agent,
            current_path=path
        )
    
    # ── Async anomaly scoring (fire-and-forget) ───────────────────────
    asyncio.create_task(
        score_visit(
            visit_log_id=visit_data["id"],
            ip=ip,
            session_id=payload.session_id if payload else None,
            geo=geo,
            path=path or "/",
            event_type=visit_data["event_type"],
        )
    )
    
    return {"status": "captured"}

@router.get("/list")
async def list_visits(
    limit: int = 100,
    offset: int = 0,
    admin: str = Depends(get_current_admin_user)
):
    """ 
    Secure endpoint to list recent visits with pagination.
    Protected by the same authentication system as the rest of the dashboard.
    """
    logs = get_recent_visits(limit=limit, offset=offset)
    return {"visits": logs, "count": len(logs)}

@router.get("/stats")
async def get_stats(
    days: int = 7,
    admin: str = Depends(get_current_admin_user)
):
    """
    Get analytics statistics for the last N days.
    Returns total visits, unique visitors, top paths, and top countries.
    """
    stats = get_visit_stats(days=days)
    return stats

@router.get("/active")
async def list_active_sessions(
    minutes: int = 5,
    admin: str = Depends(get_current_admin_user)
):
    """
    Get currently active users (sessions with activity in last N minutes).
    """
    sessions = get_active_sessions(minutes=minutes)
    return {"active_sessions": sessions, "count": len(sessions)}

@router.post("/heartbeat")
@limiter.limit("60/minute")
async def heartbeat(request: Request, payload: AnalyticsPayload):
    """
    Heartbeat endpoint to keep session alive.
    Call this periodically (e.g., every 30-60 seconds) from frontend.
    """
    # SECURITY [C-XFF]: Hardened IP extraction (trust-rightmost)
    ip = extract_client_ip(request)

    # SOAR: Check active IP blocks
    if is_ip_blocked(ip):
        return Response(status_code=429, content=b"Too Many Requests")

    user_agent = request.headers.get("user-agent", "Unknown")
    path = payload.page if payload.page else request.headers.get("referer", "Unknown")
    
    if payload.session_id:
        update_or_create_session(
            session_id=payload.session_id,
            ip=ip,
            user_agent=user_agent,
            current_path=path
        )
    
    return {"status": "alive"}
