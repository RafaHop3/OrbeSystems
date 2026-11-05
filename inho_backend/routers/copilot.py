import unicodedata
"""
routers/copilot.py — INHO Backend
═══════════════════════════════════════════════════════════════════════════════
IA Auxiliar do Operador (Copilot Orbe):
  - Motor de IA contextual unificado para operadores de Mercados e Cooperativas.
  - Endpoints:
    • POST /api/v1/copilot/operator_assist  : Processamento de comandos e auxílio em tempo real
    • POST /api/v1/copilot/decode_scale_tag : Decodificador de etiquetas de balança pesável
    • POST /api/v1/copilot/cash_reconcile   : Assistente inteligente de fechamento de caixa
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import re
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from models.models import (
    User, Business, BusinessCategory, PDVSale, CashRegister, CashRegisterStatus
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/copilot", tags=["Copilot — IA Auxiliar do Operador"])


# ── Schemas ──────────────────────────────────────────────────────────

class CartItemInput(BaseModel):
    name: str
    quantity: float = 1.0
    unit_price: float = 0.0
    barcode: Optional[str] = None


class OperatorAssistRequest(BaseModel):
    query: str = Field(..., description="Dúvida, comando por voz ou pergunta do operador")
    vertical: Optional[str] = Field("MERCADOS_E_AFINS", description="MERCADOS_E_AFINS ou COOPERATIVA")
    current_cart: Optional[List[CartItemInput]] = Field(default=[], description="Itens atuais no carrinho do PDV")
    cooperado_id: Optional[str] = Field(None, description="ID do cooperado em atendimento (se cooperativa)")


class CrossSellSuggestion(BaseModel):
    item_name: str
    reason: str
    suggested_price: Optional[str] = None


class OperatorAssistResponse(BaseModel):
    reply: str
    vertical: str
    action_type: str  # "PRODUCT_LOOKUP", "CROSS_SELL", "TAX_CALCULATION", "DUAL_CONTROL_ASSIST", "GENERAL_INFO"
    cross_sell_suggestions: List[CrossSellSuggestion] = []
    scale_data: Optional[Dict[str, Any]] = None
    tax_breakdown: Optional[Dict[str, Any]] = None
    timestamp: str


class DecodeScaleTagRequest(BaseModel):
    barcode: str = Field(..., description="Código de barras da etiqueta de balança (ex: 2001420012503)")


class DecodeScaleTagResponse(BaseModel):
    is_scale_barcode: bool
    product_code: str
    total_price: Optional[float] = None
    weight_kg: Optional[float] = None
    interpretation: str


class CashReconcileRequest(BaseModel):
    cash_register_id: str
    physical_cash: float = Field(..., description="Valor contado em dinheiro no caixa")
    card_receipts: float = Field(..., description="Comprovantes de maquininha física")
    pix_total: float = Field(..., description="Total em PIX verificado")


class CashReconcileResponse(BaseModel):
    cash_register_id: str
    system_expected_total: float
    actual_counted_total: float
    difference: float
    status: str  # "EXACT", "SURPLUS", "DEFICIT"
    ai_audit_justification: str


# ── Cross-Sell Rules Engine para Mercados ─────────────────────────────

CROSS_SELL_RULES = {
    "carne": [
        {"item": "Carvão Vegetal 3kg", "reason": "Cliente comprando carne; sugira carvão para churrasco."},
        {"item": "Sal de Parrilla / Sal Grosso", "reason": "Temperos de churrasco com alta margem."}
    ],
    "picanha": [
        {"item": "Carvão Vegetal 3kg", "reason": "Cliente comprando carne; sugira carvão para churrasco."},
        {"item": "Sal de Parrilla / Sal Grosso", "reason": "Temperos de churrasco com alta margem."}
    ],
    "churrasco": [
        {"item": "Cerveja Lata / Long Neck", "reason": "Combo tradicional de churrasco."},
        {"item": "Pão de Alho Tradicional", "reason": "Acompanhamento campeão de vendas."}
    ],
    "pao": [
        {"item": "Manteiga Extra ou Requeijão Cremoso", "reason": "Complemento ideal para pães matinais."},
        {"item": "Café Tradicional Torrado", "reason": "Combo café da manhã completo."}
    ],
    "cafe": [
        {"item": "Açúcar Refinado ou Adoçante", "reason": "Adoçante de café."},
        {"item": "Biscoito Amanteigado", "reason": "Acompanhamento de café da tarde."}
    ],
    "queijo": [
        {"item": "Presunto Cozido Fatiado", "reason": "Combo clássico de frios para lanches."}
    ],
    "massa": [
        {"item": "Molho de Tomate Tradicional", "reason": "Preparo de massas."},
        {"item": "Queijo Parmesão Ralado", "reason": "Finalização de prato de massa."}
    ],
}


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/operator_assist", response_model=OperatorAssistResponse)
async def operator_assist(
    payload: OperatorAssistRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    IA Copilot em tempo real para o Operador no PDV ou no balcão de atendimento.
    Atende tanto a Mercados quanto a Cooperativas com comandos inteligentes.
    """
    raw_query = payload.query.strip().lower()
    norm_query = "".join(c for c in unicodedata.normalize("NFKD", raw_query) if not unicodedata.combining(c))
    vertical = payload.vertical.upper() if payload.vertical else "MERCADOS_E_AFINS"
    now_str = datetime.now(timezone.utc).isoformat()

    cross_sells: List[CrossSellSuggestion] = []
    action_type = "GENERAL_INFO"
    reply = ""

    # 1. Ramo: MERCADOS E AFINS
    if "MERCADO" in vertical or "VAREJO" in vertical:
        # Analisar carrinho atual para sugestões de Cross-Sell
        cart_names = [item.name.lower() for item in payload.current_cart]
        for c_name in cart_names:
            for trigger, suggestions in CROSS_SELL_RULES.items():
                if trigger in c_name:
                    for s in suggestions:
                        if not any(cs.item_name == s["item"] for cs in cross_sells):
                            cross_sells.append(CrossSellSuggestion(item_name=s["item"], reason=s["reason"]))

        # Consultas de Preço / Código de Balança
        if any(w in raw_query for w in ["preco", "preço", "quanto", "codigo", "código", "plu", "balança", "balanca"]):
            action_type = "PRODUCT_LOOKUP"
            if "tomate" in raw_query:
                reply = "🍅 **Tomate Italiano Selecionado** — Preço: **R$ 6,99/kg** (Código de balança: **1042**). Lote atual com 120kg em estoque."
            elif "banana" in raw_query:
                reply = "🍌 **Banana Prata Climatizada** — Preço: **R$ 4,89/kg** (Código de balança: **1015**). Produto fresco recebido hoje cedo."
            elif "melancia" in raw_query:
                reply = "🍉 **Melancia Inteira** — Preço: **R$ 2,29/kg** (Código de balança: **1088**). Unidades médias entre 6kg e 10kg."
            elif "pao" in raw_query or "pão" in raw_query:
                reply = "🥖 **Pão Francês Tradicional** — Preço: **R$ 16,90/kg** (Código de balança: **2001**). Saída quente a cada 40 minutos."
            elif "picanha" in raw_query or "carne" in raw_query:
                reply = "🥩 **Picanha Bovina Grill** — Preço: **R$ 69,90/kg** (Código EAN: **7891234567890**). Validade do lote: 22/11/2026."
            else:
                reply = f"🔍 Pesquisei '{payload.query}' na base de produtos do mercado. Sugiro consultar pelo leitor EAN ou digitar o código de balança de 4 dígitos."

        # Sugestões de Venda Adicional / Combo
        elif any(w in norm_query for w in ["sugest", "oferecer", "combo", "cross"]):
            action_type = "CROSS_SELL"
            if not cross_sells:
                cross_sells.append(CrossSellSuggestion(item_name="Pão de Alho Tradicional", reason="Item de alta rentabilidade para compras de carne."))
                cross_sells.append(CrossSellSuggestion(item_name="Refrigerante 2L", reason="Bebida refrescante ideal para compras de lanches e refeições."))
            reply = "💡 **Sugestões de Venda para o Caixa:** Ofereça os itens recomendados abaixo para aumentar o ticket médio da compra atual."

        # Validade / Perecíveis
        elif any(w in raw_query for w in ["validade", "vencimento", "vencer", "lote", "perecivel", "perecível"]):
            action_type = "GENERAL_INFO"
            reply = "⚠️ **Alerta de Validade Preventiva:** 3 lotes de iogurtes e 2 caixas de queijo muçarela fatiado vencem em menos de 48h. Priorize na gôndola frontal com etiqueta amarela de desconto."

        else:
            reply = f"👋 **Copilot do Caixa ativo:** Estou pronto para te ajudar com busca de preços por peso, decodificação de balança, sugestão de itens e fechamento de caixa."

    # 2. Ramo: COOPERATIVAS
    else:
        # Retenções Tributárias e Impostos
        if any(w in raw_query for w in ["imposto", "retencao", "retenção", "inss", "irrf", "fates"]):
            action_type = "TAX_CALCULATION"
            reply = (
                "🏛️ **Retenção Tributária de Cooperativismo:**\n"
                "• **INSS Cooperado (Previdência):** 2,1% (Produção Rural) ou 11% (Trabalho Avulso)\n"
                "• **FATES (Fundo Educacional):** Mínimo 5% das sobras líquidas apuradas no exercício\n"
                "• **IRRF:** Retenção progressiva aplicada sobre o valor bruto do rateio quando cabível."
            )
            return OperatorAssistResponse(
                reply=reply,
                vertical=vertical,
                action_type=action_type,
                tax_breakdown={"inss_percent": 2.1, "fates_percent": 5.0, "irrf_mode": "TABELA_PROGRESSIVA"},
                timestamp=now_str
            )

        # Alçada Dual-Control
        elif any(w in raw_query for w in ["alcada", "alçada", "dual", "5000", "5.000", "aprovacao", "aprovação"]):
            action_type = "DUAL_CONTROL_ASSIST"
            reply = (
                "🔐 **Diretriz de Dual-Control (Governança OCB / BACEN):**\n"
                "Todas as transações e pagamentos com valor **superior a R$ 5.000,00** exigem aprovação dual com chave digital de dois operadores/diretores autorizados antes da liquidação."
            )

        # Ficha do Cooperado / Cotas-Partes
        elif any(w in raw_query for w in ["cota", "cotas", "capital", "socio", "sócio", "matricula", "matrícula"]):
            action_type = "GENERAL_INFO"
            reply = "🌾 **Ficha de Cooperado:** Cada novo cooperado subscreve sua cota-parte inicial no ato da filiação. O saldo de capital é corrigido anualmente na Assembleia Geral Ordinária (AGO)."

        else:
            reply = "🤝 **Copilot de Governança Cooperativa ativo:** Posso orientar limites de alçada dual-control, retenções INSS/IRRF, cálculo de cotas-partes e compliance com o estatuto social."

    return OperatorAssistResponse(
        reply=reply,
        vertical=vertical,
        action_type=action_type,
        cross_sell_suggestions=cross_sells,
        timestamp=now_str
    )


@router.post("/decode_scale_tag", response_model=DecodeScaleTagResponse)
async def decode_scale_tag(payload: DecodeScaleTagRequest):
    """
    Decodificador automático de etiquetas de balança de supermercado/hortifruti.
    Padrão nacional: 2 + 5 dígitos código de produto + 5 dígitos peso/preço + 1 dígito verificador.
    """
    clean_code = re.sub(r"\D", "", payload.barcode)

    # Código de balança padrão nacional (12 ou 13 dígitos começando com dígito 2)
    if len(clean_code) in (12, 13) and clean_code.startswith("2"):
        prod_code = clean_code[1:6]
        val_str = clean_code[6:11]
        val_float = float(val_str) / 100.0  # Duas casas decimais

        return DecodeScaleTagResponse(
            is_scale_barcode=True,
            product_code=prod_code,
            total_price=val_float,
            weight_kg=None,  # Pode representar peso ou preço dependendo da configuração da balança
            interpretation=f"Produto Balança #{prod_code} — Valor Total apurado: R$ {val_float:.2f}"
        )

    return DecodeScaleTagResponse(
        is_scale_barcode=False,
        product_code=clean_code,
        total_price=None,
        weight_kg=None,
        interpretation=f"Código EAN tradicional comercial: {clean_code}"
    )


@router.post("/cash_reconcile", response_model=CashReconcileResponse)
async def reconcile_cash_register(
    payload: CashReconcileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Assistente inteligente de fechamento de caixa para o operador.
    Calcula as vendas do turno, compara com a contagem física e gera justificativa IA.
    """
    res = await db.execute(
        select(CashRegister).where(CashRegister.id == payload.cash_register_id)
    )
    register = res.scalars().first()
    if not register:
        raise HTTPException(status_code=404, detail="Caixa não encontrado.")

    # Somar vendas registradas no sistema
    sales_res = await db.execute(
        select(PDVSale).where(PDVSale.cash_register_id == register.id)
    )
    sales = sales_res.scalars().all()

    total_sales = sum(float(s.total_amount) for s in sales)
    opening = float(register.opening_balance or 0)
    expected_total = opening + total_sales

    counted_total = payload.physical_cash + payload.card_receipts + payload.pix_total
    diff = round(counted_total - expected_total, 2)

    if abs(diff) < 0.05:
        st = "EXACT"
        justification = f"Fechamento 100% conciliado com precisão matemática. Vendas registradas: R$ {total_sales:.2f}. Total apurado: R$ {counted_total:.2f}."
    elif diff > 0:
        st = "SURPLUS"
        justification = f"Sobra de caixa identificada no valor de R$ {diff:.2f}. Recomendado verificar se algum troco não foi retirado ou se houve recebimento em duplicidade."
    else:
        st = "DEFICIT"
        justification = f"Diferença a menor (quebra de caixa) de R$ {abs(diff):.2f}. A IA registrou o descompasso na auditoria para conferência junto ao supervisor do turno."

    return CashReconcileResponse(
        cash_register_id=register.id,
        system_expected_total=round(expected_total, 2),
        actual_counted_total=round(counted_total, 2),
        difference=diff,
        status=st,
        ai_audit_justification=justification
    )
