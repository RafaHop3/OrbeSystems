"""
INHO – Token Revocation Blacklist
In-memory thread-safe JWT blacklist manager for immediate session invalidation.
"""
import time
import logging
from typing import Set, Dict

logger = logging.getLogger("inho.blacklist")

class TokenBlacklist:
    def __init__(self):
        # Maps token/jti -> expiration_timestamp
        self._revoked_tokens: Dict[str, float] = {}

    def revoke(self, token: str, expire_seconds: int = 3600 * 24):
        """Adiciona token à lista negra até que ele vença naturalmente."""
        expiry = time.time() + expire_seconds
        self._revoked_tokens[token] = expiry
        logger.info(f"Token revogado com sucesso. Total revogados: {len(self._revoked_tokens)}")
        self._cleanup()

    def is_revoked(self, token: str) -> bool:
        """Verifica se o token está revogado."""
        if token in self._revoked_tokens:
            if time.time() > self._revoked_tokens[token]:
                del self._revoked_tokens[token]
                return False
            return True
        return False

    def _cleanup(self):
        """Remove tokens expirados para economizar memória."""
        now = time.time()
        expired = [t for t, exp in self._revoked_tokens.items() if now > exp]
        for t in expired:
            del self._revoked_tokens[t]

token_blacklist = TokenBlacklist()
