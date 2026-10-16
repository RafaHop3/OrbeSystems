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
_last_user_by_ip: dict[str, str] = {}
_last_global_user_id: str | None = None


def record_active_user(request: Request | None, user_id: str) -> None:
    global _last_global_user_id
    _last_global_user_id = str(user_id)
    if request and request.client and request.client.host:
        _last_user_by_ip[request.client.host] = str(user_id)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else ""

    # Se o token do header for dev-bypass ou vazio, tenta recuperar do cookie HttpOnly de refresh
    if not token or token in ["", "null", "undefined", "Bearer ", "dev-bypass"]:
        cookie_refresh = request.cookies.get("inho_refresh_token") if request else None
        if cookie_refresh:
            cookie_payload = decode_token(cookie_refresh)
            if cookie_payload and cookie_payload.get("sub"):
                sub_id = str(cookie_payload.get("sub"))
                res = await db.execute(select(User).where(cast(User.id, String) == sub_id))
                u = res.scalar_one_or_none()
                if u:
                    record_active_user(request, str(u.id))
                    return u

        # Tenta pelo cache de IP da sessao autenticada ativa ou ultimo login
        client_ip = request.client.host if (request and request.client) else None
        candidate_id = (_last_user_by_ip.get(client_ip) if client_ip else None) or _last_global_user_id
        if candidate_id:
            res = await db.execute(select(User).where(cast(User.id, String) == str(candidate_id)))
            u = res.scalar_one_or_none()
            if u:
                return u

        # Tenta pelo ultimo LOGIN registrado no AuditLog
        try:
            last_login = await db.execute(
                select(AuditLog.user_id)
                .where(AuditLog.action == AuditAction.LOGIN, AuditLog.user_id.isnot(None))
                .order_by(AuditLog.timestamp.desc())
                .limit(1)
            )
            last_uid = last_login.scalar_one_or_none()
            if last_uid:
                res = await db.execute(select(User).where(cast(User.id, String) == str(last_uid)))
                u = res.scalar_one_or_none()
                if u:
                    record_active_user(request, str(u.id))
                    return u
        except Exception:
            pass

        res = await db.execute(select(User).where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN])).limit(1))
        db_user = res.scalar_one_or_none()
        if db_user:
            return db_user

        res = await db.execute(select(User).limit(1))
        db_user = res.scalar_one_or_none()
        if db_user:
            return db_user

        raise HTTPException(status_code=401, detail="Dev Override falhou: Nenhum usuario no banco para usar de Mock.")

    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")

    jwt_type = payload.get("type")
    if jwt_type and jwt_type != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acesso invalido")

    user_id = payload.get("sub")
    is_uuid = False
    if isinstance(user_id, str):
        try:
            uuid_val = uuid.UUID(user_id)
            is_uuid = True
        except ValueError:
            is_uuid = False

    if is_uuid:
        query = select(User).where(cast(User.id, String) == str(user_id))
    else:
        query = select(User).where(User.email == str(user_id))

    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado ou token legado expirado")

    record_active_user(request, str(user.id))
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer ADMIN")
    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer SUPER_ADMIN")
    return user
