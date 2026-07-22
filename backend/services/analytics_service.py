import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from models.analytics import VisitLog, ActiveSession
from database import get_db

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
    """Save visit log to database instead of file"""
    db = next(get_db())
    try:
        visit = VisitLog(
            ip=visit_data.get("ip"),
            city=visit_data.get("city"),
            region=visit_data.get("region"),
            country=visit_data.get("country"),
            isp=visit_data.get("isp"),
            user_agent=visit_data.get("ua"),
            path=visit_data.get("path"),
            referrer=visit_data.get("referrer"),
            event_type=visit_data.get("event_type", "page_view"),
            timestamp=datetime.fromisoformat(visit_data["timestamp"]) if isinstance(visit_data["timestamp"], str) else visit_data["timestamp"]
        )
        db.add(visit)
        db.commit()
    except Exception as e:
        print(f"ERROR saving visit log to database: {e}")
        db.rollback()
    finally:
        db.close()

def get_recent_visits(limit: int = 50, offset: int = 0) -> List[dict]:
    """Get recent visits from database with pagination"""
    db = next(get_db())
    try:
        visits = db.query(VisitLog).order_by(VisitLog.timestamp.desc()).offset(offset).limit(limit).all()
        return [visit.to_dict() for visit in visits]
    except Exception as e:
        print(f"ERROR reading visits from database: {e}")
        return []
    finally:
        db.close()

def get_visits_by_date_range(start_date: datetime, end_date: datetime, limit: int = 100) -> List[dict]:
    """Get visits filtered by date range"""
    db = next(get_db())
    try:
        visits = db.query(VisitLog).filter(
            VisitLog.timestamp >= start_date,
            VisitLog.timestamp <= end_date
        ).order_by(VisitLog.timestamp.desc()).limit(limit).all()
        return [visit.to_dict() for visit in visits]
    except Exception as e:
        print(f"ERROR reading visits by date range: {e}")
        return []
    finally:
        db.close()

def get_visit_stats(days: int = 7) -> dict:
    """Get analytics statistics for the last N days"""
    db = next(get_db())
    try:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        total_visits = db.query(VisitLog).filter(VisitLog.timestamp >= start_date).count()
        unique_ips = db.query(VisitLog.ip).filter(VisitLog.timestamp >= start_date).distinct().count()
        
        # Top paths
        top_paths = db.query(VisitLog.path).filter(
            VisitLog.timestamp >= start_date,
            VisitLog.path.isnot(None)
        ).group_by(VisitLog.path).order_by(
            db.func.count(VisitLog.path).desc()
        ).limit(10).all()
        
        # Top countries
        top_countries = db.query(VisitLog.country).filter(
            VisitLog.timestamp >= start_date,
            VisitLog.country.isnot(None)
        ).group_by(VisitLog.country).order_by(
            db.func.count(VisitLog.country).desc()
        ).limit(10).all()
        
        return {
            "total_visits": total_visits,
            "unique_visitors": unique_ips,
            "top_paths": [{"path": path[0], "count": path[1]} for path in top_paths] if top_paths else [],
            "top_countries": [{"country": country[0], "count": country[1]} for country in top_countries] if top_countries else [],
            "period_days": days
        }
    except Exception as e:
        print(f"ERROR getting visit stats: {e}")
        return {
            "total_visits": 0,
            "unique_visitors": 0,
            "top_paths": [],
            "top_countries": [],
            "period_days": days
        }
    finally:
        db.close()

# Session tracking for active users
def update_or_create_session(session_id: str, ip: str, user_agent: str, current_path: str):
    """Update existing session or create new one"""
    db = next(get_db())
    try:
        session = db.query(ActiveSession).filter(ActiveSession.session_id == session_id).first()
        
        if session:
            session.last_activity = datetime.now(timezone.utc)
            session.current_path = current_path
            session.ip = ip
            session.user_agent = user_agent
        else:
            session = ActiveSession(
                session_id=session_id,
                ip=ip,
                user_agent=user_agent,
                current_path=current_path,
                last_activity=datetime.now(timezone.utc)
            )
            db.add(session)
        
        db.commit()
    except Exception as e:
        print(f"ERROR updating session: {e}")
        db.rollback()
    finally:
        db.close()

def get_active_sessions(minutes: int = 5) -> List[dict]:
    """Get sessions active in the last N minutes"""
    db = next(get_db())
    try:
        threshold = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        sessions = db.query(ActiveSession).filter(
            ActiveSession.last_activity >= threshold
        ).order_by(ActiveSession.last_activity.desc()).all()
        return [session.to_dict() for session in sessions]
    except Exception as e:
        print(f"ERROR getting active sessions: {e}")
        return []
    finally:
        db.close()

def cleanup_old_sessions(hours: int = 24):
    """Remove sessions inactive for more than N hours"""
    db = next(get_db())
    try:
        threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
        deleted = db.query(ActiveSession).filter(
            ActiveSession.last_activity < threshold
        ).delete()
        db.commit()
        return deleted
    except Exception as e:
        print(f"ERROR cleaning up old sessions: {e}")
        db.rollback()
        return 0
    finally:
        db.close()
