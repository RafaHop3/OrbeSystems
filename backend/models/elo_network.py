"""
Mapeamento ORM (somente leitura) do schema isolado `elo_network` — Protocolo ELO.

IMPORTANTE:
  * Usa um DeclarativeBase PRÓPRIO (`EloBase`), separado do `database.Base` da Orbe.
    Assim, nenhum `Base.metadata.create_all()` do backend principal cria, altera ou
    toca as tabelas da ELO — elas são geridas exclusivamente por
    `elo_network_isolated_schema.sql`, aplicado com a role `elo_owner`.
  * Toda escrita deve passar pelas funções SECURITY DEFINER do schema
    (register_node, create_post, interact, reply_to_interaction, ...), executadas
    com a role `elo_app` após `SELECT set_config('elo.node_id', <uuid>, true)`.
"""
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase

ELO_SCHEMA = "elo_network"


class EloBase(DeclarativeBase):
    """Metadata isolada da ELO (nunca registrada no Base principal)."""


class EloNode(EloBase):
    __tablename__ = "nodes"
    __table_args__ = {"schema": ELO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True)
    handle = Column(String(32), nullable=False, unique=True)
    display_name = Column(String(120), nullable=False)
    public_identity_key = Column(Text, nullable=False)
    is_hibernating = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    # `auth_user_id` e `vault_cooldown_until` não são legíveis pela role elo_app
    # (column-level GRANT) e por isso não são mapeados aqui.


class EloPost(EloBase):
    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint("orbit_level BETWEEN 1 AND 4"),
        CheckConstraint("format IN ('photo', 'short', 'long', 'thread')"),
        {"schema": ELO_SCHEMA},
    )

    id = Column(UUID(as_uuid=True), primary_key=True)
    author_node_id = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.nodes.id"), nullable=False)
    format = Column(Text, nullable=False)
    orbit_level = Column(SmallInteger, nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text)
    media_url = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False)


class EloEdge(EloBase):
    __tablename__ = "edges"
    __table_args__ = (
        CheckConstraint("node_low < node_high"),
        {"schema": ELO_SCHEMA},
    )

    node_low = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.nodes.id"), primary_key=True)
    node_high = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.nodes.id"), primary_key=True)
    pcr_score = Column(Integer, nullable=False)
    verified_exchanges = Column(Integer, nullable=False)
    mutual_key_signed = Column(Boolean, nullable=False)
    orbit_level = Column(SmallInteger, nullable=False)
    last_exchange_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), nullable=False)


class EloInteraction(EloBase):
    __tablename__ = "interactions"
    __table_args__ = {"schema": ELO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True)
    post_id = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.posts.id"), nullable=False)
    sender_node_id = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.nodes.id"), nullable=False)
    kind = Column(Text, nullable=False)
    content = Column(Text)
    status = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    reciprocated_at = Column(DateTime(timezone=True))


class EloHandshake(EloBase):
    __tablename__ = "handshakes"
    __table_args__ = {"schema": ELO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True)
    requester_node_id = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.nodes.id"), nullable=False)
    target_node_id = Column(UUID(as_uuid=True), ForeignKey(f"{ELO_SCHEMA}.nodes.id"), nullable=False)
    status = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True))
