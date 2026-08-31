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
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")
    
    jwt_type = payload.get("type")
    if jwt_type and jwt_type != "access":
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acesso invalido")

    user_id = payload.get("sub")
    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ID de usuario invalido (UUID esperado)")

    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado")
    
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer ADMIN")
    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado: requer SUPER_ADMIN")
    return user
