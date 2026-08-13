"""
INHO – Auth Router
POST /auth/register | POST /auth/login | POST /auth/refresh
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import create_access_token, create_refresh_token, hash_password, verify_password, decode_token
from db.session import get_db
from models.models import AuditAction, User
from schemas.schemas import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest
from services.audit import write_audit

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
@_limiter.limit("10/minute")   # FIX: rate limit aplicado — anti brute-force
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

    access  = create_access_token(str(user.id), user.role.value)
    refresh = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh,
        httponly=True,
        secure=True,
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
    result  = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado")

    access      = create_access_token(str(user.id), user.role.value)
    refresh_new = create_refresh_token(str(user.id))

    response.set_cookie(
        key="inho_refresh_token",
        value=refresh_new,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 86400
    )

    return TokenResponse(access_token=access, refresh_token=refresh_new)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie("inho_refresh_token")
    return None
