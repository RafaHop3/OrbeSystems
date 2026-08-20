"""
INHO – Security Core
JWT creation/validation + password hashing (bcrypt direto, sem passlib).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from core.config import settings


# ── Password ─────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    """Gera hash bcrypt da senha. bcrypt trunca em 72 bytes nativamente."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── AES-256 Encryption at Rest (TOTP Secret) ─────────────────────
import base64
from cryptography.fernet import Fernet

def _get_fernet() -> Fernet:
    key_bytes = settings.SECRET_KEY.ljust(32, '0')[:32].encode('utf-8')
    return Fernet(base64.urlsafe_b64encode(key_bytes))

def encrypt_secret(plain: str) -> str:
    """Criptografa o secret TOTP antes de salvar no Supabase (AES-256 em repouso)."""
    if not plain:
        return ""
    return _get_fernet().encrypt(plain.encode('utf-8')).decode('utf-8')

def decrypt_secret(cipher: str) -> str:
    """Descriptografa o secret TOTP para validação."""
    if not cipher:
        return ""
    try:
        return _get_fernet().decrypt(cipher.encode('utf-8')).decode('utf-8')
    except Exception:
        # Se for um secret antigo salvo em texto puro antes da criptografia
        return cipher


# ── JWT ──────────────────────────────────────────────────────────
def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
    return _create_token(
        {"sub": subject, "role": role, "type": "access"},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        {"sub": subject, "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


from core.token_blacklist import token_blacklist


def decode_token(token: str) -> Optional[dict]:
    if token_blacklist.is_revoked(token):
        return None
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
