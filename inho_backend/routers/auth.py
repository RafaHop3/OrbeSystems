from sqlalchemy import cast, String
"""
INHO – Auth Router
POST /auth/register | POST /auth/login | POST /auth/refresh
"""
import os
import uuid
import json
import secrets
import pyotp
from datetime import datetime, timezone, timedelta
from jose import jwt
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select, cast, String, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import (
    create_access_token, create_refresh_token, hash_password, verify_password,
    decode_token, encrypt_secret, decrypt_secret
)
from core.token_blacklist import token_blacklist
from core.mfa_limiter import mfa_limiter
from db.session import get_db
from models.models import AuditAction, User, UserRole
from schemas.schemas import (
    LoginRequest, RegisterRequest, TokenResponse, RefreshRequest,
    WebhookProvisionRequest, WelcomeSetupRequest, MFASetupResponse, MFAVerifyRequest
)
from services.audit import write_audit
from core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

# FIX: Rate limiter especifico para rotas de autenticacao (mais restritivo)
_limiter = Limiter(key_func=get_remote_address)

def _is_user_mfa_enabled(user: User) -> bool:
    """
    Verifica se o 2FA deve ser cobrado no login.
    Em produção, o 2FA está temporariamente desativado por padrão (a menos que ENFORCE_MANDATORY_MFA=true),
    permitindo login direto com e-mail e senha sem bloquear usuários cujo Authenticator esteja dessincronizado.
    """
    if not _is_mandatory_mfa_active():
        return False
    val = getattr(user, "is_mfa_enabled", False)
    if isinstance(val, str):
        return val.strip().lower() in ("true", "1", "t", "yes")
    return bool(val)


def _is_mandatory_mfa_active() -> bool:
    """Exige Authenticator App somente quando ENFORCE_MANDATORY_MFA=true."""
    env_val = os.environ.get("ENFORCE_MANDATORY_MFA", "").strip().lower()
    if env_val in ("true", "1", "yes"):
        return True
    if env_val in ("false", "0", "no"):
        return False
    if os.environ.get("DATABASE_URL", "").startswith("sqlite"):
        return False
    return bool(getattr(settings, "ENFORCE_MANDATORY_MFA", False))


def _create_mfa_enrollment_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=10)
    return jwt.encode(
        {"sub": str(user_id), "scope": "mfa_enrollment", "exp": exp},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


class _MFAEnrollConfirmRequest(BaseModel):
    mfa_enrollment_token: str
    code: str


class _MFAEnrollConfirmResponse(TokenResponse):
    requires_password_change: bool = True


class _ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str



async def _post_login_background_task(
    user_id_str: str,
    user_email: str,
    user_full_name: str,
    user_role_label: str,
    needs_rehash: bool,
    plain_password: str,
    ip_addr: str | None,
    user_agent: str | None,
):
    from starlette.concurrency import run_in_threadpool
    from sqlalchemy import update
    from db.session import AsyncSessionLocal
    from models.models import AuditLog

    try:
        new_hash = None
        if needs_rehash and plain_password:
            new_hash = await run_in_threadpool(hash_password, plain_password)

        async with AsyncSessionLocal() as bg_db:
            if new_hash:
                await bg_db.execute(
                    update(User)
                    .where(cast(User.id, String) == user_id_str)
                    .values(password_hash=new_hash)
                )
            log = AuditLog(
                user_id=user_id_str,
                user_name=user_full_name,
                user_role=user_role_label,
                action=AuditAction.LOGIN,
                entity="User",
                entity_id=user_id_str,
                detail=json.dumps({"email": user_email}),
                ip_address=ip_addr,
                user_agent=user_agent,
            )
            bg_db.add(log)
            await bg_db.commit()
    except Exception:
        pass


# Removed /register endpoint completely to block unauthorized insertions.
from fastapi import BackgroundTasks

@router.post("/login", response_model=TokenResponse)
@_limiter.limit("20/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func, or_
    raw_id = (body.email or body.username or "").strip().lower()
    if not raw_id or not body.password:
        raise HTTPException(status_code=400, detail="Preencha e-mail e senha.")

    base_prefix = raw_id[:-6] if raw_id.endswith("_admin") else raw_id
    result = await db.execute(
        select(User).where(
            or_(
                func.lower(User.email) == raw_id,
                func.lower(User.email) == f"{raw_id}@orbesystems.com.br",
                func.lower(User.email) == f"{base_prefix}@orbesystems.com.br",
                func.lower(User.full_name_db) == raw_id,
            )
        )
    )
    user: User | None = result.scalars().first()

    if not user or (getattr(user, "subscription_status", "active") or "active").lower() != "active":
        raise HTTPException(status_code=403, detail="PAYMENT_REQUIRED")

    from starlette.concurrency import run_in_threadpool

    pwd_ok = await run_in_threadpool(verify_password, body.password, user.password_hash)
    if not pwd_ok and body.password != body.password.strip():
        pwd_ok = await run_in_threadpool(verify_password, body.password.strip(), user.password_hash)

    if not pwd_ok:
        # ── Superadmin env-var bypass ─────────────────────────────────
        _admin_user = getattr(settings, "ADMIN_USERNAME", "")
        _admin_hash = getattr(settings, "ADMIN_PASSWORD_HASH", "")
        _is_admin_bypass = (
            raw_id in (_admin_user.lower(), "rafael_admin")
            and bool(_admin_hash)
            and await run_in_threadpool(verify_password, body.password.strip(), _admin_hash)
        )
        if not _is_admin_bypass:
            await write_audit(
                db, AuditAction.FAILED_LOGIN, "User",
                detail={"email": raw_id}, request=request,
            )
            await db.commit()
            raise HTTPException(status_code=401, detail="Credenciais invalidas")
        # bypass granted — fall through to token generation

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desativada")

    if _is_user_mfa_enabled(user):
        if mfa_limiter.is_locked(user.email):
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas falhas de 2FA. Conta bloqueada temporariamente por 15 minutos por seguranca."
            )

        if not body.mfa_code:
            raise HTTPException(status_code=403, detail="MFA_REQUIRED")

        # 1. Decrypt TOTP secret (AES-256)
        plain_secret = decrypt_secret(user.otp_secret)
        totp = pyotp.TOTP(plain_secret)

        is_totp_valid = totp.verify(body.mfa_code, valid_window=1)
        is_backup_valid = False

        # 2. Check Emergency Backup Recovery Codes if TOTP failed
        user_backup_list = []
        if user.backup_codes:
            try:
                user_backup_list = json.loads(user.backup_codes)
            except Exception:
                user_backup_list = []

        clean_input_code = body.mfa_code.strip().upper()
        if not is_totp_valid and clean_input_code in user_backup_list:
            is_backup_valid = True
            # Single-use: remove consumed backup code
            user_backup_list.remove(clean_input_code)
            user.backup_codes = json.dumps(user_backup_list)
            await db.commit()

        if not is_totp_valid and not is_backup_valid:
            remaining = mfa_limiter.record_failure(user.email)
            raise HTTPException(
                status_code=401,
                detail=f"Codigo 2FA invalido ou expirado. Tentativas restantes antes do bloqueio: {remaining}"
            )

        # Successful verification -> Reset rate limiter
        mfa_limiter.reset(user.email)
    elif _is_mandatory_mfa_active():
        if not user.otp_secret:
            plain_secret = pyotp.random_base32()
            user.otp_secret = encrypt_secret(plain_secret)
        else:
            plain_secret = decrypt_secret(user.otp_secret)

        if not user.backup_codes:
            raw_backup_codes = [f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}" for _ in range(8)]
            user.backup_codes = json.dumps(raw_backup_codes)
        else:
            try:
                raw_backup_codes = json.loads(user.backup_codes)
            except Exception:
                raw_backup_codes = []

        await db.commit()
        totp = pyotp.TOTP(plain_secret)
        provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="INHO Platform")
        enrollment_token = _create_mfa_enrollment_token(str(user.id))
        raise HTTPException(
            status_code=403,
            detail={
                "code": "MFA_ENROLLMENT_REQUIRED",
                "message": "Ativação obrigatória do Authenticator App necessária para concluir o login.",
                "mfa_enrollment_token": enrollment_token,
                "secret": plain_secret,
                "provisioning_uri": provisioning_uri,
                "backup_codes": raw_backup_codes,
            },
        )

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access  = create_access_token(str(user.id), role_val)
    refresh = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        domain=".orbesystems.com.br" if settings.APP_ENV == "production" else None,
        max_age=7 * 86400  # 7 days
    )

    needs_rehash = bool(
        user.password_hash
        and (user.password_hash.startswith("$2b$12$") or user.password_hash.startswith("$2a$12$"))
    )
    from services.audit import _extract_ip, _extract_ua
    background_tasks.add_task(
        _post_login_background_task,
        user_id_str=str(user.id),
        user_email=user.email,
        user_full_name=str(user.full_name),
        user_role_label=str(getattr(user, "role_label", role_val)),
        needs_rehash=needs_rehash,
        plain_password=body.password.strip(),
        ip_addr=_extract_ip(request),
        user_agent=_extract_ua(request),
    )

    from core.deps import record_active_user
    record_active_user(request, str(user.id))
    return TokenResponse(access_token=access, refresh_token=refresh, full_name=user.full_name, email=user.email)


@router.post("/refresh", response_model=TokenResponse)
@_limiter.limit("30/minute")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get("inho_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token ausente no cookie")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token invalido")

    user_id = payload.get("sub")
    if isinstance(user_id, str):
        try:
            uuid_val = uuid.UUID(user_id)
        except ValueError:
            pass

    result  = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")

    role_val    = user.role.value if hasattr(user.role, "value") else str(user.role)
    access      = create_access_token(str(user.id), role_val)
    refresh_new = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh_new,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        domain=".orbesystems.com.br" if settings.APP_ENV == "production" else None,
        max_age=7 * 86400
    )

    from core.deps import record_active_user
    record_active_user(request, str(user.id))
    return TokenResponse(access_token=access, refresh_token=refresh_new)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
):
    # Extracts bearer token if present and revokes it
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        token_blacklist.revoke(token)

    refresh_token = request.cookies.get("inho_refresh_token")
    if refresh_token:
        token_blacklist.revoke(refresh_token)

    response.delete_cookie("inho_refresh_token")
    return None


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Gera chave secreta TOTP (criptografada com AES-256) e 8 códigos de emergência (Break Glass)."""
    # Todos os perfis podem ativar/reconfigurar Authenticator App (MFA obrigatório)

    plain_secret = pyotp.random_base32()
    # AES-256 Fernet Encryption at rest
    user.otp_secret = encrypt_secret(plain_secret)

    # Generate 8 single-use emergency backup recovery codes
    raw_backup_codes = [f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}" for _ in range(8)]
    user.backup_codes = json.dumps(raw_backup_codes)

    await db.commit()

    totp = pyotp.TOTP(plain_secret)
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="INHO Platform")
    return MFASetupResponse(secret=plain_secret, provisioning_uri=provisioning_uri, backup_codes=raw_backup_codes)


@router.post("/mfa/verify", response_model=dict)
async def mfa_verify(
    body: MFAVerifyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Valida o código de 6 dígitos gerado pelo app de 2FA e ativa o MFA para a conta."""
    if not user.otp_secret:
        raise HTTPException(status_code=400, detail="MFA nao foi iniciado para este usuario")

    if mfa_limiter.is_locked(user.email):
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas falhas de 2FA. Bloqueado por 15 minutos por seguranca."
        )

    plain_secret = decrypt_secret(user.otp_secret)
    totp = pyotp.TOTP(plain_secret)

    if not totp.verify(body.code, valid_window=1):
        remaining = mfa_limiter.record_failure(user.email)
        raise HTTPException(
            status_code=401,
            detail=f"Codigo 2FA invalido ou expirado. Tentativas restantes: {remaining}"
        )

    mfa_limiter.reset(user.email)
    user.is_mfa_enabled = True
    await db.commit()
    return {"message": "MFA ativado com sucesso!", "is_mfa_enabled": True}


@router.post("/mfa/enroll-confirm", response_model=_MFAEnrollConfirmResponse)
@_limiter.limit("10/minute")
async def mfa_enroll_confirm(
    request: Request,
    response: Response,
    body: _MFAEnrollConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirma o primeiro código do Authenticator App no login e conclui a autenticação."""
    try:
        payload = jwt.decode(body.mfa_enrollment_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Token de ativação MFA inválido ou expirado. Faça login novamente.")

    if payload.get("scope") != "mfa_enrollment" or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Escopo de token MFA inválido.")

    res = await db.execute(select(User).where(cast(User.id, String) == str(payload["sub"])))
    user = res.scalar_one_or_none()
    if not user or not user.is_active or not user.otp_secret:
        raise HTTPException(status_code=401, detail="Usuário não encontrado ou sem segredo MFA inicializado.")

    if mfa_limiter.is_locked(user.email):
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas falhas de 2FA. Bloqueado por 15 minutos por seguranca.",
        )

    plain_secret = decrypt_secret(user.otp_secret)
    totp = pyotp.TOTP(plain_secret)
    if not totp.verify(body.code.strip(), valid_window=1):
        remaining = mfa_limiter.record_failure(user.email)
        raise HTTPException(
            status_code=401,
            detail=f"Codigo 2FA invalido ou expirado. Tentativas restantes: {remaining}",
        )

    mfa_limiter.reset(user.email)
    user.is_mfa_enabled = True
    await db.commit()

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access = create_access_token(str(user.id), role_val)
    refresh = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        domain=".orbesystems.com.br" if settings.APP_ENV == "production" else None,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/v1/auth",
    )

    try:
        await write_audit(
            db,
            action=AuditAction.LOGIN,
            entity="auth_mfa_enrolled",
            user=user,
            detail=f"MFA obrigatório ativado e login concluído para {user.email}",
        )
    except Exception:
        pass

    return _MFAEnrollConfirmResponse(access_token=access, refresh_token=refresh, requires_password_change=True)


@router.post("/change-password", response_model=dict)
@_limiter.limit("10/minute")
async def change_password(
    request: Request,
    body: _ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permite ao usuário trocar a senha após ativar o Authenticator App (ou no perfil)."""
    res_chk = await db.execute(select(User).where(cast(User.id, String) == str(user.id)))
    db_user_chk = res_chk.scalar_one_or_none() or user
    pwd_valid = verify_password(body.current_password, db_user_chk.password_hash)
    if not pwd_valid and body.current_password != body.current_password.strip():
        pwd_valid = verify_password(body.current_password.strip(), db_user_chk.password_hash)
    if not pwd_valid:
        raise HTTPException(status_code=401, detail="Senha atual incorreta.")
    if len((body.new_password or "").strip()) < 8:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 8 caracteres.")
    if body.new_password.strip() == body.current_password.strip():
        raise HTTPException(status_code=400, detail="A nova senha deve ser diferente da senha atual.")

    res = await db.execute(select(User).where(cast(User.id, String) == str(user.id)))
    db_user = res.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    db_user.password_hash = hash_password(body.new_password.strip())
    from core.deps import _USER_CACHE
    _USER_CACHE.pop(str(db_user.id), None)
    _USER_CACHE.pop(str(db_user.email), None)
    await db.commit()

    try:
        await write_audit(
            db,
            action=AuditAction.UPDATE,
            entity="auth_password_changed",
            user=user,
            detail=f"Senha atualizada após ativação de MFA para {user.email}",
        )
    except Exception:
        pass

    return {"status": "password_updated", "message": "Senha alterada com sucesso!"}


@router.post("/webhook/provision", response_model=dict, status_code=status.HTTP_201_CREATED)
async def webhook_provision(
    request: Request,
    body: WebhookProvisionRequest, WelcomeSetupRequest,
    x_inho_system_secret: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    INTERNAL USE ONLY: Chamado pelo Webhook do Orbe Hub após pagamento no Stripe.
    Cria um mestre (Proprietário/Admin) com os mesmos dados e hash de senha.
    """
    import hmac
    if not x_inho_system_secret or not hmac.compare_digest(
        x_inho_system_secret.encode(), str(settings.INHO_SYSTEM_SECRET).encode()
    ):
        raise HTTPException(status_code=403, detail="Acesso negado: Secret interno invalido")

    existing = await db.execute(select(User).where(func.lower(User.email) == body.email.strip().lower()))
    existing_user = existing.scalar_one_or_none()
    if existing_user:
        existing_user.subscription_status = "active"
        existing_user.role = UserRole.ADMIN
        if body.full_name:
            existing_user.full_name_db = body.full_name
        await db.commit()
        return {"message": "Usuario já provisionado e ativado via Stripe", "status": "idempotent_ok", "user_id": str(existing_user.id)}

    user = User(
        email=body.email.strip().lower(),
        full_name_db=body.full_name,
        password_hash=body.hashed_password,
        role=UserRole.ADMIN,  # Provisioned as master
        subscription_status="active",
        is_email_verified=True,
    )
    db.add(user)
    await db.flush()

    await write_audit(
        db, AuditAction.CREATE, "User",
        user_id=user.id, entity_id=str(user.id),
        detail={"email": user.email, "action": "webhook_provision_admin"},
        request=request,
    )
    await db.commit()
    return {"message": "Admin INHO provisionado com sucesso via Webhook", "user_id": str(user.id)}


@router.post("/welcome-setup", response_model=dict, status_code=status.HTTP_200_OK)
async def welcome_setup_subscriber(
    body: WelcomeSetupRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Chamado pela pagina /bem-vindo apos checkout do Stripe.
    Ativa o usuario como ADMIN, define a senha, provisiona a Business com o plano contratado,
    configura os cookies de sessao e retorna o token JWT para login imediato.
    """
    import asyncio
    from core.security import hash_password, create_access_token, create_refresh_token
    from core.config import PLAN_CATALOG, settings
    from models.models import Business, BusinessCategory
    from services.audit import write_audit, AuditAction
    import stripe

    email_to_use = str(body.email).strip().lower() if body.email else ""
    biz_name = body.business_name or "Minha Empresa"
    plan_tier = "INHO_PRO_IA"
    cycle = "MONTHLY"

    # Buscar dados reais da sessao do Stripe se disponivel
    if body.session_id and not body.session_id.startswith("cs_test_mock") and settings.STRIPE_SECRET_KEY:
        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            session = stripe.checkout.Session.retrieve(body.session_id)
            meta = session.metadata or {}
            session_email = session.customer_email or (session.customer_details.email if session.customer_details else None) or meta.get("email")
            if session_email:
                email_to_use = session_email.strip().lower()
            if meta.get("business_name"):
                biz_name = meta.get("business_name")
            if meta.get("plan_tier"):
                plan_tier = meta.get("plan_tier")
            if meta.get("billing_cycle"):
                cycle = meta.get("billing_cycle")
        except Exception:
            pass

    if not email_to_use:
        raise HTTPException(status_code=400, detail="E-mail de acesso e obrigatorio para ativacao da conta.")

    hashed_pw = hash_password(body.password)

    # 1. Localizar ou Criar User
    existing = await db.execute(select(User).where(func.lower(User.email) == email_to_use))
    user = existing.scalar_one_or_none()

    if user:
        user.password_hash = hashed_pw
        user.subscription_status = "active"
        user.role = UserRole.ADMIN
        user.is_email_verified = True
    else:
        user = User(
            email=email_to_use,
            full_name_db=biz_name,
            password_hash=hashed_pw,
            role=UserRole.ADMIN,
            subscription_status="active",
            is_email_verified=True,
        )
        db.add(user)
        await db.flush()

    # 2. Localizar ou Criar Business
    plan_data = PLAN_CATALOG.get(plan_tier, PLAN_CATALOG["INHO_PRO_IA"])
    existing_biz = await db.execute(select(Business).where(cast(Business.user_id, String) == str(user.id)))
    business = existing_biz.scalar_one_or_none()

    if not business:
        business = Business(
            user_id=user.id,
            name=biz_name,
            category=BusinessCategory.VAREJO,
            plan_tier=plan_data["tier"],
            billing_cycle=cycle,
            monthly_price_cents=plan_data["monthly_price_cents"],
            max_operators=plan_data["max_operators"],
            ai_rag_enabled=plan_data["ai_rag_enabled"],
            cbm_predictive_enabled=plan_data["cbm_predictive_enabled"],
            cooperativa_module_enabled=plan_data["cooperativa_module_enabled"],
            monthly_ai_quota=plan_data["monthly_ai_quota"],
        )
        db.add(business)
    else:
        business.name = biz_name
        business.plan_tier = plan_data["tier"]
        business.billing_cycle = cycle
        business.monthly_price_cents = plan_data["monthly_price_cents"]
        business.max_operators = plan_data["max_operators"]
        business.ai_rag_enabled = plan_data["ai_rag_enabled"]
        business.cbm_predictive_enabled = plan_data["cbm_predictive_enabled"]
        business.cooperativa_module_enabled = plan_data["cooperativa_module_enabled"]
        business.monthly_ai_quota = plan_data["monthly_ai_quota"]

    await write_audit(
        db, AuditAction.CREATE, "User",
        user_id=user.id, entity_id=str(user.id),
        detail={"email": user.email, "action": "welcome_setup_subscriber", "plan": plan_data["tier"]},
        request=request,
    )
    await db.commit()

    # 3. Gerar Tokens de Acesso
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token(str(user.id), role_val)
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        domain=".orbesystems.com.br" if settings.APP_ENV == "production" else None,
        max_age=7 * 86400
    )

    return {
        "status": "success",
        "message": "Conta ativada com sucesso!",
        "access_token": access_token,
        "token_type": "bearer",
        "email": user.email,
        "user_id": str(user.id),
        "business_id": str(business.id),
        "redirect_url": "/dashboard",
    }
