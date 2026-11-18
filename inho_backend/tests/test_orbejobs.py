"""
OrbeJobs — Suíte de Testes Completos (Fases 1 a 5 — Backend + Segurança + IMORTAL Cascade)
Valida:
1. Modelagem SQL + UniqueConstraint(user_id, job_url_hash) + Multi-Tenant Isolation
2. Conectores híbridos (Greenhouse, Lever, RSS) + canonicalização + SHA-256
3. IMORTAL Predictive Cascade Router (pgvector prefilter + cache + rotação Gemini -> Groq -> Ollama -> Local)
4. Living CV (JSON Resume, atualização via WhatsApp +XP/+Curso/+Skill e upload PDF)
5. Gmail OAuth2 Vault (MultiFernet AES-256), DNS MX anti-bounce, jitter, teto 10-15/dia,
   Human-in-the-Loop, Kill-Switch, Trilha de Auditoria e Anonimização LGPD (Art. 18)
"""
import os
import uuid
import bcrypt
import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_inho.db"

from core.security import decrypt_secret  # noqa: E402
from db.session import AsyncSessionLocal, Base, engine  # noqa: E402
from main import app  # noqa: E402
from models.models import OrbeJobOAuthVault, OrbeJobSendLog, OrbeJobSendQueue  # noqa: E402
from services.ai_agent import IMORTALPredictiveCascadeRouter, imortal_cascade_router  # noqa: E402
from services.orbejobs_mailer import (  # noqa: E402
    MAX_DAILY_SEND_HARD_CAP,
    clamp_daily_limit,
    dispatch_queue_item,
    validate_email_mx_records,
)
from services.orbejobs_scraper import (  # noqa: E402
    compute_job_url_hash,
    fetch_greenhouse_jobs,
    fetch_lever_jobs,
    fetch_rss_jobs,
)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    imortal_cascade_router.clear_cache()


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def _provision_user(client: AsyncClient, email: str, biz_name: str):
    uid = str(uuid.uuid4())
    biz_id = str(uuid.uuid4())
    pw_hash = bcrypt.hashpw(b"123123123", bcrypt.gensalt()).decode()

    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (id, email, full_name, password_hash, role, is_email_verified, subscription_status, created_at)"
                " VALUES (:id, :email, :fn, :pw, 'admin', 1, 'active', datetime('now'))"
            ),
            {"id": uid, "email": email, "fn": biz_name, "pw": pw_hash},
        )
        await conn.execute(
            text(
                "INSERT INTO businesses (id, user_id, name, category, cashflow_horizon_months, created_at, updated_at)"
                " VALUES (:id, :uid, :name, 'SERVICOS', 6, datetime('now'), datetime('now'))"
            ),
            {"id": biz_id, "uid": uid, "name": biz_name},
        )
        await conn.execute(
            text(
                "INSERT INTO business_operators (id, business_id, user_id, created_at)"
                " VALUES (:id, :biz, :uid, datetime('now'))"
            ),
            {"id": str(uuid.uuid4()), "biz": biz_id, "uid": uid},
        )

    r_login = await client.post("/api/v1/auth/login", json={"email": email, "password": "123123123"})
    assert r_login.status_code == 200, r_login.text
    return {
        "user_id": uid,
        "business_id": biz_id,
        "headers": {"Authorization": f"Bearer {r_login.json()['access_token']}"},
    }


@pytest.mark.asyncio
async def test_1_living_cv_whatsapp_pdf_and_pgvector_ranking(client: AsyncClient):
    ctx = await _provision_user(client, "cand1@orbesystems.com.br", "Rafael Candidato")
    headers = ctx["headers"]

    # 1. Atualização via WhatsApp (+XP, +Curso, +Skill)
    r_wa = await client.post(
        "/api/v1/orbejobs/living-cv/whatsapp-update",
        json={
            "phone": "5551999990000",
            "message": (
                "+XP Arquiteto Python Senior na Orbe Systems | FastAPI, pgvector e Z3\n"
                "+Curso Engenharia de Compiladores e SMT Solvers @ MIT OCW\n"
                "+Skill Python, FastAPI, PostgreSQL, pgvector, Docker"
            ),
        },
        headers=headers,
    )
    assert r_wa.status_code == 200, r_wa.text
    wa_data = r_wa.json()
    assert len(wa_data["actions"]) == 3
    resume = wa_data["profile"]["json_resume"]
    assert resume["work"][0]["name"] == "Orbe Systems"
    assert resume["certificates"][0]["issuer"] == "MIT OCW"

    # 2. Upload de PDF para Living CV
    minimal_pdf = (
        b"%PDF-1.4\n1 0 obj<<>>endobj\n"
        b"2 0 obj<< /Length 44 >>stream\nBT (Senior Python FastAPI Kubernetes AWS) Tj ET\nendstream endobj\n%%EOF"
    )
    r_pdf = await client.post(
        "/api/v1/orbejobs/living-cv/upload-pdf",
        files={"file": ("cv_orbe.pdf", minimal_pdf, "application/pdf")},
        headers=headers,
    )
    assert r_pdf.status_code == 200, r_pdf.text
    assert len(r_pdf.json()["pdf_sha256"]) == 64

    # 3. Ingestão manual + ranking pgvector
    r_scrape = await client.post(
        "/api/v1/orbejobs/scrape",
        json={
            "manual_jobs": [
                {
                    "company_name": "Orbe Tech",
                    "title": "Senior Python FastAPI Engineer",
                    "job_url": "https://jobs.example.com/python-fastapi?utm_source=linkedin",
                    "description_text": "Build Python FastAPI microservices with PostgreSQL pgvector and Docker.",
                    "recipient_email": "talent@example.com",
                },
                {
                    "company_name": "Bakery Co",
                    "title": "Pastry Chef",
                    "job_url": "https://jobs.example.com/pastry-chef",
                    "description_text": "Artisan croissants and sourdough bread.",
                },
            ],
            "auto_create_kanban": True,
        },
        headers=headers,
    )
    assert r_scrape.status_code == 200, r_scrape.text
    assert r_scrape.json()["inserted_listings"] == 2
    assert r_scrape.json()["created_kanban_cards"] == 2

    r_list = await client.get("/api/v1/orbejobs/listings", headers=headers)
    assert r_list.status_code == 200
    listings = r_list.json()
    assert listings[0]["title"] == "Senior Python FastAPI Engineer"
    assert listings[0]["pgvector_score"] >= listings[1]["pgvector_score"]


@pytest.mark.asyncio
async def test_2_hybrid_scraper_connectors_and_unique_constraint(client: AsyncClient):
    # 1. Mock dos conectores Greenhouse, Lever e RSS
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "boards-api.greenhouse.io" in url:
            return httpx.Response(200, json={
                "jobs": [{
                    "title": "Staff Security Engineer",
                    "absolute_url": "https://boards.greenhouse.io/orbe/jobs/123?gh_src=abc",
                    "location": {"name": "Remote"},
                    "content": "<p>AppSec &amp; Python. Contact sec@orbe.example.com</p>",
                }]
            })
        if "api.lever.co" in url:
            return httpx.Response(200, json=[{
                "text": "Backend Python Developer",
                "hostedUrl": "https://jobs.lever.co/orbe/456?lever-source=x",
                "categories": {"location": "Remote - Brazil"},
                "descriptionPlain": "FastAPI + PostgreSQL",
                "workplaceType": "remote",
            }])
        return httpx.Response(
            200,
            text=(
                "<rss><channel><item><title>Platform Engineer</title>"
                "<link>https://jobs.rss.example.com/999?utm_medium=feed</link>"
                "<description>Kubernetes &amp; Terraform</description>"
                "</item></channel></rss>"
            ),
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as mock_client:
        gh = await fetch_greenhouse_jobs("orbe", client=mock_client)
        lv = await fetch_lever_jobs("orbe", client=mock_client)
        rs = await fetch_rss_jobs("https://feed.example.com/jobs.rss", client=mock_client)

    assert len(gh) == 1 and gh[0]["recipient_email"] == "sec@orbe.example.com"
    assert len(lv) == 1 and lv[0]["source_ats"] == "lever"
    assert len(rs) == 1 and rs[0]["source_ats"] == "rss"

    # Canonicalização garante mesmo SHA-256 mesmo com parâmetros UTM diferentes
    assert compute_job_url_hash("https://jobs.example.com/vaga/1?utm_source=a") == compute_job_url_hash(
        "https://jobs.example.com/vaga/1/?gh_src=b"
    )

    # 2. UniqueConstraint(user_id, job_url_hash) no Kanban
    ctx = await _provision_user(client, "dedup@orbesystems.com.br", "Dedup User")
    headers = ctx["headers"]

    r1 = await client.post(
        "/api/v1/orbejobs/applications",
        json={
            "company_name": "Orbe Corp",
            "job_title": "Security Engineer",
            "job_url": "https://jobs.example.com/sec/10?utm_source=x",
        },
        headers=headers,
    )
    assert r1.status_code == 201

    r2 = await client.post(
        "/api/v1/orbejobs/applications",
        json={
            "company_name": "Orbe Corp",
            "job_title": "Security Engineer",
            "job_url": "https://jobs.example.com/sec/10?ref=linkedin",
        },
        headers=headers,
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_3_imortal_cascade_rotation_and_cache(monkeypatch):
    router = IMORTALPredictiveCascadeRouter(cache_ttl_seconds=300)
    router.clear_cache()

    monkeypatch.setenv("GEMINI_API_KEYS", "gem_key_1")
    monkeypatch.setenv("GROQ_API_KEYS", "groq_key_1")

    calls = []

    async def fail_gemini(self, api_key, sys_p, usr_p, timeout=8.0):
        calls.append(("gemini", api_key))
        raise RuntimeError("Gemini 429 rate limited")

    async def ok_groq(self, api_key, sys_p, usr_p, timeout=8.0):
        calls.append(("groq", api_key))
        return "Carta adaptada via cascata Groq IMORTAL."

    monkeypatch.setattr(IMORTALPredictiveCascadeRouter, "_call_gemini", fail_gemini)
    monkeypatch.setattr(IMORTALPredictiveCascadeRouter, "_call_groq", ok_groq)

    res1 = await router.generate(
        task_type="test_cascade",
        prompt="Gerar carta para Python Engineer CPF 123.456.789-00",
        context_items=[{"title": "Python Engineer", "description_text": "FastAPI pgvector"}],
    )
    assert res1["provider"] == "GROQ_CASCADE_0"
    assert res1["cache_hit"] is False
    assert ("gemini", "gem_key_1") in calls and ("groq", "groq_key_1") in calls

    # 2ª chamada idêntica deve bater no cache sem acionar provedores
    prev_len = len(calls)
    res2 = await router.generate(
        task_type="test_cascade",
        prompt="Gerar carta para Python Engineer CPF 123.456.789-00",
        context_items=[{"title": "Python Engineer", "description_text": "FastAPI pgvector"}],
    )
    assert res2["cache_hit"] is True
    assert len(calls) == prev_len

    # Offline fallback resiliente
    res3 = await router.generate(
        task_type="test_offline",
        prompt="Outro prompt",
        fallback_text="Fallback seguro local",
        simulate_offline=True,
    )
    assert res3["provider"] == "LOCAL_DETERMINISTIC_IMORTAL"
    assert res3["reply"] == "Fallback seguro local"

    # Prioridade 1: Motor Nativo Orbe IA (sem chaves externas)
    monkeypatch.setenv("ORBE_AI_ENGINE_URL", "http://orbe_backend:8000/api/chat")

    async def ok_orbe_ia(self, sys_p, usr_p, context_items=None, task_type="orbejobs", timeout=6.0):
        return "Carta gerada exclusivamente pela Orbe IA interna."

    monkeypatch.setattr(IMORTALPredictiveCascadeRouter, "_call_orbe_ia", ok_orbe_ia)
    res4 = await router.generate(
        task_type="test_orbe_ia",
        prompt="Gerar carta usando apenas a Orbe IA",
        bypass_cache=True,
    )
    assert res4["provider"] == "ORBE_IA_ENGINE"
    assert "Orbe IA interna" in res4["reply"]


@pytest.mark.asyncio
async def test_4_gmail_vault_mx_jitter_cap_killswitch_human_loop_lgpd(client: AsyncClient, monkeypatch):
    ctx = await _provision_user(client, "mailer@orbesystems.com.br", "Mailer User")
    headers = ctx["headers"]

    # 1. Cofre MultiFernet AES-256 (token nunca fica em texto puro no banco)
    raw_token = "ya29.secret_oauth_token_for_gmail_send_only"
    r_vault = await client.post(
        "/api/v1/orbejobs/oauth/gmail/vault",
        json={
            "account_email": "mailer@gmail.com",
            "access_token": raw_token,
            "refresh_token": "1//refresh_secret_xyz",
        },
        headers=headers,
    )
    assert r_vault.status_code == 200
    assert r_vault.json()["cipher_algorithm"] == "MultiFernet AES-256"

    async with AsyncSessionLocal() as db:
        vault_row = (
            await db.execute(select(OrbeJobOAuthVault).where(OrbeJobOAuthVault.user_id == ctx["user_id"]))
        ).scalar_one()
        assert vault_row.encrypted_access_token != raw_token
        assert decrypt_secret(vault_row.encrypted_access_token) == raw_token

    # 2. Teto diário clamped em 15 envios/dia
    assert clamp_daily_limit(99) == MAX_DAILY_SEND_HARD_CAP
    r_cv = await client.put(
        "/api/v1/orbejobs/living-cv",
        json={"human_in_the_loop": True, "daily_send_limit": 12},
        headers=headers,
    )
    assert r_cv.status_code == 200
    assert r_cv.json()["daily_send_limit"] == 12

    # 3. Criar aplicação + adaptar com IA offline
    r_app = await client.post(
        "/api/v1/orbejobs/applications",
        json={
            "company_name": "Acme AI",
            "job_title": "Staff Backend",
            "job_url": "https://acme.example.com/jobs/1",
            "recipient_email": "jobs@acme.example.com",
        },
        headers=headers,
    )
    assert r_app.status_code == 201
    app_id = r_app.json()["id"]

    r_tailor = await client.post(
        f"/api/v1/orbejobs/applications/{app_id}/tailor",
        json={"simulate_offline": True},
        headers=headers,
    )
    assert r_tailor.status_code == 200

    # 4. Validação DNS MX mockada no router
    monkeypatch.setattr(
        "routers.orbejobs.validate_email_mx_records",
        lambda email, **kw: (True, ["mx1.acme.example.com"], None) if "acme.example.com" in email else (False, [], "No MX"),
    )

    r_mx_bad = await client.post(
        "/api/v1/orbejobs/dns-mx/check",
        json={"email": "bounce@invalid.local"},
        headers=headers,
    )
    assert r_mx_bad.status_code == 200
    assert r_mx_bad.json()["mx_valid"] is False

    # 5. Enfileirar com Human-in-the-Loop ativo -> fica PENDING_APPROVAL e bloqueia dispatch até aprovação
    r_q = await client.post(
        "/api/v1/orbejobs/queue/enqueue",
        json={"application_id": app_id, "auto_dispatch": True},
        headers=headers,
    )
    assert r_q.status_code == 200, r_q.text
    q_data = r_q.json()
    assert q_data["status"] == "PENDING_APPROVAL"
    assert q_data["jitter_seconds"] >= 15.0

    # Verificar que dispatch direto ainda bloqueia sem aprovação humana
    async with AsyncSessionLocal() as db:
        q_row = (await db.execute(select(OrbeJobSendQueue).where(OrbeJobSendQueue.id == q_data["queue_id"]))).scalar_one()
        from models.models import LivingCVProfile
        prof = (await db.execute(select(LivingCVProfile).where(LivingCVProfile.user_id == ctx["user_id"]))).scalar_one()
        v_row = (await db.execute(select(OrbeJobOAuthVault).where(OrbeJobOAuthVault.user_id == ctx["user_id"]))).scalar_one()

        res_unapproved = await dispatch_queue_item(
            db,
            queue_item=q_row,
            profile=prof,
            vault=v_row,
            mx_resolver_fn=lambda _d: ["mx1.acme.example.com"],
        )
        assert res_unapproved["status"] == "PENDING_APPROVAL"

        # Testar anti-bounce DNS MX no dispatch
        orig_email = q_row.recipient_email
        q_row.recipient_email = "bad@nomx.invalid"
        prof.human_in_the_loop = False
        res_bad_mx = await dispatch_queue_item(
            db,
            queue_item=q_row,
            profile=prof,
            vault=v_row,
            mx_resolver_fn=lambda _d: [],
        )
        assert res_bad_mx["status"] == "FAILED_MX"
        q_row.recipient_email = orig_email
        prof.human_in_the_loop = True
        await db.commit()

    # 6. Aprovar Human-in-the-Loop e despachar com sucesso via Gmail mockado
    r_approve = await client.patch(
        f"/api/v1/orbejobs/applications/{app_id}/stage",
        json={"approved_by_human": True},
        headers=headers,
    )
    assert r_approve.status_code == 200
    assert r_approve.json()["approved_by_human"] is True

    async with AsyncSessionLocal() as db:
        q_row = (await db.execute(select(OrbeJobSendQueue).where(OrbeJobSendQueue.id == q_data["queue_id"]))).scalar_one()
        prof = (await db.execute(select(LivingCVProfile).where(LivingCVProfile.user_id == ctx["user_id"]))).scalar_one()
        v_row = (await db.execute(select(OrbeJobOAuthVault).where(OrbeJobOAuthVault.user_id == ctx["user_id"]))).scalar_one()
        res_sent = await dispatch_queue_item(
            db,
            queue_item=q_row,
            profile=prof,
            vault=v_row,
            mx_resolver_fn=lambda _d: ["mx1.acme.example.com"],
            gmail_sender_fn=lambda tok, snd, rcp, sub, body: "gmail-msg-001",
        )
        assert res_sent["status"] == "SENT"
        assert res_sent["gmail_message_id"] == "gmail-msg-001"
        await db.commit()

    # 7. Kill-Switch bloqueia novos enfileiramentos
    r_ks = await client.post(
        "/api/v1/orbejobs/kill-switch",
        json={"active": True, "reason": "Pausa imediata"},
        headers=headers,
    )
    assert r_ks.status_code == 200
    assert r_ks.json()["kill_switch_active"] is True

    r_blocked_enq = await client.post(
        "/api/v1/orbejobs/queue/enqueue",
        json={"application_id": app_id},
        headers=headers,
    )
    assert r_blocked_enq.status_code == 423

    # 8. Auditoria LGPD + Direito ao Esquecimento Art. 18
    r_audit = await client.get("/api/v1/orbejobs/lgpd/audit", headers=headers)
    assert r_audit.status_code == 200
    assert len(r_audit.json()["send_logs"]) >= 1
    assert len(r_audit.json()["audit_events"]) >= 1

    r_purge = await client.delete("/api/v1/orbejobs/lgpd/purge", headers=headers)
    assert r_purge.status_code == 200
    assert r_purge.json()["lgpd_art_18"] is True

    async with AsyncSessionLocal() as db:
        logs = (await db.execute(select(OrbeJobSendLog).where(OrbeJobSendLog.user_id == ctx["user_id"]))).scalars().all()
        assert all(lg.recipient_email == "[REDACTED_LGPD]" for lg in logs)
        assert validate_email_mx_records("invalid")[0] is False


@pytest.mark.asyncio
async def test_5_multitenant_isolation_orbejobs(client: AsyncClient):
    ctx_a = await _provision_user(client, "tenant_a@orbesystems.com.br", "Tenant A")
    ctx_b = await _provision_user(client, "tenant_b@orbesystems.com.br", "Tenant B")

    r_app = await client.post(
        "/api/v1/orbejobs/applications",
        json={
            "company_name": "Secret Corp",
            "job_title": "Principal Architect",
            "job_url": "https://secret.example.com/jobs/1",
        },
        headers=ctx_a["headers"],
    )
    assert r_app.status_code == 201
    app_a_id = r_app.json()["id"]

    # Tenant B não vê e não pode mover candidatura de Tenant A
    r_list_b = await client.get("/api/v1/orbejobs/applications", headers=ctx_b["headers"])
    assert r_list_b.status_code == 200
    assert len(r_list_b.json()) == 0

    r_patch_b = await client.patch(
        f"/api/v1/orbejobs/applications/{app_a_id}/stage",
        json={"stage": "INTERVIEW"},
        headers=ctx_b["headers"],
    )
    assert r_patch_b.status_code == 404
