from fastapi import APIRouter, Request, Depends, HTTPException, Response
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import uuid
from routes.auth import limiter
from services.analytics_service import get_geoip, save_visit_log, get_recent_visits
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
    """
    # Bot honeypot check
    if payload and payload.hp_field:
        # Silently accept but discard — don't reveal detection logic
        return {"status": "captured"}

    # Get forward-for IP (Render/Cloudflare) or fallback to client host
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take the first IP if multiple exist (proxies chain)
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "Unknown"
    
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
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    save_visit_log(visit_data)
    return {"status": "captured"}

@router.get("/list")
async def list_visits(admin: str = Depends(get_current_admin_user)):
    """ 
    Secure endpoint to list recent visits. 
    Protected by the same authentication system as the rest of the dashboard.
    """
    logs = get_recent_visits(limit=100)
    return {"visits": logs}
