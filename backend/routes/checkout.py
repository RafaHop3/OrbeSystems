"""
routes/checkout.py — Stripe Checkout Session Creator
══════════════════════════════════════════════════════
POST /api/users/checkout
POST /api/users/checkout?plan_type=ghost_engine

Creates a Stripe Checkout session:
- "premium": R$ 290,00/mês (Subscription)
- "ghost_engine": R$ 19,90 (One-time payment unlock for 50+ data brokers)
"""

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from config import settings
from database import get_db
from models.users import User
from security.auth import get_current_user
from utils.logger import payment_logger

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/checkout")
async def create_checkout_session(
    plan_type: Optional[str] = Query("inho_pro", description="Tipo de plano: 'ghost_engine', 'inho_essencial', 'inho_pro', 'inho_cooperativa' ou 'premium'"),
    billing_cycle: Optional[str] = Query("monthly", description="Ciclo: 'monthly' ou 'annual' (2 meses grátis)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates a Stripe Checkout URL for the selected plan and billing cycle.
    Returns {"checkout_url": "https://checkout.stripe.com/..."}
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Payment system not configured (STRIPE_SECRET_KEY missing).",
        )

    norm_plan = (plan_type or "inho_pro").strip().lower()
    is_annual = (billing_cycle or "monthly").strip().lower() == "annual"

    try:
        # ── Idempotent Customer Creation ──────────────────────────────────────
        if not current_user.stripe_customer_id:
            try:
                customer = stripe.Customer.create(
                    email=current_user.email,
                    metadata={"user_id": str(current_user.id)},
                )
                current_user.stripe_customer_id = customer.id
                db.commit()
            except Exception as e:
                payment_logger.warning(f"Skipping stripe customer creation: {e}")

        # ── Line items and mode based on plan_type ────────────────────────────
        if norm_plan == "ghost_engine":
            line_items = [
                {
                    "price_data": {
                        "currency": "brl",
                        "unit_amount": 1990,  # R$ 19,90
                        "product_data": {
                            "name": "Orbe Ghost Engine — Desindexação em 50+ Data Brokers",
                            "description": "Varredura completa em 54 data brokers com provas criptográficas SHA-256 e notificações DPO LGPD.",
                        },
                    },
                    "quantity": 1,
                }
            ]
            mode = "payment"
            success_url = f"{settings.FRONTEND_URL}/ferramentas-premium/databroker-optout?unlocked=true&session_id={CHECKOUT_SESSION_ID}"
            cancel_url = f"{settings.FRONTEND_URL}/ghost-engine"
            tier_code = "GHOST_ENGINE"

        elif norm_plan in ("inho_essencial", "essencial", "INHO_ESSENCIAL"):
            price_cents = 290000 if is_annual else 29000
            interval = "year" if is_annual else "month"
            line_items = [
                {
                    "price_data": {
                        "currency": "brl",
                        "unit_amount": price_cents,
                        "product_data": {
                            "name": f"INHO Essencial (PME & Serviços) — {'Anual (2 Meses Grátis)' if is_annual else 'Mensal'}",
                            "description": "Core ERP completo, até 3 operadores, PDV, Contratos, Boletos/PIX e Central WhatsApp Básica.",
                        },
                        "recurring": {"interval": interval},
                    },
                    "quantity": 1,
                }
            ]
            mode = "subscription"
            success_url = f"{settings.FRONTEND_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}"
            cancel_url = f"{settings.FRONTEND_URL}/assinar"
            tier_code = "INHO_ESSENCIAL"

        elif norm_plan in ("inho_cooperativa", "cooperativa", "INHO_COOPERATIVA_OURO", "cooperativa_ouro", "inho_enterprise", "enterprise", "INHO_ENTERPRISE_OURO"):
            price_cents = 990000 if is_annual else 99000
            interval = "year" if is_annual else "month"
            line_items = [
                {
                    "price_data": {
                        "currency": "brl",
                        "unit_amount": price_cents,
                        "product_data": {
                            "name": f"INHO Enterprise & Corporativo (Padrão Ouro) — {'Anual (2 Meses Grátis)' if is_annual else 'Mensal'}",
                            "description": "Governança Multi-Empresas, Quadro Societário, Open Finance Oficial, até 25 operadores, RAG Ilimitado e Guardrail Zero-Trust.",
                        },
                        "recurring": {"interval": interval},
                    },
                    "quantity": 1,
                }
            ]
            mode = "subscription"
            success_url = f"{settings.FRONTEND_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}"
            cancel_url = f"{settings.FRONTEND_URL}/assinar"
            tier_code = "INHO_COOPERATIVA_OURO"

        else: # default: inho_pro / INHO_PRO_IA / premium
            price_cents = 590000 if is_annual else 59000
            interval = "year" if is_annual else "month"
            line_items = [
                {
                    "price_data": {
                        "currency": "brl",
                        "unit_amount": price_cents,
                        "product_data": {
                            "name": f"INHO Pro + OrBrick-IA (CBM & RAG) — {'Anual (2 Meses Grátis)' if is_annual else 'Mensal'}",
                            "description": "OrBrick-IA Ativa, CBM Preditivo, até 8 operadores, até 25 diretrizes RAG (.PDF/.DOCX) e Alçada Dual-Control.",
                        },
                        "recurring": {"interval": interval},
                    },
                    "quantity": 1,
                }
            ]
            mode = "subscription"
            success_url = f"{settings.FRONTEND_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}"
            cancel_url = f"{settings.FRONTEND_URL}/assinar"
            tier_code = "INHO_PRO_IA"

        # ── Checkout Session (Stripe Gateway) ───────────────────────────────────
        checkout_session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=line_items,
            mode=mode,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "plan_type": tier_code,
                "billing_cycle": "ANNUAL" if is_annual else "MONTHLY"
            },
        )

        payment_logger.info(f"Stripe Checkout session ({tier_code}) created for {current_user.email}")
        return {"checkout_url": checkout_session.url}

    except stripe.error.StripeError as e:
        payment_logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment system error: {str(e)}")
