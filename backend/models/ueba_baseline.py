"""
models/ueba_baseline.py — UEBA Behavioral Baseline Cache
══════════════════════════════════════════════════════════
Pre-computed per-IP behavioral baselines, invalidated every 24h.
Used by anomaly_service.is_outlier() for 3-sigma detection.
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Index
from database import Base


class UebaBaseline(Base):
    __tablename__ = "ueba_baselines"

    id                = Column(String, primary_key=True, default=lambda: str(uuid4()))
    ip                = Column(String(50), nullable=False, unique=True, index=True)

    # Statistical baseline (requests per hour)
    mean_req_per_hour = Column(Float, nullable=False, default=0.0)
    stddev            = Column(Float, nullable=False, default=0.0)
    peak_hour         = Column(Integer, nullable=True)   # 0-23 UTC hour with most activity
    sample_days       = Column(Integer, nullable=False, default=14)
    total_requests    = Column(Integer, nullable=False, default=0)

    # Computed at — baseline is stale after 24h
    computed_at       = Column(DateTime, nullable=False,
                               default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self) -> dict:
        return {
            "ip":                 self.ip,
            "mean_req_per_hour":  self.mean_req_per_hour,
            "stddev":             self.stddev,
            "peak_hour":          self.peak_hour,
            "sample_days":        self.sample_days,
            "total_requests":     self.total_requests,
            "computed_at":        self.computed_at.isoformat(),
        }
