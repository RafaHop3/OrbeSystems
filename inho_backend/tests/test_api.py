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
from db.session import engine, Base


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


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


@pytest.mark.asyncio
async def test_user_role_classification_and_audit_logging(client: AsyncClient):
    # 1. Register user
    r = await client.post("/api/v1/auth/register", json={
        "email": "mestre@inho.io",
        "full_name": "Gestor Mestre Sol Nascente",
        "password": "SecurePass123!",
    })
    assert r.status_code == 201

    # 2. Login
    r = await client.post("/api/v1/auth/login", json={
        "email": "mestre@inho.io",
        "password": "SecurePass123!",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Check /users/me role classification label
    r = await client.get("/api/v1/users/me", headers=headers)
    assert r.status_code == 200
    user_me = r.json()
    assert "role_label" in user_me
    assert user_me["role_label"] is not None

    # 4. Create invoice and verify audit metadata fields
    r = await client.post("/api/v1/billing/", json={
        "customer_name": "Cooperativa Teste Auditoria",
        "customer_phone": "11977776666",
        "amount": 3500.0,
        "due_date": "2026-09-15T00:00:00Z",
        "description": "Taxa de Manutenção"
    }, headers=headers)
    assert r.status_code == 201
    inv = r.json()
    assert inv["created_by_name"] is not None

    # 5. Update invoice status
    inv_id = inv["id"]
    r = await client.patch(f"/api/v1/billing/{inv_id}/status", json={"status": "PAID"}, headers=headers)
    assert r.status_code == 200
    updated_inv = r.json()
    assert updated_inv["updated_by_name"] is not None

    # 6. Fetch audit logs
    r = await client.get("/api/v1/audit/me", headers=headers)
    assert r.status_code == 200
    logs = r.json()
    assert len(logs) >= 2
    first_log = logs[0]
    assert "user_name" in first_log
    assert "user_role" in first_log
    assert first_log["user_name"] == "Gestor Mestre Sol Nascente"


@pytest.mark.asyncio
async def test_admin_sub_user_creation_and_rbac(client: AsyncClient):
    # 1. Register Master Admin
    r = await client.post("/api/v1/auth/register", json={
        "email": "admin_equipe@inho.io",
        "full_name": "Administrador de Equipe",
        "password": "SecurePass123!",
    })
    assert r.status_code == 201

    # 2. Login as Admin
    r = await client.post("/api/v1/auth/login", json={
        "email": "admin_equipe@inho.io",
        "password": "SecurePass123!",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create sub-user as Admin with OPERATOR role
    r = await client.post("/api/v1/users/", json={
        "email": "operador_sub@inho.io",
        "full_name": "Operador Sub-usuario",
        "password": "OperatorPass123!",
        "role": "operator",
        "is_active": True
    }, headers=headers)
    assert r.status_code == 201
    sub_user = r.json()
    assert sub_user["email"] == "operador_sub@inho.io"
    assert sub_user["role"] == "operator"

    # 4. List users as Admin
    r = await client.get("/api/v1/users/", headers=headers)
    assert r.status_code == 200
    users_list = r.json()
    assert len(users_list) >= 2

    # 5. Login as the newly created sub-user (Operador)
    r = await client.post("/api/v1/auth/login", json={
        "email": "operador_sub@inho.io",
        "password": "OperatorPass123!",
    })
    assert r.status_code == 200
    op_token = r.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 6. Verify Operador CANNOT create another sub-user (Forbidden 403)
    r = await client.post("/api/v1/users/", json={
        "email": "hacker@inho.io",
        "full_name": "Hacker Sub-usuario",
        "password": "HackerPass123!",
        "role": "admin"
    }, headers=op_headers)
    assert r.status_code == 403



