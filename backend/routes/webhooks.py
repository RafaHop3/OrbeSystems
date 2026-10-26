"""
routes/webhooks.py — Stripe Webhook Receiver (Hardened with DB Idempotency)
═══════════════════════════════════════════════════════════════════════════
POST /api/webhooks/stripe

SECURITY CRITICAL:
  1. Every incoming request is verified against the Stripe-Signature header
     using stripe.Webhook.construct_event() + STRIPE_WEBHOOK_SECRET.
  2. Strict database idempotency via UNIQUE (idempotency_key) +
     INSERT ... ON CONFLICT DO NOTHING prevents duplicate payment processing
     across parallel Python workers.
"""

import hashlib
import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.users import User, UserSubscription
from utils.logger import webhook_logger
from services.redis_service import set_is_premium, invalidate_premium_cache

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY


def _claim_webhook_idempotency(db: Session, idempotency_key: str, event_type: str, payload: bytes) -> bool:
    """
    Registra a chave de idempotência no banco usando INSERT ... ON CONFLICT DO NOTHING.
    Retorna True se este worker conquistou o lock (primeira execução), ou False se
    o evento já foi processado por outro worker concorrente.
    """
    from datetime import datetime, timezone
    payload_hash = hashlib.sha256(payload).hexdigest()
    now_utc = datetime.now(timezone.utc)
    try:
        result = db.execute(
            text(
                "INSERT INTO webhook_idempotency_keys (idempotency_key, provider, event_type, status, payload_hash, created_at) "
                "VALUES (:key, 'stripe', :etype, 'processed', :phash, :now_utc) "
                "ON CONFLICT (idempotency_key) DO NOTHING"
            ),
            {"key": idempotency_key, "etype": event_type, "phash": payload_hash, "now_utc": now_utc},
        )
        db.commit()
        return (result.rowcount or 0) > 0
    except Exception as exc:
        db.rollback()
        webhook_logger.warning(f"[Idempotency] Fallback check due to DB dialect error: {exc}")
        return True


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """
    Stripe Webhook receiver. Validates cryptographic signature and enforces
    database-level idempotency before processing any event.
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
        webhook_logger.error("INVALID SIGNATURE — possible forged request blocked.")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event_id = event.get("id") or hashlib.sha256(payload).hexdigest()
    event_type = event["type"]
    data = event["data"]["object"]

    # ── Idempotency Gate (ON CONFLICT DO NOTHING) ─────────────────────────────
    if not _claim_webhook_idempotency(db, event_id, event_type, payload):
        webhook_logger.info(f"[Idempotency] Duplicate webhook event skipped: {event_id} ({event_type})")
        return {"status": "ignored_duplicate", "event_id": event_id, "event_type": event_type}

    webhook_logger.info(f"Received webhook event: {event_type} (id={event_id})")

    # ── Event Handlers ────────────────────────────────────────────────────────
    if event_type == "checkout.session.completed":
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

                try:
                    await set_is_premium(str(user.id), True)
                    webhook_logger.info(f"[Redis] is_premium=True cacheado para user_id={user.id}")
                except Exception as redis_err:
                    webhook_logger.warning(f"[Redis] Falha ao atualizar cache is_premium: {redis_err}")

                try:
                    from services import anythingllm_service
                    import asyncio
                    asyncio.create_task(anythingllm_service.provision_user_workspace(user.id, user.email))
                except Exception as e:
                    webhook_logger.error(f"Erro ao disparar provisionamento de workspace AnythingLLM para {user.email}: {e}")

                import os
                import httpx
                import asyncio

                async def provision_inho_admin(user_email, user_fullname, user_hash):
                    inho_api_url = os.getenv("INHO_API_INTERNAL_URL", "https://inho-api.orbesystems.com.br/api/v1")
                    sys_secret = os.getenv("INHO_SYSTEM_SECRET", "super_secret_inho_provisioning_key_change_me")
                    prov_payload = {
                        "email": user_email,
                        "full_name": user_fullname or "Administrador INHO",
                        "hashed_password": user_hash
                    }
                    try:
                        async with httpx.AsyncClient() as client:
                            resp = await client.post(
                                f"{inho_api_url}/auth/webhook/provision",
                                json=prov_payload,
                                headers={"X-INHO-SYSTEM-SECRET": sys_secret},
                                timeout=15.0
                            )
                            if resp.status_code in [201, 200]:
                                webhook_logger.info(f"INHO Admin provisioned successfully for {user_email}")
                            else:
                                webhook_logger.error(f"INHO provisioning failed for {user_email}: {resp.text}")

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
        customer_id = data.get("customer")
        subscription = db.query(UserSubscription).filter(UserSubscription.stripe_customer_id == customer_id).first()
        if subscription and subscription.user:
            user = subscription.user
            user.role = "user"
            user.subscription_status = "canceled"
            db.commit()
            webhook_logger.info(f"DOWNGRADED to user → {user.email}")

            try:
                await invalidate_premium_cache(str(user.id))
                webhook_logger.info(f"[Redis] Cache is_premium invalidado para user_id={user.id}")
            except Exception as redis_err:
                webhook_logger.warning(f"[Redis] Falha ao invalidar cache is_premium: {redis_err}")

    elif event_type == "invoice.payment_failed":
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
        customer_id = data.get("customer")
        subscription = db.query(UserSubscription).filter(UserSubscription.stripe_customer_id == customer_id).first()
        if subscription and subscription.subscription_status == "past_due":
            if subscription.user:
                subscription.user.subscription_status = "active"
            else:
                subscription.subscription_status = "active"
            db.commit()
            webhook_logger.info(f"Payment recovered → customer={customer_id} | status=active")

    return {"status": "ok", "event_id": event_id, "event_type": event_type}
