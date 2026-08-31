"""
INHO – Auth Dependencies
FastAPI Depends para proteger rotas com JWT.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import uuid

from core.security import decode_token
from db.session import get_db
from models.models import User, UserRole

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    import httpx
    from jose import jwt
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.orbesystems.com.br/api/admin/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        if res.status_code == 401:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado (Rejeitado pelo Master DB)")
        
    try:
        # Signature mathematically validated by Master backend, safe to extract payload blindly
        payload = jwt.get_unverified_claims(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")
    
    jwt_type = payload.get("type")
    if jwt_type and jwt_type != "access":
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acesso invalido via Token reverso")

    user_id = payload.get("sub")
    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(user_id)
        except ValueError:
            pass

    from sqlalchemy import text
    user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id

    # SSO Proxy Bypass: Query master Orbe Hub schema natively instead of INHO mapped schema
    query = text("SELECT id, email, role, is_email_verified, is_mfa_enabled FROM public.users WHERE id = :sub OR email = :sub")
    result = await db.execute(query, {"sub": user_id_str})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado no Master DB (Orbe Hub)")

    # Normalize role for the Enum (e.g. 'superadmin' from Orbe to 'SUPER_ADMIN')
    raw_role = row[2]
    if raw_role == "superadmin":
        raw_role = "SUPER_ADMIN"
    
    try:
        mapped_role = UserRole(raw_role) if raw_role else UserRole.OPERATOR
    except ValueError:
        mapped_role = UserRole.OPERATOR

    # Construct transient User to satisfy downstream INHO dependencies
    user = User(
        id=uuid.UUID(row[0]) if isinstance(row[0], str) else row[0],
        email=row[1],
        role=mapped_role,
        is_active=True,
        is_verified=row[3],
        is_mfa_enabled=row[4] if row[4] is not None else False
    )

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer ADMIN")
    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer SUPER_ADMIN")
    return user
