"""
Teste End-to-End de Isolamento Multi-Tenant (2 Admins + 2 Cooperativas + 2 Operadores + 2 Cooperados)
e Homologação do Módulo Open Finance Brasil (BACEN Fase 2 & Fase 3 ITP).
"""
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from main import app, limiter  # noqa: E402
from db.session import Base, get_db  # noqa: E402
from core.security import hash_password  # noqa: E402
from models.models import User, UserRole  # noqa: E402

limiter.enabled = False

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
AsyncSessionTest = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with AsyncSessionTest() as session:
        yield session


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed 2 contas de Administrador independentes (Admin A e Admin B)
    async with AsyncSessionTest() as session:
        admin_a = User(
            id=str(uuid.uuid4()),
            email="admin.coopsul@orbesystems.com.br",
            full_name_db="Admin Cooperativa Sul",
            password_hash=hash_password("SenhaForte@123"),
            role=UserRole.ADMIN,
            is_email_verified=True,
            subscription_status="active",
        )
        admin_b = User(
            id=str(uuid.uuid4()),
            email="admin.coopnorte@orbesystems.com.br",
            full_name_db="Admin Cooperativa Norte",
            password_hash=hash_password("SenhaForte@456"),
            role=UserRole.ADMIN,
            is_email_verified=True,
            subscription_status="active",
        )
        session.add_all([admin_a, admin_b])
        await session.commit()

    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine_test.dispose()
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_two_admins_cooperativa_operator_cooperado_isolation_and_open_finance():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login real com as duas contas de Admin
        login_a = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin.coopsul@orbesystems.com.br", "password": "SenhaForte@123"},
        )
        assert login_a.status_code == 200, login_a.text
        token_admin_a = login_a.json()["access_token"]
        headers_admin_a = {"Authorization": f"Bearer {token_admin_a}"}

        login_b = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin.coopnorte@orbesystems.com.br", "password": "SenhaForte@456"},
        )
        assert login_b.status_code == 200, login_b.text
        token_admin_b = login_b.json()["access_token"]
        headers_admin_b = {"Authorization": f"Bearer {token_admin_b}"}

        # 2. Cada Admin cria sua respectiva empresa do tipo COOPERATIVA
        biz_a_res = await ac.post(
            "/api/v1/businesses/",
            headers=headers_admin_a,
            json={
                "name": "Cooperativa Agroindustrial Sul Ltda",
                "cnpj": "12.345.678/0001-90",
                "category": "cooperativa",
            },
        )
        assert biz_a_res.status_code == 200, biz_a_res.text
        biz_a = biz_a_res.json()
        assert biz_a["category"].upper() == "COOPERATIVA"

        biz_b_res = await ac.post(
            "/api/v1/businesses/",
            headers=headers_admin_b,
            json={
                "name": "Cooperativa de Crédito Norte Brasil",
                "cnpj": "98.765.432/0001-10",
                "category": "cooperativa",
            },
        )
        assert biz_b_res.status_code == 200, biz_b_res.text
        biz_b = biz_b_res.json()
        assert biz_b["category"].upper() == "COOPERATIVA"
        assert str(biz_a["id"]) != str(biz_b["id"])

        # 3. Cada Admin acopla um Operador (funcionário) à sua Cooperativa
        op_a_res = await ac.post(
            "/api/v1/users/",
            headers=headers_admin_a,
            json={
                "email": "operador.sul@orbesystems.com.br",
                "full_name": "Carlos Funcionário Sul",
                "password": "OpSulPassword@123",
                "role": "operator",
                "business_id": str(biz_a["id"]),
            },
        )
        assert op_a_res.status_code == 201, op_a_res.text
        op_a = op_a_res.json()
        assert op_a["role"].lower() == "operator"
        assert op_a["full_name"] == "Carlos Funcionário Sul"

        op_b_res = await ac.post(
            "/api/v1/users/",
            headers=headers_admin_b,
            json={
                "email": "operador.norte@orbesystems.com.br",
                "full_name": "Marina Funcionária Norte",
                "password": "OpNortePassword@456",
                "role": "operator",
                "business_id": str(biz_b["id"]),
            },
        )
        assert op_b_res.status_code == 201, op_b_res.text
        op_b = op_b_res.json()
        assert op_b["role"].lower() == "operator"
        assert op_b["full_name"] == "Marina Funcionária Norte"

        # 4. Login com ambos os Operadores e verificação do vínculo de business_id em /users/me
        login_op_a = await ac.post(
            "/api/v1/auth/login",
            json={"email": "operador.sul@orbesystems.com.br", "password": "OpSulPassword@123"},
        )
        assert login_op_a.status_code == 200, login_op_a.text
        headers_op_a = {"Authorization": f"Bearer {login_op_a.json()['access_token']}"}
        me_op_a = (await ac.get("/api/v1/users/me", headers=headers_op_a)).json()
        assert str(me_op_a["business_id"]).replace("-", "") == str(biz_a["id"]).replace("-", "")

        login_op_b = await ac.post(
            "/api/v1/auth/login",
            json={"email": "operador.norte@orbesystems.com.br", "password": "OpNortePassword@456"},
        )
        assert login_op_b.status_code == 200, login_op_b.text
        headers_op_b = {"Authorization": f"Bearer {login_op_b.json()['access_token']}"}
        me_op_b = (await ac.get("/api/v1/users/me", headers=headers_op_b)).json()
        assert str(me_op_b["business_id"]).replace("-", "") == str(biz_b["id"]).replace("-", "")

        # 5. Criação de 1 Cliente Cooperado em cada Cooperativa (usando o Operador acoplado ou Admin)
        coop_a_res = await ac.post(
            "/api/v1/crm/cooperados/",
            headers=headers_op_a,
            json={
                "name": "João Produtor Cooperado Sul",
                "document": "111.222.333-44",
                "email": "joao.sul@coopsul.com.br",
                "phone": "5551981598760",
                "status": "PROPOSTA_CADASTRADA",
            },
        )
        assert coop_a_res.status_code == 201, coop_a_res.text
        coop_a = coop_a_res.json()

        coop_b_res = await ac.post(
            "/api/v1/crm/cooperados/",
            headers=headers_op_b,
            json={
                "name": "Pedro Produtor Cooperado Norte",
                "document": "555.666.777-88",
                "email": "pedro.norte@coopnorte.com.br",
                "phone": "5511988887777",
                "status": "PROPOSTA_CADASTRADA",
            },
        )
        assert coop_b_res.status_code == 201, coop_b_res.text
        coop_b = coop_b_res.json()

        # 6. PROVA DE ISOLAMENTO DE BANCO DE DADOS ENTRE TENANTS (Cooperativa A vs Cooperativa B)
        list_coops_a = (await ac.get("/api/v1/crm/cooperados/", headers=headers_admin_a)).json()
        assert len(list_coops_a) == 1
        assert list_coops_a[0]["name"] == "João Produtor Cooperado Sul"

        list_coops_b = (await ac.get("/api/v1/crm/cooperados/", headers=headers_admin_b)).json()
        assert len(list_coops_b) == 1
        assert list_coops_b[0]["name"] == "Pedro Produtor Cooperado Norte"

        # Operador A também enxerga apenas Cooperado A
        list_coops_op_a = (await ac.get("/api/v1/crm/cooperados/", headers=headers_op_a)).json()
        assert len(list_coops_op_a) == 1
        assert list_coops_op_a[0]["id"] == coop_a["id"]

        # Tentativa de acesso cruzado (Admin A tentando acessar Cooperado B por ID -> 404)
        cross_coop_get = await ac.get(f"/api/v1/crm/cooperados/{coop_b['id']}", headers=headers_admin_a)
        assert cross_coop_get.status_code == 404

        # Tentativa de listagem/alteração de usuários cruzada (Admin A não vê nem altera Operador B)
        users_a = (await ac.get("/api/v1/users/", headers=headers_admin_a)).json()
        emails_a = {u["email"] for u in users_a}
        assert "admin.coopsul@orbesystems.com.br" in emails_a
        assert "operador.sul@orbesystems.com.br" in emails_a
        assert "admin.coopnorte@orbesystems.com.br" not in emails_a
        assert "operador.norte@orbesystems.com.br" not in emails_a

        cross_user_patch = await ac.patch(
            f"/api/v1/users/{op_b['id']}",
            headers=headers_admin_a,
            json={"full_name": "Tentativa Invasão Cross-Tenant"},
        )
        assert cross_user_patch.status_code == 404

        # 7. HOMOLOGAÇÃO OPEN FINANCE BRASIL (Sicoob na Cooperativa A vs Sicredi na Cooperativa B)
        dir_res = await ac.get("/api/v1/open-finance/directory?only_cooperativas=true", headers=headers_admin_a)
        assert dir_res.status_code == 200
        coop_banks = dir_res.json()["items"]
        assert any(b["code"] == "756" for b in coop_banks)  # Sicoob
        assert any(b["code"] == "748" for b in coop_banks)  # Sicredi

        # Cooperativa A conecta Sicoob (756)
        consent_a = await ac.post(
            "/api/v1/open-finance/consents",
            headers=headers_admin_a,
            json={
                "bank_code": "756",
                "aggregator": "PLUGGY",
                "client_secret_or_token": "sicoob_fapi_secret_token_coop_sul_123",
                "account_branch": "3001",
                "account_number": "45890-1",
            },
        )
        assert consent_a.status_code == 201, consent_a.text
        assert consent_a.json()["compe_code"] == "756"

        # Cooperativa B conecta Sicredi (748)
        consent_b = await ac.post(
            "/api/v1/open-finance/consents",
            headers=headers_admin_b,
            json={
                "bank_code": "748",
                "aggregator": "BELVO",
                "client_secret_or_token": "sicredi_fapi_secret_token_coop_norte_456",
                "account_branch": "0712",
                "account_number": "99123-4",
            },
        )
        assert consent_b.status_code == 201, consent_b.text
        assert consent_b.json()["compe_code"] == "748"

        # Isolamento dos Consentimentos Open Finance entre Cooperativa A e Cooperativa B
        consents_list_a = (await ac.get("/api/v1/open-finance/consents", headers=headers_admin_a)).json()
        assert len(consents_list_a) == 1
        assert consents_list_a[0]["compe_code"] == "756"

        consents_list_b = (await ac.get("/api/v1/open-finance/consents", headers=headers_admin_b)).json()
        assert len(consents_list_b) == 1
        assert consents_list_b[0]["compe_code"] == "748"

        # Vincula domicílio bancário e chave PIX do Cooperado A no Sicoob via Operador A
        link_acc_a = await ac.post(
            f"/api/v1/open-finance/cooperado-account/{coop_a['id']}",
            headers=headers_op_a,
            json={
                "bank_code": "756",
                "branch": "3001",
                "account_number": "77889-0",
                "account_type": "CONTA_CAPITAL_COOP",
                "pix_key": "111.222.333-44",
                "pix_key_type": "CPF_CNPJ",
            },
        )
        assert link_acc_a.status_code == 200, link_acc_a.text
        assert "756 - SICOOB" in link_acc_a.json()["bank_details"]

        # Lança fatura de Integralização de Cota-Parte para Cooperado A e concilia via Open Finance
        due_str = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        inv_a = await ac.post(
            "/api/v1/billing/",
            headers=headers_op_a,
            json={
                "cooperado_id": coop_a["id"],
                "customer_name": coop_a["name"],
                "customer_doc": coop_a["document"],
                "amount": 1500.00,
                "due_date": due_str,
                "invoice_type": "INTEGRALIZACAO_INICIAL",
                "payment_method": "PIX",
                "description": "Integralização de Cota-Parte Capital Social",
            },
        )
        assert inv_a.status_code in (200, 201), inv_a.text

        sync_res = await ac.post(
            "/api/v1/open-finance/sync-statement",
            headers=headers_op_a,
            json={"auto_reconcile_pending_cotas": True},
        )
        assert sync_res.status_code == 200, sync_res.text
        sync_data = sync_res.json()
        assert sync_data["reconciled_count"] == 1
        assert str(coop_a["id"]) in sync_data["upgraded_cooperado_ids"]

        # Verifica que Cooperado A subiu para ATIVO e Cooperado B permaneceu intocado em PROPOSTA_CADASTRADA
        coop_a_after = (await ac.get(f"/api/v1/crm/cooperados/{coop_a['id']}", headers=headers_op_a)).json()
        assert coop_a_after["status"] == "ATIVO"

        coop_b_after = (await ac.get(f"/api/v1/crm/cooperados/{coop_b['id']}", headers=headers_op_b)).json()
        assert coop_b_after["status"] == "PROPOSTA_CADASTRADA"

        # Dispara Repasse PIX via Open Finance Fase 3 ITP para o Cooperado A
        payout_res = await ac.post(
            "/api/v1/open-finance/pix-payout",
            headers=headers_admin_a,
            json={
                "cooperado_id": coop_a["id"],
                "amount": 2450.75,
                "description": "Repasse de Produção Safra via Open Finance ITP",
            },
        )
        assert payout_res.status_code == 200, payout_res.text
        payout_data = payout_res.json()
        assert payout_data["status"] == "settled_via_open_finance_itp"
        assert payout_data["end_to_end_id"].startswith("E02038232")
        assert payout_data["amount"] == 2450.75
