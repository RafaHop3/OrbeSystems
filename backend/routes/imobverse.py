"""
routes/imobverse.py — Imobverse API Router
════════════════════════════════════════════
Endpoints da plataforma proptech Imobverse integrada ao portal Orbe Systems.

Rotas públicas (sem auth):
  GET  /imobverse/properties          → Listagem pública (sem street_address, apenas ACTIVE)
  GET  /imobverse/properties/{id}     → Detalhe público de imóvel
  POST /imobverse/leads               → Envio de lead por visitante

Rotas Premium (require_premium JWT):
  POST /imobverse/properties          → Cadastrar novo imóvel
  GET  /imobverse/my-properties       → Listar imóveis do próprio anunciante
  POST /imobverse/inspections         → Criar item de vistoria (baseline do proprietário)
  POST /imobverse/inspections/checkout → Locatário submete foto de check-out
  POST /imobverse/inspections/analyze  → Webhook do motor de análise fotográfica

Segurança:
  - street_address mascarado em todas as rotas públicas
  - Apenas imóveis status=ACTIVE retornados na listagem pública
  - owner_baseline_url protegido de edição via endpoint de checkout
  - Payload do webhook validado rigorosamente pelo Pydantic
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from config import settings
from database import get_db
from security.auth import require_premium
from models.users import User
from models.imobverse import (
    ImobProperty, ImobInspectionItem, ImobLead,
    PropertyStatus, InspectionStatus, DealType, PropertyType
)
from services.reputation_engine import (
    ReputationEngineService,
    InspectionAnalysisWebhook,
    LeadCreate,
    InspectionItemCreate,
    CheckoutPhotoSubmit,
)

router = APIRouter(prefix="/imobverse", tags=["imobverse"])
logger = logging.getLogger(__name__)


# ── Schemas de Input das Rotas ────────────────────────────────────────────────

class PropertyCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=20, max_length=5000)
    price: float = Field(..., gt=0)
    deal_type: str = Field(default=DealType.RENT, pattern=r"^(venda|aluguel)$")
    property_type: str = Field(default=PropertyType.APARTMENT)
    bedrooms: Optional[str] = Field(None, max_length=5)
    bathrooms: Optional[str] = Field(None, max_length=5)
    area_m2: Optional[float] = Field(None, gt=0)
    city: str = Field(..., min_length=2, max_length=100)
    neighborhood: str = Field(..., min_length=2, max_length=100)
    street_address: Optional[str] = Field(None, max_length=200)
    cover_image_url: Optional[str] = Field(None, max_length=512)
    images_json: Optional[str] = None


# ── Rotas Públicas ────────────────────────────────────────────────────────────

@router.get("/properties")
def list_properties(
    city: Optional[str] = Query(None),
    deal_type: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, gt=0),
    max_price: Optional[float] = Query(None, gt=0),
    bedrooms: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Listagem pública de imóveis ativos com filtros.
    SEGURANÇA: street_address NUNCA retornado. Apenas imóveis status=ACTIVE.
    """
    query = db.query(ImobProperty).filter(
        ImobProperty.status == PropertyStatus.ACTIVE,
        ImobProperty.is_published == True
    )

    # Filtros opcionais
    if city:
        query = query.filter(ImobProperty.city.ilike(f"%{city}%"))
    if deal_type:
        query = query.filter(ImobProperty.deal_type == deal_type)
    if property_type:
        query = query.filter(ImobProperty.property_type == property_type)
    if min_price:
        query = query.filter(ImobProperty.price >= min_price)
    if max_price:
        query = query.filter(ImobProperty.price <= max_price)
    if bedrooms:
        query = query.filter(ImobProperty.bedrooms == bedrooms)

    properties = query.order_by(ImobProperty.reputation_score.desc()).limit(50).all()

    return [p.to_public_dict() for p in properties]


@router.get("/properties/{property_id}")
def get_property(property_id: str, db: Session = Depends(get_db)):
    """
    Detalhe público de um imóvel. street_address mascarado.
    """
    prop = db.query(ImobProperty).filter(
        ImobProperty.id == property_id,
        ImobProperty.status == PropertyStatus.ACTIVE
    ).first()

    if not prop:
        raise HTTPException(status_code=404, detail="Imovel nao encontrado ou nao disponivel.")

    return prop.to_public_dict()


@router.post("/leads", status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    """
    Visitante manifesta interesse em um imóvel e gera um lead.
    Retorna link de contato para WhatsApp do proprietário (sem expor número diretamente).
    """
    # Verifica se o imóvel existe e está ativo
    prop = db.query(ImobProperty).filter(
        ImobProperty.id == payload.property_id,
        ImobProperty.status == PropertyStatus.ACTIVE
    ).first()

    if not prop:
        raise HTTPException(status_code=404, detail="Imovel nao encontrado.")

    # Cria o lead
    lead = ImobLead(
        property_id=payload.property_id,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        message=payload.message,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    logger.info(f"[Imobverse] Lead criado | property_id={payload.property_id} | email={payload.customer_email}")

    # Gera link WhatsApp pré-formatado (sem expor número do proprietário ao frontend)
    msg = f"Olá! Vi o imóvel '{prop.title}' no Imobverse e tenho interesse. Meu nome é {payload.customer_name}."
    if payload.message:
        msg += f" Mensagem: {payload.message}"

    return {
        "lead_id": lead.id,
        "message": "Lead registrado com sucesso.",
        "property_title": prop.title,
        "contact_prompt": msg,
    }


# ── Rotas Premium (Anunciante Autenticado) ────────────────────────────────────

@router.post("/properties", status_code=201)
def create_property(
    payload: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """Cria um novo anúncio de imóvel. Apenas usuários Premium."""
    prop = ImobProperty(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        deal_type=payload.deal_type,
        property_type=payload.property_type,
        bedrooms=payload.bedrooms,
        bathrooms=payload.bathrooms,
        area_m2=payload.area_m2,
        city=payload.city,
        neighborhood=payload.neighborhood,
        street_address=payload.street_address,
        cover_image_url=payload.cover_image_url,
        images_json=payload.images_json,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)

    logger.info(f"[Imobverse] Imovel criado | id={prop.id} | owner={current_user.email}")
    return prop.to_owner_dict()


@router.get("/my-properties")
def list_my_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """Lista todos os imóveis do anunciante autenticado (inclui street_address)."""
    properties = db.query(ImobProperty).filter(
        ImobProperty.owner_id == current_user.id
    ).order_by(ImobProperty.created_at.desc()).all()

    return [p.to_owner_dict() for p in properties]


@router.post("/inspections", status_code=201)
def create_inspection_item(
    payload: InspectionItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """
    Proprietário cria um item de vistoria com a foto baseline do componente.
    O owner_baseline_url é imutável — não pode ser alterado por outros endpoints.
    """
    # Verificar que o imóvel pertence ao usuário autenticado
    prop = db.query(ImobProperty).filter(
        ImobProperty.id == payload.property_id,
        ImobProperty.owner_id == current_user.id
    ).first()

    if not prop:
        raise HTTPException(status_code=403, detail="Imovel nao encontrado ou sem permissao de acesso.")

    item = ImobInspectionItem(
        property_id=payload.property_id,
        component_name=payload.component_name,
        owner_baseline_url=payload.owner_baseline_url,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    logger.info(f"[Imobverse] InspectionItem criado | id={item.id} | property={payload.property_id}")
    return item.to_dict()


@router.get("/properties/{property_id}/inspections")
def list_property_inspections(
    property_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """
    Lista todos os itens de vistoria para um imóvel específico do anunciante premium.
    """
    prop = db.query(ImobProperty).filter(
        ImobProperty.id == property_id,
        ImobProperty.owner_id == current_user.id
    ).first()

    if not prop:
        raise HTTPException(status_code=403, detail="Imovel nao encontrado ou sem permissao de acesso.")

    inspections = db.query(ImobInspectionItem).filter(
        ImobInspectionItem.property_id == property_id
    ).order_by(ImobInspectionItem.created_at.desc()).all()

    return [item.to_dict() for item in inspections]



@router.post("/inspections/checkout")
def submit_checkout_photo(
    payload: CheckoutPhotoSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """
    Locatário envia foto de check-out de um componente para comparação com o baseline.
    SEGURANÇA: owner_baseline_url não pode ser alterado aqui.
    """
    try:
        result = ReputationEngineService.submit_checkout_photo(
            db, payload, tenant_user_id=current_user.id
        )
        
        # Agenda a análise automatizada via LLM em background
        from services.reputation_engine import run_automated_analysis
        from database import SessionLocal
        background_tasks.add_task(run_automated_analysis, result["id"], SessionLocal)
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/inspections/analyze")
def process_inspection_analysis(
    analysis: InspectionAnalysisWebhook,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    """
    Webhook do motor de análise fotográfica.
    Recebe o resultado da IA e aplica as penalidades de reputação no imóvel.
    HTTP 422 automático se o payload violar as regras do Pydantic.
    """
    try:
        result = ReputationEngineService.process_checkout_analysis(db, analysis)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[Imobverse] Erro no motor de reputacao: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno no motor de reputacao.")
