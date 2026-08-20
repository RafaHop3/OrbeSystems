"""
INHO – Auth Router
POST /auth/register | POST /auth/login | POST /auth/refresh
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import create_access_token, create_refresh_token, hash_password, verify_password, decode_token
from db.session import get_db
from models.models import AuditAction, User, UserRole
from schemas.schemas import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest, WebhookProvisionRequest
from services.audit import write_audit
from fastapi import Header

router = APIRouter(prefix="/auth", tags=["Auth"])

# FIX: Rate limiter especifico para rotas de autenticacao (mais restritivo)
_limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@_limiter.limit("20/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ja cadastrado")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()

    await write_audit(
        db, AuditAction.CREATE, "User",
        user_id=user.id, entity_id=str(user.id),
        detail={"email": user.email, "action": "register"},
        request=request,
    )
    await db.commit()
    return {"message": "Usuario criado com sucesso", "user_id": str(user.id)}


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

    if not user or not verify_password(body.password, user.hashed_password):
        await write_audit(
            db, AuditAction.FAILED_LOGIN, "User",
            detail={"email": body.email}, request=request,
        )
        await db.commit()
        raise HTTPException(status_code=401, detail="Credenciais invalidas")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desativada")

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access  = create_access_token(str(user.id), role_val)
    refresh = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
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
        max_age=7 * 86400
    )

    return TokenResponse(access_token=access, refresh_token=refresh_new)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie("inho_refresh_token")
    return None


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
