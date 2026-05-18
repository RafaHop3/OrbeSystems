from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    # Legacy column: kept for backward-compatibility with the existing Supabase table
    # that has a NOT NULL constraint on `role`. The application uses `user_roles`
    # relationship for role logic, but this field must be populated on INSERT.
    _role_legacy = Column("role", String, nullable=True, default="user", server_default="user")
    is_email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    role_info = relationship("UserRole", back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscription_info = relationship("UserSubscription", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def role(self):
        return self.role_info.role_name if self.role_info else "user"

    @property
    def stripe_customer_id(self):
        return self.subscription_info.stripe_customer_id if self.subscription_info else None

    @property
    def subscription_status(self):
        return self.subscription_info.subscription_status if self.subscription_info else "none"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "subscription_status": self.subscription_status,
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat(),
        }
