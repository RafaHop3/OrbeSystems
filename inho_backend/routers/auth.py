"""
INHO – Auth Router
POST /auth/register | POST /auth/login | POST /auth/refresh
"""
import uuid
import json
import secrets
import pyotp
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
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
    WebhookProvisionRequest, MFASetupResponse, MFAVerifyRequest
)
from services.audit import write_audit
from core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

# FIX: Rate limiter especifico para rotas de autenticacao (mais restritivo)
_limiter = Limiter(key_func=get_remote_address)


# Removed /register endpoint completely to block unauthorized insertions.
@router.post("/login", response_model=TokenResponse)
@_limiter.limit("100/minute")   # Dev friendly rate limit
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=403, detail="PAYMENT_REQUIRED")

    if not verify_password(body.password, user.hashed_password):
        await write_audit(
            db, AuditAction.FAILED_LOGIN, "User",
            detail={"email": body.email}, request=request,
        )
        await db.commit()
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desativada")

    if user.is_mfa_enabled:
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

        if not is_totp_valid and not is_backup_valid:
            remaining = mfa_limiter.record_failure(user.email)
            raise HTTPException(
                status_code=401,
                detail=f"Codigo 2FA invalido ou expirado. Tentativas restantes antes do bloqueio: {remaining}"
            )

        # Successful verification -> Reset rate limiter
        mfa_limiter.reset(user.email)

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

    await write_audit(
        db, AuditAction.LOGIN, "User",
        user_id=user.id, entity_id=str(user.id),
        detail={"email": user.email}, request=request,
    )
    await db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)


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
            user_id = uuid.UUID(user_id)
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
    if user.role != UserRole.ADMIN and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores podem ativar 2FA/MFA")

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


@router.post("/webhook/provision", response_model=dict, status_code=status.HTTP_201_CREATED)
async def webhook_provision(
    request: Request,
    body: WebhookProvisionRequest,
    x_inho_system_secret: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    INTERNAL USE ONLY: Chamado pelo Webhook do Orbe Hub após pagamento no Stripe.
    Cria um mestre (Proprietário/Admin) com os mesmos dados e hash de senha.
    """
    if not x_inho_system_secret or x_inho_system_secret != settings.INHO_SYSTEM_SECRET:
        raise HTTPException(status_code=403, detail="Acesso negado: Secret interno invalido")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        # Idempotent return (in case stripe webhook fires twice)
        return {"message": "Usuario já provisionado", "status": "idempotent_ok"}

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=body.hashed_password,
        role=UserRole.ADMIN,  # Provisioned as master
        is_active=True,
        is_verified=True,
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
