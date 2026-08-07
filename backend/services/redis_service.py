"""
redis_service.py — Cliente Redis assíncrono para:
  - Cache da flag is_premium (TTL 300s)
  - Rate Limiting via Sliding Window com script Lua
  - Gestão de sessão de usuário
"""
import time
import logging
from typing import Optional

import redis.asyncio as aioredis

from config import settings

logger = logging.getLogger(__name__)

# ── Inicialização do cliente Redis ───────────────────────────────────────────
_redis_client: Optional[aioredis.Redis] = None


def get_redis_client() -> aioredis.Redis:
    """Retorna o cliente Redis singleton (lazy init)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            f"rediss://{settings.REDIS_HOST}:{settings.REDIS_PORT}",  # rediss:// = TLS
            password=settings.REDIS_AUTH_TOKEN,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            retry_on_timeout=True,
            health_check_interval=30,
        )
    return _redis_client


async def close_redis():
    """Fechar conexão no shutdown do app."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


# ── Cache de Flag de Premium ─────────────────────────────────────────────────

IS_PREMIUM_PREFIX = "user:premium:"
IS_PREMIUM_TTL = 300  # 5 minutos


async def get_is_premium(user_id: str) -> Optional[bool]:
    """
    Verifica a flag is_premium no Redis.
    Retorna None em caso de cache miss ou erro.
    """
    try:
        redis = get_redis_client()
        value = await redis.get(f"{IS_PREMIUM_PREFIX}{user_id}")
        if value is None:
            return None
        return value == "1"
    except Exception as e:
        logger.warning(f"[Redis] get_is_premium falhou para user_id={user_id}: {e}")
        return None


async def set_is_premium(user_id: str, is_premium: bool, ttl: int = IS_PREMIUM_TTL) -> None:
    """
    Persiste a flag is_premium com TTL.
    Chamado após webhook do Stripe ou cache miss do RDS.
    """
    try:
        redis = get_redis_client()
        await redis.set(
            f"{IS_PREMIUM_PREFIX}{user_id}",
            "1" if is_premium else "0",
            ex=ttl
        )
        logger.info(f"[Redis] is_premium={is_premium} cached para user_id={user_id} (TTL={ttl}s)")
    except Exception as e:
        logger.warning(f"[Redis] set_is_premium falhou para user_id={user_id}: {e}")


async def invalidate_premium_cache(user_id: str) -> None:
    """Invalida o cache ao receber evento Stripe de cancelamento."""
    try:
        redis = get_redis_client()
        await redis.delete(f"{IS_PREMIUM_PREFIX}{user_id}")
        logger.info(f"[Redis] Cache is_premium invalidado para user_id={user_id}")
    except Exception as e:
        logger.warning(f"[Redis] invalidate_premium_cache falhou: {e}")


# ── Rate Limiting: Sliding Window via script Lua ─────────────────────────────
#
# Algoritmo: Sorted Set onde cada membro é o timestamp do request.
# Remove entradas fora da janela e conta membros restantes.
# Se count >= limit → rejeita. Caso contrário → adiciona e retorna allowed.
#
# Vantagem sobre Fixed Window: sem burst na virada do intervalo (minuto 0:59 → 1:00)
_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove entradas fora da janela deslizante
redis.call('ZREMRANGEBYSCORE', key, 0, now - window_ms)

-- Conta membros ativos na janela
local count = redis.call('ZCARD', key)

if count >= limit then
    return 0  -- Bloqueado
end

-- Adiciona o request atual (membro = timestamp único)
redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))

-- Expira a chave após a janela (limpeza automática)
redis.call('PEXPIRE', key, window_ms)

return 1  -- Permitido
"""

# Limite padrão: 50 requests por minuto por usuário/IP
DEFAULT_RATE_LIMIT = 50
DEFAULT_WINDOW_MS = 60_000  # 1 minuto em milliseconds

# Limite para endpoints de IA: 10 requests por minuto
AI_RATE_LIMIT = 10


async def check_rate_limit(
    identifier: str,
    limit: int = DEFAULT_RATE_LIMIT,
    window_ms: int = DEFAULT_WINDOW_MS,
) -> bool:
    """
    Verifica rate limit via Sliding Window Lua.

    Args:
        identifier: Chave única — ex.: f"rl:user:{user_id}" ou f"rl:ip:{ip_address}"
        limit: Número máximo de requests na janela
        window_ms: Tamanho da janela em milliseconds

    Returns:
        True = request permitido | False = rate limit atingido (HTTP 429)
    """
    try:
        redis = get_redis_client()
        now_ms = int(time.time() * 1000)

        result = await redis.eval(
            _SLIDING_WINDOW_LUA,
            1,           # número de KEYS
            identifier,  # KEYS[1]
            now_ms,      # ARGV[1] — timestamp atual em ms
            window_ms,   # ARGV[2] — tamanho da janela
            limit,       # ARGV[3] — limite de requests
        )
        return bool(result)
    except Exception as e:
        # Em caso de falha no Redis (ex.: timeout), liberar o request para não degradar o serviço
        logger.warning(f"[Redis] check_rate_limit falhou para key={identifier}: {e}. Liberando request.")
        return True


async def get_rate_limit_remaining(identifier: str, window_ms: int = DEFAULT_WINDOW_MS) -> int:
    """
    Retorna quantos requests restam na janela atual (para header X-RateLimit-Remaining).
    """
    try:
        redis = get_redis_client()
        now_ms = int(time.time() * 1000)
        await redis.zremrangebyscore(identifier, 0, now_ms - window_ms)
        count = await redis.zcard(identifier)
        return max(0, DEFAULT_RATE_LIMIT - count)
    except Exception:
        return -1  # Indeterminado
