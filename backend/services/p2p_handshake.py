"""Handshake presencial por QR dinamico assinado + Karma Literario (Manual 11, Fase 4).

O QR carrega um token Ed25519 de curta duracao (TTL) vinculado a loan_id + acao + nonce.
Servidor valida assinatura, expiracao, acao e consumo unico (nonce) - evita replay.
"""
from __future__ import annotations

import base64
import json
import secrets
import time

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

ACTIONS = {"handover", "return"}
DEFAULT_TTL = 120  # segundos


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_qr_token(key: Ed25519PrivateKey, loan_id: str, action: str, ttl: int = DEFAULT_TTL, now: float | None = None) -> str:
    if action not in ACTIONS:
        raise ValueError("acao invalida")
    body = json.dumps(
        {"loan": loan_id, "act": action, "exp": int((now or time.time()) + ttl), "n": secrets.token_hex(8)},
        sort_keys=True, separators=(",", ":"),
    ).encode()
    return f"{_b64(body)}.{_b64(key.sign(body))}"


def verify_qr_token(pub: Ed25519PublicKey, token: str, expected_loan: str, expected_action: str,
                    used_nonces: set[str], now: float | None = None) -> bool:
    """Valida e CONSOME o nonce (adiciona a used_nonces). Em producao used_nonces = tabela/Redis."""
    try:
        b, s = token.split(".")
        body, sig = _unb64(b), _unb64(s)
        pub.verify(sig, body)
        p = json.loads(body)
    except (InvalidSignature, ValueError, TypeError):
        return False
    if p.get("loan") != expected_loan or p.get("act") != expected_action:
        return False
    if (now or time.time()) > p.get("exp", 0) or p.get("n") in used_nonces:
        return False
    used_nonces.add(p["n"])
    return True


def guardian_score(on_time: int, total_returned: int) -> float | None:
    """Score de Guardiao (% de devolucoes no prazo). None sem historico. Meta do roteiro: > 92."""
    return None if total_returned <= 0 else round(100 * on_time / total_returned, 2)