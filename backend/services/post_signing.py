"""Assinatura Ed25519 de postagens da Mesh (anti-spoofing, Manual 11 / Fase 3).

content_hash = SHA-256 do payload canonico (JSON ordenado, UTF-8).
A chave privada fica no cliente; o servidor so guarda a chave publica e verifica.
"""
from __future__ import annotations

import base64
import hashlib
import json

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)


def canonical_bytes(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def content_hash(payload: dict) -> str:
    return hashlib.sha256(canonical_bytes(payload)).hexdigest()


def sign_post(private_key: Ed25519PrivateKey, payload: dict) -> str:
    return base64.b64encode(private_key.sign(content_hash(payload).encode())).decode()


def verify_post(public_key_b64: str, payload: dict, signature_b64: str, claimed_hash: str | None = None) -> bool:
    """False se hash divergir, assinatura invalida ou chave malformada."""
    try:
        digest = content_hash(payload)
        if claimed_hash is not None and claimed_hash != digest:
            return False
        pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64))
        pub.verify(base64.b64decode(signature_b64), digest.encode())
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False
