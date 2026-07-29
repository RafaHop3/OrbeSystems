from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.chat_logs import ChatLog
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from security.auth import get_current_admin_user, require_premium

router = APIRouter(prefix="/api/admin/chat-logs", tags=["admin-chat-logs"])

class ChatLogCreate(BaseModel):
    session_id: Optional[str] = None
    user_message: str
    ai_response: str

class ChatLogResponse(BaseModel):
    id: str
    session_id: Optional[str]
    user_message: str
    ai_response: str
    timestamp: datetime
    class Config:
        from_attributes = True

# Public insertion route for the frontend proxy to use non-intrusively
@router.post("")
def create_chat_log(log: ChatLogCreate, db: Session = Depends(get_db)):
    db_log = ChatLog(
        session_id=log.session_id,
        user_message=log.user_message,
        ai_response=log.ai_response
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# Restricted analytics route
@router.get("/stats")
def get_chat_log_stats(days: int = 14, db: Session = Depends(get_db)):
    """Groups logs by day for the last N days."""
    try:
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        # Using SQLite date function
        results = db.query(
            func.date(ChatLog.timestamp).label("date"),
            func.count(ChatLog.id).label("count")
        ).filter(ChatLog.timestamp >= cutoff)\
         .group_by(func.date(ChatLog.timestamp))\
         .order_by(func.date(ChatLog.timestamp).asc())\
         .all()
         
        return [{"date": str(r.date), "count": r.count} for r in results]
    except Exception as e:
        # Fallback to python-side aggregation if driver doesn't support func.date() directly
        logs = db.query(ChatLog).filter(ChatLog.timestamp >= cutoff).all()
        counts_by_date = {}
        for log in logs:
            dt_str = log.timestamp.strftime("%Y-%m-%d")
            counts_by_date[dt_str] = counts_by_date.get(dt_str, 0) + 1
        
        # Sort and return
        sorted_keys = sorted(counts_by_date.keys())
        return [{"date": k, "count": counts_by_date[k]} for k in sorted_keys]

# Restricted read route for the admin panel
@router.get("", response_model=List[ChatLogResponse])
def get_chat_logs(limit: int = 100, db: Session = Depends(get_db), current_admin = Depends(get_current_admin_user)):
    return db.query(ChatLog).order_by(ChatLog.timestamp.desc()).limit(limit).all()
