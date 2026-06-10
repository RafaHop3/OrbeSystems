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


class SeniorMatchRequest(BaseModel):
    city: Optional[str] = None
    max_price: Optional[float] = None
    importance_accessibility: str = "high"  # high | medium | low
    importance_security: str = "high"       # high | medium | low
    importance_convenience: str = "medium"  # high | medium | low
    importance_silence: str = "medium"      # high | medium | low


def compute_senior_match(prop: ImobProperty, req: SeniorMatchRequest) -> dict:
    desc_lower = (prop.description or "").lower() + " " + (prop.title or "").lower()
    
    # 1. Accessibility Score (0 - 100)
    access_score = 30  # baseline
    if "elevador" in desc_lower or "elevator" in desc_lower:
        access_score += 40
    if "térreo" in desc_lower or "terreo" in desc_lower or "plana" in desc_lower or "sem escada" in desc_lower:
        access_score += 30
    if "acessibilidade" in desc_lower or "rampa" in desc_lower:
        access_score += 20
    if prop.property_type == "casa" and ("escada" not in desc_lower or "térrea" in desc_lower):
        access_score += 10
    access_score = min(100, access_score)
    
    # 2. Security Score (0 - 100)
    rep_points = (getattr(prop, "reputation_score", 5.0) / 5.0) * 60
    keyword_points = 10  # baseline
    if "portaria" in desc_lower or "porteiro" in desc_lower or "guarita" in desc_lower:
        keyword_points += 15
    if "câmera" in desc_lower or "camera" in desc_lower or "cftv" in desc_lower or "monitoramento" in desc_lower:
        keyword_points += 15
    if "segurança" in desc_lower or "seguranca" in desc_lower or "vigilância" in desc_lower:
        keyword_points += 10
    security_score = min(100, rep_points + keyword_points)
    
    # 3. Convenience Score (0 - 100)
    convenience_score = 20  # baseline
    if "hospital" in desc_lower or "clínica" in desc_lower or "clinica" in desc_lower or "médico" in desc_lower:
        convenience_score += 30
    if "farmácia" in desc_lower or "farmacia" in desc_lower or "drogaria" in desc_lower:
        convenience_score += 25
    if "supermercado" in desc_lower or "mercado" in desc_lower or "padaria" in desc_lower:
        convenience_score += 15
    if "parque" in desc_lower or "praça" in desc_lower or "praca" in desc_lower:
        convenience_score += 15
    if "metrô" in desc_lower or "metro" in desc_lower or "ônibus" in desc_lower or "onibus" in desc_lower:
        convenience_score += 10
    convenience_score = min(100, convenience_score)
    
    # 4. Silence/Tranquility Score (0 - 100)
    silence_score = 30  # baseline
    if "silencioso" in desc_lower or "silêncio" in desc_lower:
        silence_score += 40
    if "tranquilo" in desc_lower or "calmo" in desc_lower or "arborizado" in desc_lower:
        silence_score += 20
    if "fundos" in desc_lower or "vista livre" in desc_lower:
        silence_score += 10
    if "avenida" in desc_lower or "barulhento" in desc_lower or "trânsito" in desc_lower:
        silence_score -= 20
    silence_score = max(0, min(100, silence_score))
    
    # Weights based on request preferences
    weight_map = {"high": 3, "medium": 2, "low": 1}
    w_acc = weight_map.get(req.importance_accessibility.lower(), 2)
    w_sec = weight_map.get(req.importance_security.lower(), 2)
    w_con = weight_map.get(req.importance_convenience.lower(), 2)
    w_sil = weight_map.get(req.importance_silence.lower(), 2)
    
    total_weight = w_acc + w_sec + w_con + w_sil
    weighted_score = (
        (access_score * w_acc) +
        (security_score * w_sec) +
        (convenience_score * w_con) +
        (silence_score * w_sil)
    ) / total_weight
    
    # Adjust for budget
    price_penalty = 1.0
    if req.max_price and prop.price > req.max_price:
        excess = prop.price - req.max_price
        pct_excess = excess / req.max_price
        price_penalty = max(0.5, 1.0 - (pct_excess * 0.5))
        
    final_match_pct = round(weighted_score * price_penalty, 1)
    
    # Generate match reasons
    reasons = []
    if "elevador" in desc_lower:
        reasons.append("Edifício possui elevador para facilitar o acesso.")
    elif "térreo" in desc_lower or "terreo" in desc_lower:
        reasons.append("Imóvel no térreo, ideal para evitar escadas.")
    
    if "portaria" in desc_lower or "porteiro" in desc_lower:
        reasons.append("Segurança reforçada com portaria ou controle de acesso.")
    
    if "hospital" in desc_lower or "clínica" in desc_lower:
        reasons.append("Excelente localização próximo a hospitais ou clínicas médicas.")
    if "farmácia" in desc_lower or "farmacia" in desc_lower:
        reasons.append("Proximidade conveniente de farmácias e drogarias.")
        
    if "silencioso" in desc_lower or "tranquilo" in desc_lower:
        reasons.append("Ambiente residencial silencioso e muito tranquilo.")
        
    if getattr(prop, "reputation_score", 5.0) >= 4.5:
        reasons.append("Imóvel com reputação exemplar na plataforma (vistorias aprovadas).")
        
    if not reasons:
        reasons.append("Imóvel atende aos critérios gerais de conforto e segurança.")
        
    return {
        "property": prop.to_public_dict(),
        "match_percentage": final_match_pct,
        "breakdown": {
            "accessibility": access_score,
            "security": round(security_score, 1),
            "convenience": convenience_score,
            "silence": silence_score
        },
        "match_reasons": reasons[:3]
    }


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


@router.post("/senior-match")
def senior_match(payload: SeniorMatchRequest, db: Session = Depends(get_db)):
    """
    Algoritmo de Matchmaking Inteligente para Idosos (Sênior).
    Garante a busca perfeita por acessibilidade, segurança, silêncio e serviços.
    """
    query = db.query(ImobProperty).filter(
        ImobProperty.status == PropertyStatus.ACTIVE,
        ImobProperty.is_published == True
    )
    if payload.city:
        query = query.filter(ImobProperty.city.ilike(f"%{payload.city}%"))
        
    properties = query.all()
    
    # Se não houver imóveis cadastrados no banco de dados local, usaremos dados fictícios sênior de demonstração para garantir o funcionamento do Match
    if not properties:
        logger.info("[Imobverse Match] Banco de dados vazio. Utilizando dados de demonstração.")
        properties = [
            ImobProperty(
                id="demo-senior-1",
                owner_id="demo-owner",
                title="Apartamento Acessível Jardim Paulista",
                description="Lindo apartamento plano, sem degraus de acesso, com elevador moderno e rampas. Localizado em rua residencial muito silenciosa e arborizada. Portaria presencial com segurança 24h e câmeras. A apenas 150 metros de farmácia e do Hospital das Clínicas.",
                price=3200.0,
                deal_type="aluguel",
                property_type="apartamento",
                bedrooms="2",
                bathrooms="2",
                area_m2=80.0,
                city="São Paulo",
                neighborhood="Jardim Paulista",
                cover_image_url="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop",
                reputation_score=4.9,
                status="active"
            ),
            ImobProperty(
                id="demo-senior-2",
                owner_id="demo-owner",
                title="Casa Térrea Tranquila em Vila Mariana",
                description="Casa totalmente térrea (plana, sem escadas) em condomínio fechado com portão eletrônico, guarita e câmeras de monitoramento. Bairro extremamente calmo, rua sem saída muito silenciosa. A 300m de um grande supermercado, padaria e drogaria.",
                price=4500.0,
                deal_type="aluguel",
                property_type="casa",
                bedrooms="3",
                bathrooms="2",
                area_m2=120.0,
                city="São Paulo",
                neighborhood="Vila Mariana",
                cover_image_url="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop",
                reputation_score=4.7,
                status="active"
            ),
            ImobProperty(
                id="demo-senior-3",
                owner_id="demo-owner",
                title="Studio Moderno Centro Histórico",
                description="Studio compacto no 4º andar. Acesso apenas por escadas (sem elevador). Localizado em avenida muito movimentada, barulhenta e com trânsito intenso de ônibus. Sem portaria presencial. Próximo a bares e restaurantes.",
                price=1800.0,
                deal_type="aluguel",
                property_type="apartamento",
                bedrooms="1",
                bathrooms="1",
                area_m2=35.0,
                city="São Paulo",
                neighborhood="Centro",
                cover_image_url="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop",
                reputation_score=4.2,
                status="active"
            ),
            ImobProperty(
                id="demo-senior-4",
                owner_id="demo-owner",
                title="Apartamento Confortável com Elevador em Moema",
                description="Apartamento ensolarado com excelente ventilação natural. Condomínio possui elevador acessível. Câmeras de segurança no hall. Próximo ao parque do Ibirapuera, drogaria na esquina e ponto de ônibus a 100m. Rua calma e arborizada.",
                price=3800.0,
                deal_type="aluguel",
                property_type="apartamento",
                bedrooms="2",
                bathrooms="1",
                area_m2=65.0,
                city="São Paulo",
                neighborhood="Moema",
                cover_image_url="https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop",
                reputation_score=4.5,
                status="active"
            )
        ]
        
    results = []
    for prop in properties:
        match_data = compute_senior_match(prop, payload)
        if payload.max_price and prop.price > payload.max_price * 1.5:
            continue
        results.append(match_data)
        
    results.sort(key=lambda x: x["match_percentage"], reverse=True)
    return results


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
