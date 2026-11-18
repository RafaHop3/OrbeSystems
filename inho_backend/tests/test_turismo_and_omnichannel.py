"""
Tests for INHO Turismo Vertical (AI-First / Human-Last · Omnichannel Custo Zero · NYDROBS Pilot).
"""
import uuid
from datetime import datetime, timezone, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from main import app
from db.session import Base, get_db
from core.security import hash_password, create_access_token
from models.models import User, UserRole, Business, BusinessCategory


TEST_DB_URL = "sqlite+aiosqlite:///./test_turismo.db"


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


async def _seed_agency(db: AsyncSession, name: str = "NYDROBS Turismo"):
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=f"turismo_{uid[:6]}@nydrobs.com",
        full_name_db=name,
        password_hash=hash_password("Turismo123!"),
        role=UserRole.ADMIN,
        is_email_verified=True,
    )
    db.add(user)
    await db.flush()

    bid = str(uuid.uuid4())
    biz = Business(
        id=bid,
        user_id=uid,
        name=name,
        category=BusinessCategory.TURISMO,
        plan_tier="INHO_ENTERPRISE",
    )
    db.add(biz)
    await db.commit()
    token = create_access_token(uid, "admin")
    return {"user": user, "biz": biz, "token": token}


@pytest.mark.asyncio
async def test_turismo_full_workflow_and_omnichannel(db_session: AsyncSession):
    ag_a = await _seed_agency(db_session, "NYDROBS Turismo")
    ag_b = await _seed_agency(db_session, "Agência Concorrente")
    h_a = {"Authorization": f"Bearer {ag_a['token']}"}
    h_b = {"Authorization": f"Bearer {ag_b['token']}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Hybrid Cash vs Miles Quote + Proposta Viva
        r_q = await client.post(
            "/api/v1/turismo/quotes",
            headers=h_a,
            json={
                "client_name": "Carlos Viajante",
                "origin": "GRU",
                "destination": "MIA",
                "departure_date": "2026-12-10",
                "passengers": 2,
                "airline_program": "SMILES",
                "cash_price_brl": 4500.0,
                "miles_required": 120000,
                "mile_cost_per_k_brl": 17.5,
                "tax_fees_brl": 350.0,
                "is_public_offer": True,
            },
        )
        assert r_q.status_code == 200
        q_data = r_q.json()
        assert q_data["recommended_mode"] == "MILES"
        assert q_data["total_miles_cost_brl"] == 2450.0
        assert q_data["savings_brl"] == 2050.0
        slug = q_data["proposal_slug"]

        # Public Proposta Viva + Client Selection
        r_pub = await client.get(f"/api/v1/turismo/public/proposta/{slug}")
        assert r_pub.status_code == 200
        assert len(r_pub.json()["options"]) == 3

        r_sel = await client.post(
            f"/api/v1/turismo/public/proposta/{slug}/select",
            json={"selected_option": "A"},
        )
        assert r_sel.status_code == 200
        assert r_sel.json()["status"] == "APPROVED"

        # Public Offers Widget (cached)
        r_off = await client.get("/api/v1/turismo/public/offers")
        assert r_off.status_code == 200
        assert len(r_off.json()["offers"]) >= 1

        # 2. Smart Import PNR
        r_pnr = await client.post(
            "/api/v1/turismo/quotes/import-pnr",
            headers=h_a,
            json={"pnr_raw_text": "LOCATOR XYZ987 GRU-LIS PAX: MARIA SOUZA"},
        )
        assert r_pnr.status_code == 200
        assert r_pnr.json()["origin"] == "GRU"
        assert r_pnr.json()["destination"] == "LIS"

        # 3. Miles Vault & CPF Semaphore (no passwords)
        r_m = await client.post(
            "/api/v1/turismo/miles",
            headers=h_a,
            json={
                "program_name": "SMILES",
                "holder_name": "Titular Teste",
                "holder_document": "12345678901",
                "miles_balance": 350000,
                "cpfs_used_year": 22,
                "cpfs_limit_year": 25,
            },
        )
        assert r_m.status_code == 200
        assert r_m.json()["semaphore_status"] == "YELLOW"
        acc_id = r_m.json()["id"]

        r_cpf = await client.patch(f"/api/v1/turismo/miles/{acc_id}/use-cpf", headers=h_a)
        assert r_cpf.status_code == 200
        assert r_cpf.json()["semaphore_status"] == "RED"

        # 4. Booking, Agency DRE & Boarding Radar (D-7)
        d7_iso = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        r_bk = await client.post(
            "/api/v1/turismo/bookings",
            headers=h_a,
            json={
                "pnr_locator": "ABC123",
                "passenger_name": "Carlos Viajante",
                "origin": "GRU",
                "destination": "MIA",
                "departure_at": d7_iso,
                "sale_amount_brl": 3000.0,
                "supplier_cost_brl": 2400.0,
                "iss_rate_pct": 5.0,
            },
        )
        assert r_bk.status_code == 200
        assert r_bk.json()["agency_fee_brl"] == 600.0
        assert r_bk.json()["iss_tax_brl"] == 30.0
        assert r_bk.json()["net_profit_brl"] == 570.0

        r_dre = await client.get("/api/v1/turismo/dre", headers=h_a)
        assert r_dre.status_code == 200
        assert r_dre.json()["intermediation_revenue_brl"] == 600.0

        r_rad = await client.post("/api/v1/turismo/boarding-radar/run", headers=h_a)
        assert r_rad.status_code == 200
        assert r_rad.json()["dispatches"][0]["stage"] == "D-7"

        # 5. Groups & Rooming List
        r_grp = await client.post(
            "/api/v1/turismo/groups",
            headers=h_a,
            json={"group_name": "Caravana Orlando", "destination": "MCO", "price_per_person_brl": 5500.0},
        )
        assert r_grp.status_code == 200
        gid = r_grp.json()["id"]
        r_mem = await client.post(
            f"/api/v1/turismo/groups/{gid}/members",
            headers=h_a,
            json={"member_name": "Ana Lima", "room_number": "204", "amount_paid_brl": 5500.0, "amount_due_brl": 5500.0},
        )
        assert r_mem.status_code == 200
        assert r_mem.json()["payment_status"] == "PAID"

        # 6. NYDROBS Club & Telegram VIP Broadcast
        r_cl = await client.post(
            "/api/v1/turismo/club",
            headers=h_a,
            json={"member_name": "VIP User", "member_email": "vip@nydrobs.com", "telegram_chat_id": "99887766"},
        )
        assert r_cl.status_code == 200
        r_bc = await client.post(
            "/api/v1/turismo/club/broadcast",
            headers=h_a,
            json={"title": "Alerta Milhas MIA", "message": "GRU-MIA 60k milhas!"},
        )
        assert r_bc.status_code == 200
        assert r_bc.json()["telegram_dispatches"] == 1

        # 7. Omnichannel Custo Zero + AI-First / Human-Last
        r_cfg = await client.post(
            "/api/v1/turismo/channels",
            headers=h_a,
            json={
                "whatsapp_enabled": True,
                "instagram_enabled": True,
                "instagram_page_id": "1784140000",
                "instagram_access_token": "ig_test_tok",
                "telegram_enabled": True,
                "telegram_bot_token": "12345:tg_test_tok",
                "ai_first_enabled": True,
            },
        )
        assert r_cfg.status_code == 200

        # Normal inquiry -> AI_FIRST
        r_ai = await client.post(
            "/api/v1/turismo/omnichannel/inbound",
            headers=h_a,
            json={
                "channel": "INSTAGRAM",
                "sender_ref": "ig_user_1",
                "message_text": "Qual o horario de atendimento e como funciona?",
                "simulate_ai_offline": True,
            },
        )
        assert r_ai.status_code == 200
        assert r_ai.json()["handled_by"] == "AI_FIRST"

        # Flight crisis -> HUMAN_LAST
        r_esc = await client.post(
            "/api/v1/turismo/omnichannel/inbound",
            headers=h_a,
            json={
                "channel": "TELEGRAM",
                "sender_ref": "tg_user_1",
                "message_text": "Socorro meu voo cancelado e perdi o voo no aeroporto!",
                "simulate_ai_offline": True,
            },
        )
        assert r_esc.status_code == 200
        assert r_esc.json()["handled_by"] == "HUMAN_LAST"
        assert r_esc.json()["escalation_trigger"] == "FLIGHT_CRISIS"

        # Tenant B isolation check
        r_iso = await client.get("/api/v1/turismo/quotes", headers=h_b)
        assert r_iso.status_code == 200
        assert r_iso.json() == []
