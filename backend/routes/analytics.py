from fastapi import APIRouter, Request, Depends, HTTPException, Response
from datetime import datetime, timezone
import uuid
from routes.auth import limiter
from services.analytics_service import get_geoip, save_visit_log, get_recent_visits
from security.auth import get_current_admin_user

router = APIRouter()

@router.options("/log")
async def options_log():
    """CORS preflight handler for /log endpoint"""
    return Response(status_code=204)

@router.post("/log")
@limiter.limit("30/minute")
async def log_visit(request: Request):
    """
    Publicly accessible endpoint to log a visit.
    Captures IP (X-Forwarded-For) and resolves GeoIP details.
    """
    # Get forward-for IP (Render/Cloudflare) or fallback to client host
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take the first IP if multiple exist (proxies chain)
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "Unknown"
    
    # Get user agent and referer
    user_agent = request.headers.get("user-agent", "Unknown")
    path = request.headers.get("referer", "Direct Access")
    
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
