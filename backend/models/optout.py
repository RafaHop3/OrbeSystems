import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text
from database import Base

class OptOutRequest(Base):
    __tablename__ = "optout_requests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False) # Owner of the request
    
    # ENCRYPTED FIELD: CPF must never be stored in plaintext.
    cpf_encrypted = Column(Text, nullable=False)
    
    full_name = Column(String(255), nullable=False)
    birth_date = Column(String(10), nullable=True) # YYYY-MM-DD
    email = Column(String(255), nullable=True)
    
    # STATUS: PENDING, RUNNING, SUCCESS, FAILED
    status = Column(String(50), default="PENDING")
    
    # Target Data Broker
    target_broker = Column(String(100), nullable=False)
    
    # Github Actions Dispatch log / Error messages
    logs = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    proof_url = Column(String(500), nullable=True)
