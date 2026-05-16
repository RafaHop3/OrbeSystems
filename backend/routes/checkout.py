"""
routes/checkout.py — Stripe Checkout Session Creator
══════════════════════════════════════════════════════
POST /api/users/checkout

Creates a Stripe Checkout session for the Premium plan.
Only authenticated users (valid JWT) can initiate checkout.
Idempotent: reuses existing stripe_customer_id if present.

After payment, Stripe sends a webhook to /api/webhooks/stripe
which upgrades the user role in the DB. The user must re-login
(or refresh token) to receive the new JWT with role="premium".
"""

import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.users import User
from security.auth import get_current_user
from utils.logger import payment_logger

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/checkout")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates a Stripe Checkout URL for the Premium subscription.
    Returns {"checkout_url": "https://checkout.stripe.com/..."} for the
    frontend to redirect to.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503,
            detail="Payment system not configured (STRIPE_SECRET_KEY missing).",
        )

    if current_user.role == "premium":
        raise HTTPException(
            status_code=400,
            detail="You are already a Premium subscriber.",
        )

    try:
        # ── Idempotent Customer Creation ──────────────────────────────────────
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": current_user.id},
            )
            current_user.stripe_customer_id = customer.id
            db.commit()
            payment_logger.info(f"Created Stripe customer for {current_user.email}")

        # ── Checkout Session ──────────────────────────────────────────────────
        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=[
                {
                    "price": settings.STRIPE_PREMIUM_PRICE_ID,
                    "quantity": 1,
                }
            ],
            success_url=(
                f"{settings.FRONTEND_URL}/assinar/sucesso"
                "?session_id={CHECKOUT_SESSION_ID}"
            ),
            cancel_url=f"{settings.FRONTEND_URL}/assinar",
            metadata={"user_id": current_user.id},
        )

        payment_logger.info(f"Session created for {current_user.email}")
        return {"checkout_url": session.url}

    except stripe.error.StripeError as e:
        payment_logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment system error: {str(e)}")
