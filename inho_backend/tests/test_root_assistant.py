import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_01_root_assist_terminal_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "query": "Como eu faço para parear a maquininha Smart POS WisePOS E?",
            "context_screen": "settings"
        }
        res = await client.post("/api/v1/copilot/root_assist", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["root_status"] == "ROOT_PRIVILEGE_ACTIVE"
        assert "WisePOS" in data["reply"] or "Smart POS" in data["reply"]
        assert len(data["suggested_actions"]) > 0

@pytest.mark.asyncio
async def test_02_root_assist_cooperativa_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "query": "Qual a retenção obrigatória de INSS e FATES para o cooperado?",
            "context_screen": "cooperativa"
        }
        res = await client.post("/api/v1/copilot/root_assist", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "2,1%" in data["reply"]
        assert "FATES" in data["reply"]

@pytest.mark.asyncio
async def test_03_root_assist_general_root_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "query": "Preciso de ajuda geral no caixa",
            "context_screen": "pdv"
        }
        res = await client.post("/api/v1/copilot/root_assist", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["root_status"] == "ROOT_PRIVILEGE_ACTIVE"
        assert len(data["suggested_actions"]) > 0
