"""
Tests for Mandatory Authenticator App (TOTP MFA) + Password Change on First Login.
"""
import uuid

import pyotp
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from main import app
from db.session import Base, get_db
from core.security import hash_password
from models.models import User, UserRole


TEST_DB_URL = "sqlite+aiosqlite:///./test_mandatory_mfa.db"


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


@pytest.mark.asyncio
async def test_mandatory_authenticator_enrollment_and_login_flow(db_session: AsyncSession, monkeypatch):
    monkeypatch.setenv("ENFORCE_MANDATORY_MFA", "true")
    uid = str(uuid.uuid4())
    email = f"op_{uid[:6]}@orbesystems.com.br"
    user = User(
        id=uid,
        email=email,
        full_name_db="Operador MFA",
        password_hash=hash_password("SenhaForte123!"),
        role=UserRole.OPERATOR,
        is_email_verified=True,
        is_mfa_enabled=False,
    )
    db_session.add(user)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. First login without MFA -> 403 MFA_ENROLLMENT_REQUIRED (no access_token)
        r1 = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "SenhaForte123!"},
        )
        assert r1.status_code == 403
        det = r1.json()["detail"]
        assert det["code"] == "MFA_ENROLLMENT_REQUIRED"
        assert det["provisioning_uri"].startswith("otpauth://totp/")
        assert len(det["backup_codes"]) == 8
        enroll_token = det["mfa_enrollment_token"]
        secret = det["secret"]

        # 2. Wrong TOTP code -> 401
        r_bad = await client.post(
            "/api/v1/auth/mfa/enroll-confirm",
            json={"mfa_enrollment_token": enroll_token, "code": "000000"},
        )
        assert r_bad.status_code == 401

        # 3. Valid TOTP code -> 200 + access_token + requires_password_change
        valid_code = pyotp.TOTP(secret).now()
        r_ok = await client.post(
            "/api/v1/auth/mfa/enroll-confirm",
            json={"mfa_enrollment_token": enroll_token, "code": valid_code},
        )
        assert r_ok.status_code == 200
        assert r_ok.json().get("access_token")
        assert r_ok.json().get("requires_password_change") is True
        access_tok = r_ok.json()["access_token"]

        # 3b. User changes password right after MFA enrollment
        r_pw = await client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {access_tok}"},
            json={"current_password": "SenhaForte123!", "new_password": "NovaSenhaSuperSegura!2026"},
        )
        assert r_pw.status_code == 200
        assert r_pw.json()["status"] == "password_updated"

        # 4. Subsequent login with NEW password without mfa_code -> 403 MFA_REQUIRED
        r2 = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "NovaSenhaSuperSegura!2026"},
        )
        assert r2.status_code == 403
        assert r2.json()["detail"] == "MFA_REQUIRED"

        # 5. Subsequent login with NEW password + backup code -> 200
        r3 = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "NovaSenhaSuperSegura!2026", "mfa_code": det["backup_codes"][0]},
        )
        assert r3.status_code == 200
        assert r3.json().get("access_token")
