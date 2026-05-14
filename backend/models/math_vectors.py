"""
models/math_vectors.py — Math Vectors Model
════════════════════════════════════════════════
Tabela para armazenar vetores matemáticos e suas operações.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class MathVector(Base):
    __tablename__ = "math_vectors"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    dimensions = Column(String, nullable=False)  # e.g. "3", "n"
    components = Column(JSON, nullable=False)  # Array de números: [1, 2, 3]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "dimensions": self.dimensions,
            "components": self.components,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
