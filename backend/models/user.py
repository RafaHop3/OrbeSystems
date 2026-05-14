"""
models/user.py — OrbeSystems User Domain Model
════════════════════════════════════════════════
Tabela 'users' completamente isolada de 'projects_metadata'.
Garante que um erro no sistema de usuários nunca afete o portfólio.

Roles:
  "user"    → conta gratuita (padrão ao cadastrar)
  "premium" → assinante ativo (gerenciado via Stripe Webhook)

subscription_status (espelho do Stripe):
  "none"      → nunca assinou
  "active"    → assinatura ativa
  "past_due"  → pagamento falhou, aguardando retry
  "canceled"  → assinatura cancelada
"""

from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from database import Base


class User(Base):
    __tablename__ = "users"

    # ── Identity ──────────────────────────────────────────────────────────────
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    # ── Role & Access ─────────────────────────────────────────────────────────
    role = Column(String, default="user", nullable=False)  # "user" | "premium"

    # ── Stripe Integration ────────────────────────────────────────────────────
    stripe_customer_id = Column(String, nullable=True, index=True)
    subscription_status = Column(String, default="none", nullable=False)

    # ── Future: Email Verification (Fase 1.5 — Resend/SendGrid) ──────────────
    is_email_verified = Column(Boolean, default=False, nullable=False)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "subscription_status": self.subscription_status,
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat(),
        }
