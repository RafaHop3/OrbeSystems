"""
routes/webhooks.py — Stripe Webhook Receiver
══════════════════════════════════════════════
POST /api/webhooks/stripe

SECURITY CRITICAL:
  Every incoming request is verified against the Stripe-Signature header
  using stripe.Webhook.construct_event() + STRIPE_WEBHOOK_SECRET.
  An unverified POST to this endpoint could allow anyone to forge
  a premium upgrade. This check is NON-NEGOTIABLE.

Events handled:
  checkout.session.completed      → role="premium", status="active"
  customer.subscription.deleted   → role="user",    status="canceled"
  customer.subscription.paused    → role="user",    status="canceled"
  invoice.payment_failed          → status="past_due" (role unchanged)
"""

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.users import User, UserSubscription
from utils.logger import webhook_logger

router = APIRouter()

# Stripe SDK is configured at import time; key may be empty during dev
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """
    Stripe Webhook receiver. Validates cryptographic signature before
    processing any event — prevents forged premium upgrades.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Webhook not configured (STRIPE_WEBHOOK_SECRET missing).",
        )

    payload = await request.body()

    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header.")

    # ── Signature Verification (SECURITY GATE) ────────────────────────────────
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload.")
    except stripe.error.SignatureVerificationError:
        # Forged or tampered request — reject immediately
        webhook_logger.error("INVALID SIGNATURE — possible forged request blocked.")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event_type = event["type"]
    data = event["data"]["object"]
    webhook_logger.info(f"Received webhook event: {event_type}")

    # ── Event Handlers ────────────────────────────────────────────────────────
    if event_type == "checkout.session.completed":
        # Payment confirmed — upgrade to Premium
        user_id = data.get("metadata", {}).get("user_id")
        customer_id = data.get("customer")

        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.role = "premium"
                user.subscription_status = "active"
                if user.subscription_info:
                    user.subscription_info.stripe_customer_id = customer_id
                db.commit()
                webhook_logger.info(f"PREMIUM granted → {user.email}")

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        # Subscription ended — downgrade to free user
        customer_id = data.get("customer")
        subscription = db.query(UserSubscription).filter(UserSubscription.stripe_customer_id == customer_id).first()
        if subscription and subscription.user:
            user = subscription.user
            user.role = "user"
            user.subscription_status = "canceled"
            db.commit()
            webhook_logger.info(f"DOWNGRADED to user → {user.email}")

    elif event_type == "invoice.payment_failed":
        # Payment failed — mark as past_due (role unchanged, grace period)
        customer_id = data.get("customer")
        subscription = db.query(UserSubscription).filter(UserSubscription.stripe_customer_id == customer_id).first()
        if subscription:
            if subscription.user:
                subscription.user.subscription_status = "past_due"
            else:
                subscription.subscription_status = "past_due"
            db.commit()
            webhook_logger.warning(f"Payment failed → customer={customer_id} | status=past_due")

    elif event_type == "invoice.payment_succeeded":
        # Renewal confirmed — ensure status is active
        customer_id = data.get("customer")
        subscription = db.query(UserSubscription).filter(UserSubscription.stripe_customer_id == customer_id).first()
        if subscription and subscription.subscription_status == "past_due":
            if subscription.user:
                subscription.user.subscription_status = "active"
            else:
                subscription.subscription_status = "active"
            db.commit()
            webhook_logger.info(f"Payment recovered → customer={customer_id} | status=active")

    return {"status": "ok", "event_type": event_type}
