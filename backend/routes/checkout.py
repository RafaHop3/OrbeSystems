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
    plan_type: Optional[str] = Query("premium", description="Tipo de plano: 'premium' ou 'ghost_engine'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates a Stripe Checkout URL for the selected plan.
    Returns {"checkout_url": "https://checkout.stripe.com/..."}
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Payment system not configured (STRIPE_SECRET_KEY missing).",
        )

    if plan_type == "premium" and current_user.role == "premium":
        raise HTTPException(
            status_code=400,
            detail="You are already a Premium subscriber.",
        )

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
        if plan_type == "ghost_engine":
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
            success_url = f"{settings.FRONTEND_URL}/ferramentas-premium/databroker-optout?unlocked=true&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{settings.FRONTEND_URL}/ghost-engine"
        else:
            line_items = [
                {
                    "price_data": {
                        "currency": "brl",
                        "unit_amount": 29000,  # R$ 290,00
                        "product_data": {
                            "name": "Orbe Premium (INHO Business + Orbe Knight SecSuite)",
                        },
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                }
            ]
            mode = "subscription"
            success_url = f"{settings.FRONTEND_URL}/assinar/sucesso?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{settings.FRONTEND_URL}/assinar"

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
                "plan_type": plan_type or "premium"
            },
        )

        payment_logger.info(f"Stripe Checkout session ({plan_type}) created for {current_user.email}")
        return {"checkout_url": checkout_session.url}

    except stripe.error.StripeError as e:
        payment_logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment system error: {str(e)}")
