"""
services/reputation_engine.py — Imobverse Reputation Engine
════════════════════════════════════════════════════════════════
Motor de penalidades para o motor de reputação de imóveis.

Regras de negócio:
  - Deterioração "critico" → penaliza -1.5 na reputation_score do imóvel
  - Se reputation_score < 3.2 → imóvel entra em status=unhealthy (limbo)
  - Imóveis unhealthy desaparecem do índice público imediatamente (sem deleção)
  - owner_baseline_url é IMUTÁVEL — apenas owner pode definir no cadastro

Segurança:
  - Pydantic v1-style models para validação rigorosa do payload do webhook
  - Isolamento por UUIDs em todos os IDs de entidade
  - Nunca modifica owner_baseline_url via webhook — campo protegido
"""

import logging
from pydantic import BaseModel, Field

from sqlalchemy.orm import Session
from models.imobverse import (
    ImobInspectionItem, ImobProperty,
    InspectionStatus, PropertyStatus
)

logger = logging.getLogger(__name__)


# ── Esquemas Pydantic para Contratos de Dados ─────────────────────────────────

class InspectionAnalysisWebhook(BaseModel):
    """
    Payload esperado do motor de análise fotográfica (IA de visão ou serviço externo).
    O campo `grau_de_deterioracao` é validado via regex para bloquear valores arbitrários.
    """
    inspection_item_id: str
    paridade_angulo_valida: bool
    divergencia_detectada: bool
    grau_de_deterioracao: str = Field(
        ...,
        pattern=r"^(nenhum|leve|critico)$",
        description="Grau de deterioracao detectado: 'nenhum', 'leve' ou 'critico'"
    )
    justificativa: str = Field(..., min_length=10, max_length=1000)

    class Config:
        # Pydantic v1 config (compatível com a versão usada no projeto)
        str_strip_whitespace = True


class PropertyPublicResponse(BaseModel):
    """Schema de resposta pública — street_address NUNCA incluído."""
    id: str
    title: str
    price: float
    deal_type: str
    property_type: str
    city: str
    neighborhood: str
    bedrooms: str | None
    bathrooms: str | None
    area_m2: float | None
    cover_image_url: str | None
    reputation_score: float
    status: str

    class Config:
        from_attributes = True


class LeadCreate(BaseModel):
    """Schema de entrada de lead com sanitização rigorosa."""
    property_id: str
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    customer_phone: str = Field(..., min_length=7, max_length=30)
    message: str | None = Field(None, max_length=500)


class InspectionItemCreate(BaseModel):
    """Schema para criação de item de vistoria pelo proprietário."""
    property_id: str
    component_name: str = Field(..., min_length=2, max_length=100)
    owner_baseline_url: str = Field(..., min_length=10, max_length=512)


class CheckoutPhotoSubmit(BaseModel):
    """Payload de submissão de foto de check-out pelo locatário."""
    inspection_item_id: str
    checkout_url: str = Field(..., min_length=10, max_length=512)


# ── Reputation Engine Service ─────────────────────────────────────────────────

# Threshold abaixo do qual o imóvel é "expulso" do índice público
UNHEALTHY_THRESHOLD = 3.2

# Penalidade aplicada por divergência crítica detectada
CRITICAL_PENALTY = 1.5


class ReputationEngineService:
    """
    Serviço que aplica penalidades no motor de reputação dos imóveis.
    Executado de forma síncrona (Session SQLAlchemy padrão do projeto).
    """

    @staticmethod
    def process_checkout_analysis(
        db: Session,
        analysis: InspectionAnalysisWebhook
    ) -> dict:
        """
        Processa o resultado da análise fotográfica de check-out.

        Fluxo:
          1. Valida e busca o InspectionItem pelo UUID
          2. Atualiza status e analysis_log do item
          3. Se deterioração crítica → penaliza a reputação do Property
          4. Se score < threshold → status = unhealthy (soft-remove da listagem pública)
          5. Commita e retorna o estado final do imóvel

        Segurança:
          - Nunca altera owner_baseline_url
          - Nunca expõe stack trace — erros logados internamente
        """
        # 1. Busca o item de inspeção
        inspection_item: ImobInspectionItem | None = (
            db.query(ImobInspectionItem)
            .filter(ImobInspectionItem.id == analysis.inspection_item_id)
            .first()
        )

        if not inspection_item:
            logger.error(f"[ReputationEngine] InspectionItem nao encontrado: {analysis.inspection_item_id}")
            raise ValueError(f"InspectionItem nao encontrado: {analysis.inspection_item_id}")

        # 2. Atualiza os dados da auditoria fotográfica
        inspection_item.analysis_log = analysis.justificativa
        inspection_item.deterioration_grade = analysis.grau_de_deterioracao
        inspection_item.status = (
            InspectionStatus.REJECTED
            if analysis.divergencia_detectada
            else InspectionStatus.APPROVED
        )

        property_status = PropertyStatus.ACTIVE
        new_score = None

        # 3. Aplica penalidade apenas se deterioração for crítica
        if analysis.divergencia_detectada and analysis.grau_de_deterioracao == "critico":
            prop: ImobProperty | None = (
                db.query(ImobProperty)
                .filter(ImobProperty.id == inspection_item.property_id)
                .first()
            )

            if prop:
                # Penalizar — nunca abaixo de 0.0 (clamp)
                new_score = max(0.0, round(prop.reputation_score - CRITICAL_PENALTY, 2))
                prop.reputation_score = new_score

                # 4. Gatilho de rebaixamento para o limbo dos insalubres
                if new_score < UNHEALTHY_THRESHOLD:
                    prop.status = PropertyStatus.UNHEALTHY
                    property_status = PropertyStatus.UNHEALTHY
                    logger.warning(
                        f"[ReputationEngine] IMOVEL UNHEALTHY | property_id={prop.id} | "
                        f"score={new_score} | threshold={UNHEALTHY_THRESHOLD}"
                    )
                else:
                    property_status = prop.status

                logger.info(
                    f"[ReputationEngine] Penalidade aplicada | property_id={prop.id} | "
                    f"novo_score={new_score} | status={property_status}"
                )

        db.commit()
        logger.info(
            f"[ReputationEngine] Analise processada | item_id={analysis.inspection_item_id} | "
            f"divergencia={analysis.divergencia_detectada} | grau={analysis.grau_de_deterioracao}"
        )

        return {
            "inspection_item_id": inspection_item.id,
            "inspection_status": inspection_item.status,
            "property_status": property_status,
            "new_reputation_score": new_score,
            "penalty_applied": analysis.divergencia_detectada and analysis.grau_de_deterioracao == "critico",
        }

    @staticmethod
    def submit_checkout_photo(
        db: Session,
        payload: CheckoutPhotoSubmit,
        tenant_user_id: str
    ) -> dict:
        """
        Registra a foto de check-out enviada pelo locatário.
        Apenas o campo `checkout_url` é atualizado — `owner_baseline_url` é protegido.
        """
        inspection_item = (
            db.query(ImobInspectionItem)
            .filter(ImobInspectionItem.id == payload.inspection_item_id)
            .first()
        )

        if not inspection_item:
            raise ValueError("Item de vistoria nao encontrado.")

        # Segurança: apenas append de checkout_url — baseline protegido
        inspection_item.checkout_url = payload.checkout_url
        inspection_item.status = InspectionStatus.PENDING  # Aguarda nova análise

        db.commit()
        logger.info(
            f"[ReputationEngine] Checkout photo enviada | item_id={payload.inspection_item_id} | "
            f"tenant_id={tenant_user_id}"
        )
        return inspection_item.to_dict()
