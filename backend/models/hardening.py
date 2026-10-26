"""
models/hardening.py — Modelos de Blindagem (FIDC, Idempotência & Jobs Async)
════════════════════════════════════════════════════════════════════════════
Modelos desacoplados para:
  1. Idempotência de Webhooks (`webhook_idempotency_keys`)
  2. Operações FIDC com precisão `NUMERIC(18,8)` e `NUMERIC(15,2)` (`fidc_operations`)
  3. Fila de Jobs Assíncronos `202 Accepted` (`async_processing_jobs`)
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Numeric, Text, UniqueConstraint
from database import Base


class WebhookIdempotencyKey(Base):
    __tablename__ = "webhook_idempotency_keys"

    idempotency_key = Column(String(128), primary_key=True)
    provider = Column(String(50), nullable=False, default="stripe")
    event_type = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="processed")
    payload_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_webhook_idempotency_key"),
    )


class FidcOperation(Base):
    __tablename__ = "fidc_operations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    external_ref = Column(String(100), nullable=False, unique=True, index=True)
    face_value = Column(Numeric(15, 2), nullable=False)
    daily_rate = Column(Numeric(18, 8), nullable=False)
    discount_factor = Column(Numeric(18, 8), nullable=False)
    quota_pu = Column(Numeric(18, 8), nullable=False)
    net_settlement = Column(Numeric(15, 2), nullable=False)
    rounding_mode = Column(String(30), nullable=False, default="ROUND_HALF_EVEN")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class AsyncProcessingJob(Base):
    __tablename__ = "async_processing_jobs"

    job_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_type = Column(String(60), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="accepted", index=True)
    payload_hash = Column(String(64), nullable=False)
    result_summary = Column(Text, nullable=True)
    error_detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
