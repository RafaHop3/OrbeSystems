from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
import uuid
from database import Base

class ChatLog(Base):
    __tablename__ = "ai_chat_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String, index=True, nullable=True)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
