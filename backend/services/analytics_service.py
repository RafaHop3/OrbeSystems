import httpx
import json
import os
from datetime import datetime
from typing import List, Optional
from models.analytics import Visit

# Use /tmp/ for Vercel Serverless compatibility (ephemeral, but prevents crash)
LOG_FILE = "/tmp/access_logs.json"

async def get_geoip(ip: str) -> dict:
    # Filter local IPs
    if ip == "127.0.0.1" or ip.startswith("192.168.") or ip.startswith("10."):
        return {"city": "Localhost", "region": "OS", "country": "Local", "isp": "Internal Network"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip}", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return {
                        "city": data.get("city"),
                        "region": data.get("regionName"),
                        "country": data.get("country"),
                        "isp": data.get("isp")
                    }
    except Exception as e:
        print(f"DEBUG: GeoIP lookup failed for {ip}: {e}")
    
    return {}

def save_visit_log(visit_data: dict):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
        except:
            logs = []
            
    logs.insert(0, visit_data)
    logs = logs[:200]
    
    try:
        with open(LOG_FILE, "w") as f:
            json.dump(logs, f, indent=4, default=str)
    except Exception as e:
        print(f"ERROR saving visit log: {e}")

def get_recent_visits(limit: int = 50) -> List[dict]:
    if not os.path.exists(LOG_FILE):
        return []
    
    try:
        with open(LOG_FILE, "r") as f:
            logs = json.load(f)
            return logs[:limit]
    except Exception as e:
        print(f"ERROR reading logs: {e}")
        return []
