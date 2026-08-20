"""
INHO – MFA Brute Force Rate Limiter
Prevents brute force attacks against 6-digit 2FA TOTP codes.
Rule: 5 failed attempts per IP or Email within 15 minutes -> 15-minute lock out.
"""
import time
import logging
from typing import Dict, Tuple

logger = logging.getLogger("inho.mfa_limiter")

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 15 * 60  # 15 minutes

class MFARateLimiter:
    def __init__(self):
        # Maps key (ip or email) -> (failed_count, lock_until_timestamp)
        self._attempts: Dict[str, Tuple[int, float]] = {}

    def is_locked(self, key: str) -> bool:
        """Verifica se a chave (IP ou e-mail) está bloqueada por excesso de tentativas."""
        if key in self._attempts:
            count, lock_until = self._attempts[key]
            now = time.time()
            if count >= MAX_FAILED_ATTEMPTS and now < lock_until:
                return True
            if now >= lock_until:
                del self._attempts[key]
                return False
        return False

    def record_failure(self, key: str) -> int:
        """Registra uma tentativa com erro. Retorna o número de tentativas restantes."""
        now = time.time()
        count, lock_until = self._attempts.get(key, (0, 0.0))
        new_count = count + 1

        if new_count >= MAX_FAILED_ATTEMPTS:
            new_lock_until = now + LOCKOUT_WINDOW_SECONDS
            self._attempts[key] = (new_count, new_lock_until)
            logger.warning(f"MFA BLOQUEADO para {key}: 5 tentativas falhas. Bloqueio até {LOCKOUT_WINDOW_SECONDS}s")
            return 0
        else:
            self._attempts[key] = (new_count, now + LOCKOUT_WINDOW_SECONDS)
            return MAX_FAILED_ATTEMPTS - new_count

    def reset(self, key: str):
        """Reseta contador após login/validação bem sucedida."""
        if key in self._attempts:
            del self._attempts[key]

mfa_limiter = MFARateLimiter()
