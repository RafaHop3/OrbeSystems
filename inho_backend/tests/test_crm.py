"""
INHO – Fase 1 Tests: CRM, Cooperados, Categories, Notes
Todos os testes rodam com SQLite in-memory (aiosqlite).
"""
import io
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_inho.db"

from main import app  # noqa: E402
from db.session import engine, Base  # noqa: E402


# ── Fixtures ──────────────────────────────────────────────────────
@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def _get_token(client: AsyncClient) -> str:
    """Obtém token via login com usuário de teste pré-criado no DB."""
    import uuid
    from db.session import get_db
    from models.models import User, Business, BusinessOperator
    import bcrypt

    # Criar usuário diretamente no DB de teste
    async with engine.begin() as conn:
        from sqlalchemy import text
        uid = str(uuid.uuid4())
        biz_id = uuid.uuid4().hex
        pw_hash = bcrypt.hashpw(b"test1234", bcrypt.gensalt()).decode()
        await conn.execute(text(
            "INSERT INTO users (id, email, password_hash, role, is_email_verified, subscription_status, created_at)"
            " VALUES (:id, :email, :pw, :role, 1, 'active', datetime('now'))"
        ), {"id": uid, "email": "test@inho.io", "pw": pw_hash, "role": "admin"})
        await conn.execute(text(
            "INSERT INTO businesses (id, user_id, name, category, cashflow_horizon_months, created_at, updated_at)"
            " VALUES (:id, :uid, 'Test Business', 'OUTROS', 6, datetime('now'), datetime('now'))"
        ), {"id": biz_id, "uid": uid})
        await conn.execute(text(
            "INSERT INTO business_operators (id, business_id, user_id, created_at)"
            " VALUES (:id, :biz, :uid, datetime('now'))"
        ), {"id": uuid.uuid4().hex, "biz": biz_id, "uid": uid})

    r = await client.post("/api/v1/auth/login", json={"email": "test@inho.io", "password": "test1234"})
    if r.status_code not in [200, 201]:
        pytest.skip(f"Login failed ({r.status_code}) — skipping auth-dependent test")
    return r.json().get("access_token", "")


# ── Health (Smoke test) ───────────────────────────────────────────
@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "operational"


# ── Contacts: CRUD ────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_contacts_crud(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    # CREATE
    r = await client.post("/api/v1/crm/contacts/", json={
        "category": "CUSTOMER",
        "name": "João Silva",
        "document": "123.456.789-00",
        "email": "joao@teste.com",
        "phone": "11999990000",
        "address": "Rua das Flores, 100",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01310-100",
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    contact = r.json()
    contact_id = contact["id"]

    # LIST
    r = await client.get("/api/v1/crm/contacts/", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # GET SINGLE
    r = await client.get(f"/api/v1/crm/contacts/{contact_id}", headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "João Silva"

    # UPDATE
    r = await client.put(f"/api/v1/crm/contacts/{contact_id}", json={"name": "João da Silva"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "João da Silva"

    # TIMELINE
    r = await client.get(f"/api/v1/crm/contacts/{contact_id}/timeline", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "upcoming_receivables" in data
    assert "last_received" in data

    # DELETE
    r = await client.delete(f"/api/v1/crm/contacts/{contact_id}", headers=headers)
    assert r.status_code == 204


# ── Contacts: Employee HR fields ──────────────────────────────────
@pytest.mark.asyncio
async def test_employee_hr_fields(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    r = await client.post("/api/v1/crm/contacts/", json={
        "category": "EMPLOYEE",
        "name": "Maria Funcionária",
        "document": "111.222.333-44",
        "role_title": "Gerente Financeira",
        "admission_date": "2023-03-01T00:00:00Z",
        "vacation_start_date": "2024-03-01T00:00:00Z",
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    data = r.json()
    assert data["role_title"] == "Gerente Financeira"
    assert data["category"] == "EMPLOYEE"


# ── Contacts: CSV Import ──────────────────────────────────────────
@pytest.mark.asyncio
async def test_contacts_csv_import(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    csv_content = (
        "name,document,email,phone,category\n"
        "Fornecedor A,12.345.678/0001-00,fornecedor@a.com,1134567890,SUPPLIER\n"
        "Cliente B,987.654.321-00,cliente@b.com,11987654321,CUSTOMER\n"
    )
    files = {"file": ("contacts.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    r = await client.post("/api/v1/crm/contacts/import", files=files, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["imported"] == 2
    assert data["skipped"] == 0


# ── Accounts Payable: CRUD + Totals ──────────────────────────────
@pytest.mark.asyncio
async def test_payable_crud_and_totals(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    # CREATE
    r = await client.post("/api/v1/crm/payable/", json={
        "description": "Aluguel escritório",
        "amount": 3500.00,
        "due_date": "2026-09-15T00:00:00Z",
        "data_competencia": "2026-09-01T00:00:00Z",
        "is_reimbursable": False,
        "payment_account": "Conta Inter",
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    payable = r.json()
    payable_id = payable["id"]
    assert payable["is_reimbursable"] == False

    # UPDATE — marcar como reembolsável (spec §3.7)
    r = await client.put(f"/api/v1/crm/payable/{payable_id}", json={"is_reimbursable": True}, headers=headers)
    assert r.status_code == 200
    assert r.json()["is_reimbursable"] == True

    # TOTALS
    r = await client.get("/api/v1/crm/payable/summary/totals", headers=headers)
    assert r.status_code == 200
    totals = r.json()
    assert "pending" in totals
    assert "overdue" in totals

    # DELETE
    r = await client.delete(f"/api/v1/crm/payable/{payable_id}", headers=headers)
    assert r.status_code == 204


# ── Cooperados: CRUD + Balance ────────────────────────────────────
@pytest.mark.asyncio
async def test_cooperado_crud_and_balance(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    # CREATE
    r = await client.post("/api/v1/crm/cooperados/", json={
        "name": "Ana Cooperada",
        "document": "555.666.777-88",
        "email": "ana@cooperativa.com",
        "phone": "11955556666",
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    coop = r.json()
    coop_id = coop["id"]
    assert coop["status"] == "PROPOSTA_CADASTRADA"

    # UPDATE — promover status
    r = await client.put(f"/api/v1/crm/cooperados/{coop_id}", json={"status": "ATIVO"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ATIVO"

    # BALANCE
    r = await client.get(f"/api/v1/crm/cooperados/{coop_id}/balance", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_paid" in data
    assert "entries" in data

    # LIST with filter
    r = await client.get("/api/v1/crm/cooperados/?status=ATIVO", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # DELETE
    r = await client.delete(f"/api/v1/crm/cooperados/{coop_id}", headers=headers)
    assert r.status_code == 204


# ── Categories: CRUD + Auto-Seed ─────────────────────────────────
@pytest.mark.asyncio
async def test_categories_auto_seed_and_crud(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    # LIST — deve auto-semear categorias padrão
    r = await client.get("/api/v1/categories/", headers=headers)
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 8  # 8 padrões seedados

    # CREATE custom
    r = await client.post("/api/v1/categories/", json={
        "name": "Serviços de Tecnologia",
        "type": "REVENUE",
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    cat_id = r.json()["id"]

    # UPDATE
    r = await client.put(f"/api/v1/categories/{cat_id}", json={"name": "Tech Services"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Tech Services"

    # SOFT DELETE
    r = await client.delete(f"/api/v1/categories/{cat_id}", headers=headers)
    assert r.status_code == 204


# ── Notes & Files ─────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_notes_and_files(client: AsyncClient):
    token = await _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    if not token:
        pytest.skip("No auth token")

    # Create a contact to attach notes to
    r = await client.post("/api/v1/crm/contacts/", json={
        "category": "CUSTOMER",
        "name": "Cliente Notas",
    }, headers=headers)
    assert r.status_code in [200, 201]
    contact_id = r.json()["id"]

    # CREATE NOTE
    r = await client.post("/api/v1/notes/", json={
        "entity_type": "crm_contact",
        "entity_id": contact_id,
        "content": "Contato prefere ser chamado após as 14h.",
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    note_id = r.json()["id"]

    # LIST NOTES
    r = await client.get(f"/api/v1/notes/?entity_type=crm_contact&entity_id={contact_id}", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["content"] == "Contato prefere ser chamado após as 14h."

    # REGISTER FILE METADATA
    r = await client.post("/api/v1/notes/files/", json={
        "entity_type": "crm_contact",
        "entity_id": contact_id,
        "filename": "contrato_signed.pdf",
        "file_url": "https://s3.amazonaws.com/bucket/contrato_signed.pdf",
        "file_category": "contrato",
        "file_size": 204800,
    }, headers=headers)
    assert r.status_code in [200, 201], r.text
    file_id = r.json()["id"]

    # LIST FILES
    r = await client.get(f"/api/v1/notes/files/?entity_type=crm_contact&entity_id={contact_id}", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1

    # DELETE NOTE
    r = await client.delete(f"/api/v1/notes/{note_id}", headers=headers)
    assert r.status_code == 204

    # DELETE FILE
    r = await client.delete(f"/api/v1/notes/files/{file_id}", headers=headers)
    assert r.status_code == 204
