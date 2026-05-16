from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    stripe_customer_id = Column(String, nullable=True, index=True)
    subscription_status = Column(String, default="none", nullable=False)

    user = relationship("User", back_populates="subscription_info")
