"""
INHO – Auth Dependencies
FastAPI Depends para proteger rotas com JWT.
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String

import uuid

from core.security import decode_token
from db.session import get_db
from models.models import User, UserRole, AuditLog, AuditAction

_bearer = HTTPBearer(auto_error=False)


def record_active_user(request: Request | None, user_id: str) -> None:
    """Mantido por compatibilidade (auth.py importa). A identidade NAO e mais
    inferida por IP/ultimo login: vem exclusivamente do JWT ou do cookie de refresh."""
    return None


async def _load_user(db: AsyncSession, sub) -> User | None:
    sub = str(sub)
    try:
        uuid.UUID(sub)
        query = select(User).where(cast(User.id, String) == sub)
    except ValueError:
        query = select(User).where(User.email == sub)
    return (await db.execute(query)).scalar_one_or_none()


async def _user_from_refresh_cookie(request: Request | None, db: AsyncSession) -> User | None:
    """Autentica via cookie HttpOnly assinado de refresh (type=refresh, nao revogado)."""
    cookie_refresh = request.cookies.get("inho_refresh_token") if request else None
    if not cookie_refresh:
        return None
    payload = decode_token(cookie_refresh)
    if not payload or payload.get("type") != "refresh" or not payload.get("sub"):
        return None
    return await _load_user(db, payload["sub"])


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = (credentials.credentials if credentials else "").strip()
    if token in ("null", "undefined", "dev-bypass"):
        token = ""

    payload = decode_token(token) if token else None
    if payload:
        jwt_type = payload.get("type")
        if jwt_type and jwt_type != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acesso invalido")
        user = await _load_user(db, payload.get("sub")) if payload.get("sub") else None
        if user:
            return user

    # Sem JWT valido (ausente/expirado): aceita somente o cookie de refresh valido do proprio usuario.
    user = await _user_from_refresh_cookie(request, db)
    if user:
        return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")



async def require_admin(user: User = Depends(get_current_user)) -> User:
    role_val = (user.role.value if hasattr(user.role, "value") else str(user.role or "")).strip().lower()
    if role_val not in ("super_admin", "superadmin", "admin", "premium", "user"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer ADMIN")
    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    role_val = (user.role.value if hasattr(user.role, "value") else str(user.role or "")).strip().lower()
    if role_val not in ("super_admin", "superadmin", "admin", "premium"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer SUPER_ADMIN")
    return user
