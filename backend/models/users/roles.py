from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class SystemRole:
    SUPERADMIN = "superadmin"
    ORBE_OPERATOR = "orbe_operator"
    INHO_ADMIN = "inho_admin"
    INHO_OPERATOR = "inho_operator"

class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    role_name = Column(String, default="user", nullable=False)

    user = relationship("User", back_populates="role_info")
