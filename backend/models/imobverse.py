"""
models/imobverse.py — Imobverse Data Models
════════════════════════════════════════════════
Entidades centrais do MVP da proptech Imobverse.

Tabelas:
  - imob_properties      → Imóveis cadastrados pelos anunciantes
  - imob_inspection_items → Evidências fotográficas de vistorias
  - imob_leads            → Leads gerados por visitantes interessados

Segurança:
  - UUIDs em todas as PKs (previne ID harvesting)
  - street_address mascarado por padrão nas rotas públicas
  - CheckConstraint em reputation_score (0.0 - 5.0)
  - ON CASCADE DELETE em inspection_items e leads
"""

from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Float, Boolean, DateTime,
    ForeignKey, CheckConstraint
)
from database import Base


# ── Status Enums (como strings constantes) ──────────────────────────────────

class PropertyStatus:
    ACTIVE    = "active"
    UNHEALTHY = "unhealthy"   # Limbo dos imóveis insalubres (fora do índice público)
    INACTIVE  = "inactive"

class InspectionStatus:
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class DealType:
    SALE   = "venda"
    RENT   = "aluguel"

class PropertyType:
    HOUSE      = "casa"
    APARTMENT  = "apartamento"
    LAND       = "terreno"
    COMMERCIAL = "comercial"


# ── Property ─────────────────────────────────────────────────────────────────

class ImobProperty(Base):
    """
    Imóvel cadastrado por um anunciante autenticado.
    O campo `street_address` é SENSÍVEL — nunca expor a visitantes não autenticados.
    O campo `reputation_score` é controlado exclusivamente pelo ReputationEngineService.
    """
    __tablename__ = "imob_properties"
    __table_args__ = (
        CheckConstraint(
            "reputation_score >= 0.0 AND reputation_score <= 5.0",
            name="check_imob_reputation_range"
        ),
    )

    id               = Column(String, primary_key=True, default=lambda: str(uuid4()))
    owner_id         = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Informações do anúncio
    title            = Column(String(150), nullable=False)
    description      = Column(Text, nullable=False)
    price            = Column(Float, nullable=False)
    deal_type        = Column(String(20), nullable=False, default=DealType.RENT)       # venda | aluguel
    property_type    = Column(String(30), nullable=False, default=PropertyType.APARTMENT) # casa | apartamento | etc.
    bedrooms         = Column(String(5), nullable=True)   # Guardado como string: "2", "3+", "Studio"
    bathrooms        = Column(String(5), nullable=True)
    area_m2          = Column(Float, nullable=True)

    # Localização — `street_address` é dado sensível, mascarado em rotas públicas
    city             = Column(String(100), nullable=False, index=True)
    neighborhood     = Column(String(100), nullable=False)
    street_address   = Column(String(200), nullable=True)   # Rua + Número — visível apenas pós-lead

    # Imagens principais (URLs Cloudinary, separadas por vírgula ou JSON string)
    cover_image_url  = Column(String(512), nullable=True)
    images_json      = Column(Text, nullable=True)          # JSON array de URLs

    # Motor de Reputação
    reputation_score = Column(Float, nullable=False, default=5.0, server_default="5.0")
    status           = Column(String(20), nullable=False, default=PropertyStatus.ACTIVE, server_default="active", index=True)

    # Controle de listagem pública — False oculta da listagem mesmo sem ser unhealthy
    is_published     = Column(Boolean, nullable=False, default=True, server_default="1")

    created_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at       = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_public_dict(self) -> dict:
        """Retorna dados seguros para exposição pública (sem street_address)."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "deal_type": self.deal_type,
            "property_type": self.property_type,
            "bedrooms": self.bedrooms,
            "bathrooms": self.bathrooms,
            "area_m2": self.area_m2,
            "city": self.city,
            "neighborhood": self.neighborhood,
            # street_address OMITIDA intencionalmente
            "cover_image_url": self.cover_image_url,
            "reputation_score": self.reputation_score,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_owner_dict(self) -> dict:
        """Retorna dados completos para o proprietário autenticado (inclui street_address)."""
        data = self.to_public_dict()
        data["street_address"] = self.street_address
        data["images_json"] = self.images_json
        data["is_published"] = self.is_published
        return data


# ── InspectionItem ────────────────────────────────────────────────────────────

class ImobInspectionItem(Base):
    """
    Evidência fotográfica de vistoria de um componente específico do imóvel.

    Ciclo de vida do status:
      pending  → (análise IA/manual) → approved | rejected

    Regra crítica de segurança:
      owner_baseline_url NUNCA pode ser alterado por requisições de locatários.
      Apenas o proprietário (owner_id) define o baseline na entrada.
    """
    __tablename__ = "imob_inspection_items"

    id                   = Column(String, primary_key=True, default=lambda: str(uuid4()))
    property_id          = Column(String, ForeignKey("imob_properties.id", ondelete="CASCADE"), nullable=False, index=True)

    component_name       = Column(String(100), nullable=False)  # Ex: "pia_cozinha", "quadro_eletrico"

    # URLs de evidência fotográfica (armazenadas em Cloudinary/S3)
    owner_baseline_url   = Column(String(512), nullable=False)   # Foto original do proprietário — IMUTÁVEL para locatários
    checkin_url          = Column(String(512), nullable=True)     # Foto enviada pelo locatário no check-in
    checkout_url         = Column(String(512), nullable=True)     # Foto enviada pelo locatário no check-out

    # Motor de Análise
    status               = Column(String(20), nullable=False, default=InspectionStatus.PENDING, server_default="pending", index=True)
    analysis_log         = Column(Text, nullable=True)            # JSON response do motor de IA ou laudo manual
    deterioration_grade  = Column(String(20), nullable=True)      # "nenhum" | "leve" | "critico"

    created_at           = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at           = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "property_id": self.property_id,
            "component_name": self.component_name,
            "owner_baseline_url": self.owner_baseline_url,
            "checkin_url": self.checkin_url,
            "checkout_url": self.checkout_url,
            "status": self.status,
            "deterioration_grade": self.deterioration_grade,
            "analysis_log": self.analysis_log,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ── Lead ──────────────────────────────────────────────────────────────────────

class ImobLead(Base):
    """
    Lead gerado por um visitante interessado em um imóvel.
    Dados de contato armazenados aqui — nunca expostos publicamente.
    """
    __tablename__ = "imob_leads"

    id              = Column(String, primary_key=True, default=lambda: str(uuid4()))
    property_id     = Column(String, ForeignKey("imob_properties.id", ondelete="CASCADE"), nullable=False, index=True)

    customer_name   = Column(String(100), nullable=False)
    customer_email  = Column(String(200), nullable=False)
    customer_phone  = Column(String(30), nullable=False)
    message         = Column(String(500), nullable=True)

    status          = Column(String(20), nullable=False, default="new", server_default="new")  # new | contacted | closed

    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "property_id": self.property_id,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "customer_phone": self.customer_phone,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
