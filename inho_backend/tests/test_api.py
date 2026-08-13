"""
INHO – Backend Tests (pytest)
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Use an in-memory SQLite for tests (swap asyncpg → aiosqlite)
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_inho.db"

from main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "operational"
    assert data["service"] == "inho-api"


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register
    r = await client.post("/api/v1/auth/register", json={
        "email": "test@inho.io",
        "full_name": "INHO Tester",
        "password": "SecurePass123",
    })
    assert r.status_code == 201
    assert "user_id" in r.json()

    # Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "test@inho.io",
        "password": "SecurePass123",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_duplicate_register(client: AsyncClient):
    payload = {"email": "dup@inho.io", "full_name": "Dup User", "password": "SecurePass123"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "ghost@inho.io",
        "password": "wrongpassword",
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 403   # No bearer → HTTPBearer raises 403


@pytest.mark.asyncio
async def test_pco_surveys_route_without_token(client: AsyncClient):
    r = await client.get("/api/v1/pco/surveys")
    assert r.status_code == 403

