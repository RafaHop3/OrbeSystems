"""
auth_middleware.py — FastAPI dependency para autenticação JWT + verificação de is_premium

Fluxo:
  1. Extrai JWT do header Authorization: Bearer <token>
  2. Decodifica e valida a assinatura
  3. Consulta is_premium no Redis (cache hit → retorna instant)
  4. Cache miss → consulta RDS → repopula Redis
  5. Se is_premium = False → HTTP 403 Forbidden
"""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import text

from config import settings
from database import get_db
from services.redis_service import (
    get_is_premium,
    set_is_premium,
    check_rate_limit,
    AI_RATE_LIMIT,
    DEFAULT_RATE_LIMIT,
)

logger = logging.getLogger(__name__)

# Bearer scheme para extração do JWT
_bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """Representa o usuário autenticado extraído do JWT."""

    def __init__(self, user_id: str, email: str, is_premium: bool = False):
        self.user_id = user_id
        self.email = email
        self.is_premium = is_premium

    def __repr__(self):
        return f"<CurrentUser user_id={self.user_id} is_premium={self.is_premium}>"


def _decode_jwt(token: str) -> dict:
    """
    Decodifica e valida o JWT usando a chave secreta da aplicação.
    Lança HTTPException 401 em caso de token inválido ou expirado.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
        return payload
    except JWTError as e:
        logger.warning(f"[Auth] JWT inválido: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def _fetch_is_premium_from_db(user_id: str, db: Session) -> bool:
    """
    Fallback: consulta o RDS quando há cache miss no Redis.
    Repopula o cache para evitar novos roundtrips.
    """
    try:
        result = db.execute(
            text("SELECT is_premium FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).fetchone()

        if result is None:
            logger.warning(f"[Auth] Usuário {user_id} não encontrado no banco de dados.")
            return False

        is_premium = bool(result[0])
        # Repopula o cache Redis (TTL padrão de 5 minutos reduz futuros roundtrips)
        await set_is_premium(user_id, is_premium)
        return is_premium

    except Exception as e:
        logger.error(f"[Auth] Erro ao consultar is_premium no RDS para user_id={user_id}: {e}")
        # Fail-closed — em caso de falha no banco, negar acesso premium
        return False


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Dependency para QUALQUER rota autenticada.
    Extrai o usuário do JWT sem verificar is_premium.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_jwt(credentials.credentials)
    user_id: str = payload.get("sub")
    email: str = payload.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado — campo 'sub' ausente.",
        )

    return CurrentUser(user_id=user_id, email=email)


async def require_premium(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Dependency para rotas PREMIUM.
    1. Autentica o JWT
    2. Verifica is_premium no Redis (com fallback ao RDS)
    3. Retorna 403 se não for premium
    4. Verifica rate limit por usuário (Sliding Window)
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_jwt(credentials.credentials)
    user_id: str = payload.get("sub")
    email: str = payload.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado.",
        )

    # ── 1. Verificar is_premium no Redis ────────────────────────────────────
    is_premium = await get_is_premium(user_id)

    if is_premium is None:
        logger.debug(f"[Auth] Cache miss — consultando RDS para user_id={user_id}")
        is_premium = await _fetch_is_premium_from_db(user_id, db)

    if not is_premium:
        logger.info(f"[Auth] Acesso a rota premium negado para user_id={user_id} (is_premium=False)")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta funcionalidade requer uma assinatura Premium.",
        )

    # ── 2. Rate Limiting por usuário (50 req/min padrão) ────────────────────
    rl_key = f"rl:user:{user_id}"
    allowed = await check_rate_limit(rl_key, limit=DEFAULT_RATE_LIMIT)

    if not allowed:
        logger.warning(f"[RateLimit] user_id={user_id} excedeu o limite de requisições.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de requisições atingido. Tente novamente em instantes.",
            headers={"Retry-After": "60"},
        )

    return CurrentUser(user_id=user_id, email=email, is_premium=True)


async def require_premium_ai(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Dependency específica para rotas de IA (/api/chat).
    Rate limit mais restritivo: 10 req/min (economia de tokens de IA).
    """
    user = await require_premium(request, credentials, db)

    # Rate limit específico de IA com chave separada
    ai_rl_key = f"rl:ai:{user.user_id}"
    allowed = await check_rate_limit(ai_rl_key, limit=AI_RATE_LIMIT)

    if not allowed:
        logger.warning(f"[RateLimit-AI] user_id={user.user_id} excedeu o limite de IA.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de uso da IA atingido. Aguarde 1 minuto.",
            headers={"Retry-After": "60"},
        )

    return user
