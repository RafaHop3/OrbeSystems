"""
tests/test_terminal_and_copilot.py — INHO Backend
═══════════════════════════════════════════════════════════════════════════════
Bateria de Testes da Vertical Mercados & Afins, Stripe Terminal e Copilot Orbe:
  [T01] Stripe Terminal: Geração de ConnectionToken
  [T02] Stripe Terminal: Registro e pareamento de leitor físico (BBPOS WisePOS E)
  [T03] Stripe Terminal: Listagem de leitores físicos do estabelecimento
  [T04] Stripe Terminal: Disparo de cobrança presencial para a maquininha
  [T05] Stripe Terminal: Cancelamento de operação em andamento na maquininha
  [T06] Copilot Mercado: Consulta de preço por texto/voz e código de balança (PLU)
  [T07] Copilot Mercado: Motor de recomendação Cross-Sell em tempo real no caixa
  [T08] Copilot Cooperativa: Consulta tributária de retenções (INSS / FATES / IRRF)
  [T09] Copilot Mercado: Decodificação de código de barras de etiqueta de balança
  [T10] Copilot Operador: Assistente de auditoria e fechamento de caixa com IA
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import uuid
from decimal import Decimal
from datetime import datetime, timezone

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
    User, UserRole, Business, BusinessCategory, CashRegister, CashRegisterStatus, PDVSale, PaymentMethod
)

limiter.enabled = False
if hasattr(app.state, "limiter"):
    app.state.limiter.enabled = False

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
AsyncSessionTest = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)

TEST_USER_ID = str(uuid.uuid4())
TEST_BIZ_ID = str(uuid.uuid4())
TEST_REGISTER_ID = str(uuid.uuid4())
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

    async with AsyncSessionTest() as session:
        user = User(
            id=TEST_USER_ID,
            email="operador.mercado@orbesystems.com.br",
            full_name_db="Operador Caixa Central",
            password_hash=hash_password("MercadoPass@2026"),
            role=UserRole.ADMIN,
            is_email_verified=True,
            subscription_status="active",
        )
        session.add(user)
        await session.flush()

        biz = Business(
            id=TEST_BIZ_ID,
            user_id=TEST_USER_ID,
            name="Supermercado & Empório Modelo Ltda",
            cnpj="22.333.444/0001-55",
            category=BusinessCategory.MERCADOS_E_AFINS,
            plan_tier="INHO_PRO_IA",
            max_operators=8,
        )
        session.add(biz)
        await session.flush()

        register = CashRegister(
            id=TEST_REGISTER_ID,
            business_id=TEST_BIZ_ID,
            operator_id=TEST_USER_ID,
            opening_balance=Decimal("150.00"),
            status=CashRegisterStatus.OPEN,
        )
        session.add(register)
        await session.flush()

        sale = PDVSale(
            id=str(uuid.uuid4()),
            cash_register_id=TEST_REGISTER_ID,
            customer_name="Cliente Balcão",
            total_amount=Decimal("85.50"),
            payment_method=PaymentMethod.CREDIT_CARD,
        )
        session.add(sale)
        await session.commit()

    TEST_TOKEN = create_access_token(subject=TEST_USER_ID, role=UserRole.ADMIN.value)

    yield

    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine_test.dispose()
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_01_terminal_connection_token():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/terminal/connection_token", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "secret" in data
        assert data["business_id"] == TEST_BIZ_ID


@pytest.mark.asyncio
async def test_02_terminal_register_reader():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    payload = {
        "registration_code": "simulated-code-1234",
        "label": "Caixa 01 - Frente de Loja Supermercado",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/terminal/readers/register", headers=headers, json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "id" in data
        assert "stripe_reader_id" in data
        assert data["label"] == "Caixa 01 - Frente de Loja Supermercado"
        assert data["status"] == "ONLINE"


@pytest.mark.asyncio
async def test_03_terminal_list_readers():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/terminal/readers", headers=headers)
        assert res.status_code == 200
        readers = res.json()
        assert len(readers) >= 1
        assert readers[0]["label"] == "Caixa 01 - Frente de Loja Supermercado"


@pytest.mark.asyncio
async def test_04_terminal_create_payment():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        readers_res = await ac.get("/api/v1/terminal/readers", headers=headers)
        reader_id = readers_res.json()[0]["stripe_reader_id"]

        payload = {
            "reader_id": reader_id,
            "amount_cents": 8550,  # R$ 85,50
            "customer_name": "Consumidor Caixa 01",
            "description": "Compras Hortifruti e Açougue",
        }
        res = await ac.post("/api/v1/terminal/create_payment", headers=headers, json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "payment_intent_id" in data
        assert data["amount_cents"] == 8550
        assert "85.50" in data["amount_formatted"]


@pytest.mark.asyncio
async def test_05_terminal_cancel_payment():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        readers_res = await ac.get("/api/v1/terminal/readers", headers=headers)
        reader_id = readers_res.json()[0]["stripe_reader_id"]

        res = await ac.post("/api/v1/terminal/cancel_payment", headers=headers, json={"reader_id": reader_id})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "cancelled"


@pytest.mark.asyncio
async def test_06_copilot_mercado_product_lookup():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "query": "Qual o preço e o código de balança do tomate?",
            "vertical": "MERCADOS_E_AFINS",
        }
        res = await ac.post("/api/v1/copilot/operator_assist", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["action_type"] == "PRODUCT_LOOKUP"
        assert "1042" in data["reply"]
        assert "Tomate" in data["reply"]


@pytest.mark.asyncio
async def test_07_copilot_mercado_cross_sell():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "query": "Quais sugestões de venda adicional para esse cliente?",
            "vertical": "MERCADOS_E_AFINS",
            "current_cart": [{"name": "Picanha Bovina Peça 1.2kg", "unit_price": 89.90, "quantity": 1}],
        }
        res = await ac.post("/api/v1/copilot/operator_assist", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        suggestions = [s["item_name"] for s in data["cross_sell_suggestions"]]
        assert any("Carv" in s or "Alho" in s or "Sal" in s for s in suggestions)


@pytest.mark.asyncio
async def test_08_copilot_cooperativa_tax():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "query": "Qual a retenção de INSS e FATES para cooperado?",
            "vertical": "COOPERATIVA",
        }
        res = await ac.post("/api/v1/copilot/operator_assist", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["action_type"] == "TAX_CALCULATION"
        assert "2,1%" in data["reply"]
        assert data["tax_breakdown"]["inss_percent"] == 2.1


@pytest.mark.asyncio
async def test_09_copilot_decode_scale_tag():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Padrão: 2 + código (01042 = tomate) + valor (00690 = R$ 6,90) + DV (5)
        scale_barcode = "201042006905"
        res = await ac.post("/api/v1/copilot/decode_scale_tag", json={"barcode": scale_barcode})
        assert res.status_code == 200
        data = res.json()
        assert data["is_scale_barcode"] is True
        assert data["product_code"] == "01042"
        assert data["total_price"] == 6.90


@pytest.mark.asyncio
async def test_10_copilot_cash_reconcile():
    headers = {"Authorization": f"Bearer {TEST_TOKEN}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "cash_register_id": TEST_REGISTER_ID,
            "physical_cash": 150.00,  # Fundo inicial
            "card_receipts": 85.50,   # Venda do PDV
            "pix_total": 0.0,
        }
        res = await ac.post("/api/v1/copilot/cash_reconcile", headers=headers, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "EXACT"
        assert data["difference"] == 0.0
        assert "conciliado com precisão" in data["ai_audit_justification"].lower()
