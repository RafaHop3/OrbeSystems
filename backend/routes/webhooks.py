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
  checkout.session.completed      → role="premium", status="active"   + Redis cache SET
  customer.subscription.deleted   → role="user",    status="canceled" + Redis cache INVALIDATE
  customer.subscription.paused    → role="user",    status="canceled" + Redis cache INVALIDATE
  invoice.payment_failed          → status="past_due" (role unchanged)
  invoice.payment_succeeded       → status="active"  (renewal)
"""

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.users import User, UserSubscription
from utils.logger import webhook_logger
# ── Redis: atualização imediata da flag is_premium — sem aguardar TTL expirar
from services.redis_service import set_is_premium, invalidate_premium_cache

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

                # ── Atualizar Redis imediatamente (sem aguardar TTL) —————————
                try:
                    await set_is_premium(str(user.id), True)
                    webhook_logger.info(f"[Redis] is_premium=True cacheado para user_id={user.id}")
                except Exception as redis_err:
                    webhook_logger.warning(f"[Redis] Falha ao atualizar cache is_premium: {redis_err}")

                # Provisionar Workspace do AnythingLLM em background
                try:
                    from services import anythingllm_service
                    import asyncio
                    asyncio.create_task(anythingllm_service.provision_user_workspace(user.id, user.email))
                except Exception as e:
                    webhook_logger.error(f"Erro ao disparar provisionamento de workspace AnythingLLM para {user.email}: {e}")

                # ── Provisionar Conta de Proprietário (Admin) no INHO Business
                import os
                import httpx
                import asyncio
                
                async def provision_inho_admin(user_email, user_fullname, user_hash):
                    inho_api_url = os.getenv("INHO_API_INTERNAL_URL", "https://inho-api.orbesystems.com.br/api/v1")
                    sys_secret = os.getenv("INHO_SYSTEM_SECRET", "super_secret_inho_provisioning_key_change_me")
                    payload = {
                        "email": user_email,
                        "full_name": user_fullname or "Administrador INHO",
                        "hashed_password": user_hash
                    }
                    try:
                        async with httpx.AsyncClient() as client:
                            resp = await client.post(
                                f"{inho_api_url}/auth/webhook/provision",
                                json=payload,
                                headers={"X-INHO-SYSTEM-SECRET": sys_secret},
                                timeout=15.0
                            )
                            if resp.status_code in [201, 200]:
                                webhook_logger.info(f"INHO Admin provisioned successfully for {user_email}")
                            else:
                                webhook_logger.error(f"INHO provisioning failed for {user_email}: {resp.text}")
                            
                            # Após o registro inicial, mandar dar baixa em faturas antigas!
                            reconcile_payload = {
                                "email": user_email,
                                "action": "checkout_session_completed",
                                "stripe_customer_id": customer_id
                            }
                            rec_resp = await client.post(
                                f"{inho_api_url}/billing/webhook/reconcile",
                                json=reconcile_payload,
                                headers={"X-INHO-SYSTEM-SECRET": sys_secret},
                                timeout=15.0
                            )
                            webhook_logger.info(f"INHO Billing Webhook trigger done: {rec_resp.status_code}")

                    except Exception as ex:
                        webhook_logger.error(f"Failed to call INHO bridging API: {ex}")

                asyncio.create_task(provision_inho_admin(user.email, user.full_name, user.hashed_password))

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

            # ── Invalidar cache Redis imediatamente ————————————————————————
            try:
                await invalidate_premium_cache(str(user.id))
                webhook_logger.info(f"[Redis] Cache is_premium invalidado para user_id={user.id}")
            except Exception as redis_err:
                webhook_logger.warning(f"[Redis] Falha ao invalidar cache is_premium: {redis_err}")

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
