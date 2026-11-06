import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_01_public_checkout_creation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "plan_tier": "INHO_PRO_IA",
            "billing_cycle": "MONTHLY",
            "business_name": "Supermercado Modelo Teste",
            "email": "contato@mercadomodelo.com.br",
            "phone": "51981598760",
        }
        res = await client.post("/api/v1/billing/public-checkout", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert data["plan_tier"] == "INHO_PRO_IA"
        assert data["billing_cycle"] == "MONTHLY"

@pytest.mark.asyncio
async def test_02_session_info_retrieval():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/billing/session-info?session_id=cs_test_mock_123")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["session_id"] == "cs_test_mock_123"
        assert "email" in data
        assert "business_name" in data

@pytest.mark.asyncio
async def test_03_welcome_setup_subscriber():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "session_id": "cs_test_mock_123",
            "password": "SenhaSegura123!",
            "email": "novo.assinante@mercadomodelo.com.br",
            "business_name": "Supermercado Modelo Teste",
            "phone": "51981598760",
        }
        res = await client.post("/api/v1/auth/welcome-setup", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "success"
        assert "access_token" in data
        assert data["redirect_url"] == "/dashboard"
        assert data["email"] == "novo.assinante@mercadomodelo.com.br"
