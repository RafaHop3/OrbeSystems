"""
models/math_matrices.py — Math Matrices Model
════════════════════════════════════════════════
Tabela para armazenar matrizes matemáticas e suas operações.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base


class MathMatrix(Base):
    __tablename__ = "math_matrices"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    rows = Column(Integer, nullable=False)
    cols = Column(Integer, nullable=False)
    data = Column(JSON, nullable=False)  # Array 2D: [[1, 2], [3, 4]]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "rows": self.rows,
            "cols": self.cols,
            "data": self.data,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
