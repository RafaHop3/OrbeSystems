"""
Mapeamento ORM do schema isolado `mesh_network` — Mesh Social.

IMPORTANTE:
  * Utiliza DeclarativeBase dedicado (`MeshBase`), totalmente desacoplado do `Base` da Orbe.
  * Impede interferência, lock escalation ou vazamento lateral com qualquer outra tabela
    (CRM, Users, Opt-Out, Inho, etc.).
"""
import uuid
from datetime import datetime
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase

MESH_SCHEMA = "mesh_network"

class MeshBase(DeclarativeBase):
    """Metadata isolada do Mesh Social."""

class MeshNode(MeshBase):
    __tablename__ = "nodes"
    __table_args__ = (
        CheckConstraint("dunbar_vault_count <= 15", name="check_mesh_dunbar_max_15"),
        CheckConstraint("lounge_count <= 50", name="check_mesh_lounge_max_50"),
        {"schema": MESH_SCHEMA}
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    auth_user_id = Column(String(36), nullable=False, unique=True, index=True)
    handle = Column(String(64), nullable=False, unique=True, index=True)
    display_name = Column(String(120), nullable=False)
    bio_vault = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    public_identity_key = Column(Text, nullable=False)
    dunbar_vault_count = Column(Integer, default=0)
    lounge_count = Column(Integer, default=0)
    is_hibernating = Column(Boolean, default=False)
    hibernation_started_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MeshBilateralEdge(MeshBase):
    __tablename__ = "bilateral_edges"
    __table_args__ = (
        UniqueConstraint("node_a_id", "node_b_id", name="uq_mesh_bilateral_pair"),
        CheckConstraint("node_a_id != node_b_id", name="check_mesh_no_self_edge"),
        CheckConstraint("pcr_score >= 0", name="check_mesh_pcr_non_negative"),
        CheckConstraint("orbit_level BETWEEN 1 AND 4", name="check_mesh_orbit_level_range"),
        {"schema": MESH_SCHEMA}
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_a_id = Column(String(36), ForeignKey(f"{MESH_SCHEMA}.nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    node_b_id = Column(String(36), ForeignKey(f"{MESH_SCHEMA}.nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    pcr_score = Column(Integer, default=0)
    verified_replies = Column(Integer, default=0)
    voice_notes_count = Column(Integer, default=0)
    mutual_key_signed = Column(Boolean, default=False)
    mutual_key_signature = Column(Text, nullable=True)
    orbit_level = Column(Integer, default=1)
    cooldown_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MeshPost(MeshBase):
    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint("orbit_level BETWEEN 1 AND 4", name="check_mesh_post_orbit_level"),
        CheckConstraint("format IN ('photo', 'short', 'long', 'thread')", name="check_mesh_post_format"),
        {"schema": MESH_SCHEMA}
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    author_node_id = Column(String(36), ForeignKey(f"{MESH_SCHEMA}.nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    format = Column(String(20), nullable=False)
    orbit_level = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    media_url = Column(Text, nullable=True)
    media_metadata = Column(JSONB, default=dict)
    jwt_signed_stream = Column(Boolean, default=False)
    watermark_fingerprint = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MeshAuditLedger(MeshBase):
    __tablename__ = "audit_ledger"
    __table_args__ = (
        {"schema": MESH_SCHEMA}
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_node_id = Column(String(36), ForeignKey(f"{MESH_SCHEMA}.nodes.id"), nullable=False, index=True)
    target_node_id = Column(String(36), ForeignKey(f"{MESH_SCHEMA}.nodes.id"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)
    payload_hash = Column(String(64), nullable=False)
    pcr_delta = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
