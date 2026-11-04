"""Modelos SQLAlchemy para Mesh Social Books (Manual 02 & Manual 11).

Schema: mesh_books (isolado). Todas as PKs e FKs sao estritamente UUID.
"""
from __future__ import annotations

import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    DateTime,
    ForeignKey,
    CheckConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.sql import func
from database import Base


class CatalogWork(Base):
    __tablename__ = "catalog_works"
    __table_args__ = (
        {"schema": "mesh_books"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    isbn13 = Column(String(13), nullable=False, unique=True)
    title = Column(String(500), nullable=False)
    # Suporte hibrido Postgres ARRAY / SQLite JSON fallback
    authors = Column(ARRAY(Text), nullable=False, default=list)
    cover_url = Column(Text, nullable=True)
    source = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PhysicalCopy(Base):
    __tablename__ = "physical_copies"
    __table_args__ = (
        {"schema": "mesh_books"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("mesh_books.catalog_works.id"), nullable=False)
    owner_node_id = Column(UUID(as_uuid=True), ForeignKey("mesh_network.nodes.id", ondelete="CASCADE"), nullable=False)
    circulation_policy = Column(String(16), nullable=False, default="display_only")
    h3_cell = Column(String(16), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class P2PLoan(Base):
    __tablename__ = "p2p_loans"
    __table_args__ = (
        {"schema": "mesh_books"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    copy_id = Column(UUID(as_uuid=True), ForeignKey("mesh_books.physical_copies.id"), nullable=False)
    borrower_node_id = Column(UUID(as_uuid=True), ForeignKey("mesh_network.nodes.id"), nullable=False)
    status = Column(String(16), nullable=False, default="requested")
    due_at = Column(DateTime(timezone=True), nullable=True)
    handover_signature = Column(Text, nullable=True)
    return_signature = Column(Text, nullable=True)
    idempotency_key = Column(UUID(as_uuid=True), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Marginalia(Base):
    __tablename__ = "marginalia"
    __table_args__ = (
        {"schema": "mesh_books"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("mesh_books.catalog_works.id"), nullable=False)
    author_node_id = Column(UUID(as_uuid=True), ForeignKey("mesh_network.nodes.id", ondelete="CASCADE"), nullable=False)
    epub_cfi = Column(Text, nullable=False)
    progress_threshold = Column(Numeric(5, 2), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DigitalWork(Base):
    __tablename__ = "digital_works"
    __table_args__ = (
        {"schema": "mesh_books"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("mesh_books.catalog_works.id"), nullable=False)
    license = Column(String(24), nullable=False)
    file_sha256 = Column(String(64), nullable=False, unique=True)
    takedown_status = Column(String(12), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
