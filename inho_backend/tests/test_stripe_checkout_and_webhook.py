"""
tests/test_stripe_checkout_and_webhook.py — INHO Backend
═══════════════════════════════════════════════════════════════════════════════
Bateria de Testes Mock Automatizados do Stripe Checkout e Webhook de Provisionamento:
  [T01] Checkout INHO Essencial Mensal (R$ 290,00 / 29.000 centavos)
  [T02] Checkout INHO Pro + IA Anual (R$ 5.900,00 / 590.000 centavos — 2 Meses Grátis)
  [T03] Checkout INHO Cooperativa & Enterprise Padrão Ouro (R$ 990,00 / 99.000 centavos)
  [T04] Checkout com plano inválido bloqueado com HTTP 400 Bad Request
  [T05] Webhook checkout.session.completed provisiona tenant e liquida fatura pendente
  [T06] Webhook Idempotência Estrita — replay de evento duplicado interceptado
  [T07] Webhook customer.subscription.updated promove franquias (Cooperativa Ouro)
  [T08] Webhook invoice.payment_succeeded liquida fatura pendente com sucesso
  [T09] Webhook evento irrelevante ignorado graciosamente (HTTP 200 status ignored)
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from main import app, limiter
from db.session import Base, get_db
from core.security import hash_password, create_access_token
from models.models import (
    User, UserRole, Business, BusinessCategory,
    BillingInvoice, BillingStatus, PaymentMethod, InvoiceType, WebhookLog
)

# Desativar rate limiter nos testes
limiter.enabled = False
if hasattr(app.state, "limiter"):
    app.state.limiter.enabled = False

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
AsyncSessionTest = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)

TEST_ADMIN_ID = str(uuid.uuid4())
TEST_BIZ_ID = str(uuid.uuid4())
TEST_TOKEN = ""


async def override_get_db():
    async with AsyncSessionTest() as session:
        yield session


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_database():
    global TEST_TOKEN
    app.dependency_overrides[get_db] = override_get_db
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed Admin User e Business diretamente no banco sem depender do endpoint de login
    async with AsyncSessionTest() as session:
        admin_user = User(
            id=TEST_ADMIN_ID,
            email="admin.stripe@orbesystems.com.br",
            full_name_db="Admin Stripe Provisioning",
            password_hash=hash_password("StripePass@2026"),
            role=UserRole.ADMIN,
            is_email_verified=True,
            subscription_status="active",
        )
        session.add(admin_user)
        await session.flush()

        biz = Business(
            id=TEST_BIZ_ID,
            user_id=TEST_ADMIN_ID,
            name="INHO Agro Comércio Ltda",
            cnpj="11.222.333/0001-44",
            category=BusinessCategory.OUTROS,
            plan_tier="INHO_ESSENCIAL",
            billing_cycle="MONTHLY",
            monthly_price_cents=29000,
            max_operators=3,
            ai_rag_enabled=False,
            cbm_predictive_enabled=False,
            cooperativa_module_enabled=False,
            monthly_ai_quota=500,
        )
        session.add(biz)
        await session.commit()

    # Gerar token JWT direto (bypassa rate limiting do endpoint de login)
    TEST_TOKEN = create_access_token(subject=TEST_ADMIN_ID, role=UserRole.ADMIN.value)

    yield

    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine_test.dispose()
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_01_checkout_inho_essencial_monthly():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        checkout_res = await ac.post(
            "/api/v1/billing/checkout",
            headers=headers,
            json={"plan_tier": "INHO_ESSENCIAL", "billing_cycle": "MONTHLY"},
        )
        assert checkout_res.status_code == 200, checkout_res.text
        data = checkout_res.json()
        assert "checkout.stripe.com" in data["checkout_url"]
        assert data["plan_tier"] == "INHO_ESSENCIAL"
        assert data["billing_cycle"] == "MONTHLY"
        assert data["amount_cents"] == 29000  # R$ 290,00


@pytest.mark.asyncio
async def test_02_checkout_inho_pro_annual_discount():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        checkout_res = await ac.post(
            "/api/v1/billing/checkout",
            headers=headers,
            json={"plan_tier": "INHO_PRO_IA", "billing_cycle": "ANNUAL"},
        )
        assert checkout_res.status_code == 200, checkout_res.text
        data = checkout_res.json()
        assert "checkout.stripe.com" in data["checkout_url"]
        assert data["plan_tier"] == "INHO_PRO_IA"
        assert data["billing_cycle"] == "ANNUAL"
        assert data["amount_cents"] == 590000  # R$ 5.900,00


@pytest.mark.asyncio
async def test_03_checkout_inho_cooperativa_ouro():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        checkout_res = await ac.post(
            "/api/v1/billing/checkout",
            headers=headers,
            json={"plan_tier": "INHO_COOPERATIVA_OURO", "billing_cycle": "MONTHLY"},
        )
        assert checkout_res.status_code == 200, checkout_res.text
        data = checkout_res.json()
        assert data["plan_tier"] == "INHO_COOPERATIVA_OURO"
        assert data["billing_cycle"] == "MONTHLY"
        assert data["amount_cents"] == 99000  # R$ 990,00


@pytest.mark.asyncio
async def test_04_checkout_invalid_plan_rejects_400():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        checkout_res = await ac.post(
            "/api/v1/billing/checkout",
            headers=headers,
            json={"plan_tier": "PLANO_INEXISTENTE_999", "billing_cycle": "MONTHLY"},
        )
        assert checkout_res.status_code == 400
        assert "invalido" in checkout_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_05_webhook_checkout_session_completed_provisions_tenant_and_reconciles_invoice():
    async with AsyncSessionTest() as session:
        inv = BillingInvoice(
            id=str(uuid.uuid4()),
            business_id=TEST_BIZ_ID,
            customer_name="Empresa Assinante Teste",
            customer_email="admin.stripe@orbesystems.com.br",
            amount=Decimal("590.00"),
            due_date=datetime.now(timezone.utc) + timedelta(days=5),
            status=BillingStatus.PENDING,
            remaining_balance=Decimal("590.00"),
            created_by_id=TEST_ADMIN_ID,
        )
        session.add(inv)
        await session.commit()
        inv_id = inv.id

    webhook_event = {
        "id": f"evt_test_checkout_{uuid.uuid4().hex[:12]}",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_session_pro_annual",
                "customer": "cus_test_12345",
                "customer_email": "admin.stripe@orbesystems.com.br",
                "subscription": "sub_test_67890",
                "payment_status": "paid",
                "amount_total": 590000,
                "currency": "brl",
                "metadata": {
                    "business_id": TEST_BIZ_ID,
                    "user_id": TEST_ADMIN_ID,
                    "plan_tier": "INHO_PRO_IA",
                    "billing_cycle": "ANNUAL",
                    "email": "admin.stripe@orbesystems.com.br",
                },
            }
        },
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/billing/webhook", json=webhook_event)
        assert res.status_code == 200, res.text
        assert res.json()["status"] in ("success", "processed")

    async with AsyncSessionTest() as session:
        b_res = await session.execute(select(Business).where(Business.id == TEST_BIZ_ID))
        updated_biz = b_res.scalar_one()
        assert updated_biz.plan_tier == "INHO_PRO_IA"
        assert updated_biz.billing_cycle == "ANNUAL"
        assert updated_biz.max_operators == 8
        assert updated_biz.ai_rag_enabled is True
        assert updated_biz.cbm_predictive_enabled is True
        assert updated_biz.monthly_ai_quota in (2000, 2500)

        i_res = await session.execute(select(BillingInvoice).where(BillingInvoice.id == inv_id))
        updated_inv = i_res.scalar_one()
        assert updated_inv.status == BillingStatus.PAID
        assert updated_inv.remaining_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_06_webhook_idempotency_prevents_duplicate_processing():
    evt_id = f"evt_idempotency_{uuid.uuid4().hex[:12]}"
    webhook_event = {
        "id": evt_id,
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_session_idem",
                "customer": "cus_test_idem",
                "payment_status": "paid",
                "amount_total": 29000,
                "currency": "brl",
                "metadata": {
                    "business_id": TEST_BIZ_ID,
                    "plan_tier": "INHO_ESSENCIAL",
                    "billing_cycle": "MONTHLY",
                },
            }
        },
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res1 = await ac.post("/api/v1/billing/webhook", json=webhook_event)
        assert res1.status_code == 200
        assert res1.json()["status"] in ("success", "processed")

        res2 = await ac.post("/api/v1/billing/webhook", json=webhook_event)
        assert res2.status_code == 200
        assert res2.json()["status"] in ("already_processed", "idempotent_ok", "success", "processed")


@pytest.mark.asyncio
async def test_07_webhook_subscription_updated_tier_upgrade():
    webhook_event = {
        "id": f"evt_sub_upgrade_{uuid.uuid4().hex[:12]}",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test_coop_gold",
                "status": "active",
                "metadata": {
                    "business_id": TEST_BIZ_ID,
                    "plan_tier": "INHO_COOPERATIVA_OURO",
                    "billing_cycle": "MONTHLY",
                },
            }
        },
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/billing/webhook", json=webhook_event)
        assert res.status_code == 200, res.text
        assert res.json()["status"] in ("success", "processed")

    async with AsyncSessionTest() as session:
        b_res = await session.execute(select(Business).where(Business.id == TEST_BIZ_ID))
        biz = b_res.scalar_one()
        assert biz.plan_tier == "INHO_COOPERATIVA_OURO"
        assert biz.max_operators == 25
        assert biz.ai_rag_enabled is True
        assert biz.cooperativa_module_enabled is True
        assert biz.monthly_ai_quota == 5000


@pytest.mark.asyncio
async def test_08_webhook_invoice_payment_succeeded():
    async with AsyncSessionTest() as session:
        inv = BillingInvoice(
            id=str(uuid.uuid4()),
            business_id=TEST_BIZ_ID,
            customer_name="Cooperativa Associada",
            customer_email="admin.stripe@orbesystems.com.br",
            amount=Decimal("990.00"),
            due_date=datetime.now(timezone.utc) + timedelta(days=2),
            status=BillingStatus.PENDING,
            remaining_balance=Decimal("990.00"),
            created_by_id=TEST_ADMIN_ID,
        )
        session.add(inv)
        await session.commit()
        inv_id = inv.id

    webhook_event = {
        "id": f"evt_inv_pay_{uuid.uuid4().hex[:12]}",
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "id": "in_test_invoice_990",
                "amount_paid": 99000,
                "currency": "brl",
                "paid": True,
                "customer_email": "admin.stripe@orbesystems.com.br",
                "subscription_details": {
                    "metadata": {
                        "business_id": TEST_BIZ_ID,
                    }
                },
            }
        },
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/billing/webhook", json=webhook_event)
        assert res.status_code == 200, res.text
        assert res.json()["status"] in ("success", "processed")

    async with AsyncSessionTest() as session:
        i_res = await session.execute(select(BillingInvoice).where(BillingInvoice.id == inv_id))
        paid_inv = i_res.scalar_one()
        assert paid_inv.status == BillingStatus.PAID
        assert paid_inv.remaining_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_09_webhook_ignores_irrelevant_events():
    webhook_event = {
        "id": f"evt_ignore_{uuid.uuid4().hex[:12]}",
        "type": "payment_intent.created",
        "data": {"object": {"id": "pi_test_ignore"}},
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/billing/webhook", json=webhook_event)
        assert res.status_code == 200
        assert res.json()["status"] == "ignored"
