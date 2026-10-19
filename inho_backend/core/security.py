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


# ── AES-256 Encryption at Rest (MultiFernet Key Rotation) ────────
import os
import base64
from cryptography.fernet import Fernet, MultiFernet

def _derive_fernet_key(raw: str) -> bytes:
    raw = raw.strip()
    # If already a valid 44-char urlsafe base64 Fernet key, use directly
    if len(raw) == 44:
        try:
            base64.urlsafe_b64decode(raw.encode("utf-8"))
            return raw.encode("utf-8")
        except Exception:
            pass
    key_bytes = raw.ljust(32, "0")[:32].encode("utf-8")
    return base64.urlsafe_b64encode(key_bytes)

def _get_fernet() -> MultiFernet:
    """
    Suporta rotação de chaves via variável de ambiente FERNET_KEYS (separadas por vírgula,
    chave mais recente primeiro) mantendo compatibilidade automática com SECRET_KEY.
    """
    env_keys = [k.strip() for k in os.environ.get("FERNET_KEYS", "").split(",") if k.strip()]
    fernet_instances = [Fernet(_derive_fernet_key(k)) for k in env_keys]
    fernet_instances.append(Fernet(_derive_fernet_key(settings.SECRET_KEY)))
    return MultiFernet(fernet_instances)

def encrypt_secret(plain: str) -> str:
    """Criptografa segredos (TOTP, chaves bancárias) usando a chave primária ativa do MultiFernet."""
    if not plain:
        return ""
    return _get_fernet().encrypt(plain.encode("utf-8")).decode("utf-8")

def decrypt_secret(cipher: str) -> str:
    """Descriptografa segredos testando todas as chaves registradas no MultiFernet."""
    if not cipher:
        return ""
    try:
        return _get_fernet().decrypt(cipher.encode("utf-8")).decode("utf-8")
    except Exception:
        return cipher

def rotate_secret(cipher: str) -> str:
    """Re-criptografa um token existente com a chave primária mais recente sem expor o texto puro."""
    if not cipher:
        return ""
    try:
        return _get_fernet().rotate(cipher.encode("utf-8")).decode("utf-8")
    except Exception:
        return encrypt_secret(decrypt_secret(cipher))


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
