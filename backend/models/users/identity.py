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
    # Legacy columns: kept for backward-compatibility with the existing Supabase table
    # that has NOT NULL constraints on `role` and `subscription_status`.
    # The application uses `user_roles` and `user_subscriptions` relationships for
    # actual logic, but these fields must be populated on INSERT to avoid violations.
    _role_legacy = Column("role", String, nullable=True, default="user", server_default="user")
    _subscription_status_legacy = Column("subscription_status", String, nullable=True, default="none", server_default="none")
    is_email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    role_info = relationship("UserRole", back_populates="user", uselist=False, cascade="all, delete-orphan")
    subscription_info = relationship("UserSubscription", back_populates="user", uselist=False, cascade="all, delete-orphan")

    @property
    def role(self):
        return self.role_info.role_name if self.role_info else (self._role_legacy or "user")

    @role.setter
    def role(self, value):
        from models.users.roles import UserRole
        self._role_legacy = value
        if self.role_info:
            self.role_info.role_name = value
        else:
            self.role_info = UserRole(role_name=value)

    @property
    def stripe_customer_id(self):
        return self.subscription_info.stripe_customer_id if self.subscription_info else None

    @stripe_customer_id.setter
    def stripe_customer_id(self, value):
        from models.users.subscriptions import UserSubscription
        if self.subscription_info:
            self.subscription_info.stripe_customer_id = value
        else:
            self.subscription_info = UserSubscription(stripe_customer_id=value)

    @property
    def subscription_status(self):
        return self.subscription_info.subscription_status if self.subscription_info else (self._subscription_status_legacy or "none")

    @subscription_status.setter
    def subscription_status(self, value):
        from models.users.subscriptions import UserSubscription
        self._subscription_status_legacy = value
        if self.subscription_info:
            self.subscription_info.subscription_status = value
        else:
            self.subscription_info = UserSubscription(subscription_status=value)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "subscription_status": self.subscription_status,
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat(),
        }
