"""
Tests for Client Registration Request (Solicitações de Campos e Ajustes de Cadastro) & Self-Service Password Change:
1. Missing personal fields: Data de nascimento (birth_date) & Filiação (filiation / mother_name / father_name)
2. Structured banking fields: Número e nome do banco (bank_code, bank_name), Agência e conta (bank_agency, bank_account)
3. Multiplicity per registration:
   - Múltiplos telefones (with type/contact: PROPRIO, MAE, RECADO)
   - Múltiplos e-mails
   - Múltiplas contas bancárias (banco, agência e conta)
4. Bidirectional sync between Cooperado and CRMContact(PARTNER)
5. Self-service password change (/api/v1/auth/change-password) with _USER_CACHE invalidation
"""
import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from main import app
from db.session import Base, get_db
from core.security import hash_password, create_access_token
from models.models import User, UserRole, Business, BusinessCategory


TEST_DB_URL = "sqlite+aiosqlite:///./test_inho.db"


@pytest.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with SessionLocal() as session:
        yield session
    app.dependency_overrides.clear()
    await engine.dispose()


async def _seed_tenant(db: AsyncSession, name: str = "Cooperativa Teste Cadastro"):
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=f"admin_{uid[:6]}@orbesystems.com.br",
        full_name_db=name,
        password_hash=hash_password("SenhaInicial123!"),
        role=UserRole.ADMIN,
        is_email_verified=True,
        subscription_status="active",
    )
    db.add(user)
    await db.flush()

    bid = str(uuid.uuid4())
    biz = Business(
        id=bid,
        user_id=uid,
        name=name,
        category=BusinessCategory.COOPERATIVA,
        plan_tier="INHO_COOPERATIVA_OURO",
    )
    db.add(biz)
    await db.commit()
    token = create_access_token(uid, "admin")
    return {"user": user, "biz": biz, "token": token}


@pytest.mark.asyncio
async def test_crm_contact_personal_banking_and_multiplicity(db_session: AsyncSession):
    tenant = await _seed_tenant(db_session)
    headers = {"Authorization": f"Bearer {tenant['token']}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create CRMContact with birth_date, filiation, multiple phones, multiple emails, multiple bank accounts
        r_create = await client.post(
            "/api/v1/crm/contacts/",
            headers=headers,
            json={
                "category": "CUSTOMER",
                "name": "Fernanda Oliveira",
                "document": "123.456.789-01",
                "birth_date": "1992-05-14",
                "mother_name": "Helena Oliveira",
                "father_name": "Carlos Oliveira",
                "phones": [
                    {"number": "(51) 99888-1111", "type": "PROPRIO", "label": "Telefone Próprio", "is_primary": True},
                    {"number": "(51) 99777-2222", "type": "MAE", "label": "Telefone da Mãe (Dona Helena)", "is_primary": False},
                    {"number": "(51) 3333-4444", "type": "RECADO", "label": "Telefone para Recado", "is_primary": False},
                ],
                "emails": [
                    {"email": "fernanda@exemplo.com.br", "type": "PRINCIPAL", "label": "Pessoal Principal", "is_primary": True},
                    {"email": "fernanda.fin@empresa.com.br", "type": "FINANCEIRO", "label": "Financeiro / NFe", "is_primary": False},
                ],
                "bank_accounts": [
                    {
                        "bank_code": "756",
                        "bank_name": "Sicoob",
                        "agency": "3045",
                        "account": "98765-4",
                        "account_type": "CONTA_CORRENTE",
                        "pix_key": "12345678901",
                        "is_primary": True,
                    },
                    {
                        "bank_code": "001",
                        "agency": "1234-5",
                        "account": "55443-2",
                        "account_type": "CONTA_POUPANCA",
                        "pix_key": "fernanda@exemplo.com.br",
                        "is_primary": False,
                    },
                ],
            },
        )
        assert r_create.status_code == 201, r_create.text
        c_data = r_create.json()
        contact_id = c_data["id"]

        assert c_data["birth_date"] == "1992-05-14"
        assert "Helena Oliveira" in c_data["filiation"]
        assert "Carlos Oliveira" in c_data["filiation"]
        assert c_data["bank_code"] == "756"
        assert c_data["bank_name"] == "Sicoob"
        assert c_data["bank_agency"] == "3045"
        assert c_data["bank_account"] == "98765-4"
        assert len(c_data["phones"]) == 3
        assert c_data["phones"][1]["type"] == "MAE"
        assert len(c_data["emails"]) == 2
        assert len(c_data["bank_accounts"]) == 2
        assert c_data["bank_accounts"][1]["bank_name"] == "Banco do Brasil"  # auto-resolved from COMPE 001

        # 2. Update CRMContact adding a 3rd bank account and updating birth_date
        r_upd = await client.put(
            f"/api/v1/crm/contacts/{contact_id}",
            headers=headers,
            json={
                "birth_date": "1992-05-15",
                "filiation": "Mãe: Helena Maria Oliveira | Pai: Carlos Alberto Oliveira",
                "bank_accounts": c_data["bank_accounts"] + [
                    {
                        "bank_code": "341",
                        "agency": "0500",
                        "account": "11223-9",
                        "account_type": "CONTA_CORRENTE",
                    }
                ],
            },
        )
        assert r_upd.status_code == 200, r_upd.text
        u_data = r_upd.json()
        assert u_data["birth_date"] == "1992-05-15"
        assert len(u_data["bank_accounts"]) == 3
        assert u_data["bank_accounts"][2]["bank_name"] == "Itaú Unibanco"


@pytest.mark.asyncio
async def test_cooperado_multiplicity_and_crm_partner_sync(db_session: AsyncSession):
    tenant = await _seed_tenant(db_session, "Coop Sul Cadastro")
    headers = {"Authorization": f"Bearer {tenant['token']}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r_coop = await client.post(
            "/api/v1/crm/cooperados/",
            headers=headers,
            json={
                "name": "João Marcos Cooperado",
                "document": "987.654.321-09",
                "birth_date": "1985-11-20",
                "filiation": "Mãe: Maria Aparecida | Pai: Antônio Marcos",
                "phones": [
                    {"number": "(51) 99111-2233", "type": "PROPRIO", "label": "Celular Próprio", "is_primary": True},
                    {"number": "(51) 99222-3344", "type": "RECADO", "label": "Recado Esposa", "is_primary": False},
                ],
                "emails": [
                    {"email": "joao.coop@sulcoop.com.br", "type": "PRINCIPAL"},
                    {"email": "joao.pessoal@gmail.com", "type": "PESSOAL"},
                ],
                "bank_accounts": [
                    {
                        "bank_code": "748",
                        "agency": "0112",
                        "account": "44556-7",
                        "account_type": "CONTA_CAPITAL_COOP",
                        "pix_key": "98765432109",
                    },
                    {
                        "bank_code": "260",
                        "agency": "0001",
                        "account": "998877-0",
                        "account_type": "CONTA_PAGAMENTO",
                        "pix_key": "joao.pessoal@gmail.com",
                    },
                ],
                "status": "ATIVO",
            },
        )
        assert r_coop.status_code == 201, r_coop.text
        coop_data = r_coop.json()
        assert coop_data["birth_date"] == "1985-11-20"
        assert "Maria Aparecida" in coop_data["filiation"]
        assert coop_data["bank_code"] == "748"
        assert coop_data["bank_name"] == "Sicredi"
        assert coop_data["bank_agency"] == "0112"
        assert coop_data["bank_account"] == "44556-7"
        assert len(coop_data["phones"]) == 2
        assert len(coop_data["emails"]) == 2
        assert len(coop_data["bank_accounts"]) == 2

        # Verify automatic sync to CRMContact(PARTNER)
        r_contacts = await client.get("/api/v1/crm/contacts/?category=PARTNER", headers=headers)
        assert r_contacts.status_code == 200
        partners = r_contacts.json()
        matched = next((p for p in partners if p["document"] == "987.654.321-09"), None)
        assert matched is not None
        assert matched["birth_date"] == "1985-11-20"
        assert matched["filiation"] == "Mãe: Maria Aparecida | Pai: Antônio Marcos"
        assert len(matched["phones"]) == 2
        assert len(matched["emails"]) == 2
        assert len(matched["bank_accounts"]) == 2


@pytest.mark.asyncio
async def test_client_self_service_change_password(db_session: AsyncSession):
    tenant = await _seed_tenant(db_session, "Cliente Troca Senha")
    headers = {"Authorization": f"Bearer {tenant['token']}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Change password
        r_chg = await client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={
                "current_password": "SenhaInicial123!",
                "new_password": "NovaSenhaForte2026!",
            },
        )
        assert r_chg.status_code == 200, r_chg.text
        assert r_chg.json()["status"] == "password_updated"

        # 2. Verify login with new password succeeds
        r_login = await client.post(
            "/api/v1/auth/login",
            json={
                "email": tenant["user"].email,
                "password": "NovaSenhaForte2026!",
            },
        )
        assert r_login.status_code == 200, r_login.text
        assert "access_token" in r_login.json()
