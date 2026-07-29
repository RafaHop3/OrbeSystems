from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.chat_logs import ChatLog
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from security.auth import require_admin, require_premium

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

# Restricted read route for the admin panel
@router.get("", response_model=List[ChatLogResponse])
def get_chat_logs(limit: int = 100, db: Session = Depends(get_db), current_admin = Depends(require_admin)):
    return db.query(ChatLog).order_by(ChatLog.timestamp.desc()).limit(limit).all()
