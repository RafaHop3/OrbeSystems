"""
services/crypto_service.py — Camada de Borda & Criptografia (Mesh Core)
═══════════════════════════════════════════════════════════════════════
Implementa validação de integridade SHA-256 e verificação de assinatura
digital Ed25519 na ponta (Anti-Spoofing) antes de persistir dados no banco.
"""

import hashlib
from typing import Optional
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature


def compute_sha256_hex(content: str) -> str:
    """Calcula o hash SHA-256 canônico (UTF-8) de um texto."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def verify_post_integrity(
    content_text: str,
    claimed_hash: str,
    signature_hex: Optional[str] = None,
    public_key_hex: Optional[str] = None,
) -> tuple[bool, str]:
    """
    Valida a integridade criptográfica de um post da Mesh Social:
      1. Confere se o hash SHA-256 corresponde exatamente ao `content_text`.
      2. Se `signature_hex` e `public_key_hex` forem fornecidos, valida a
         assinatura Ed25519 sobre os bytes do hash SHA-256 (ou do texto).
    Retorna (is_valid, reason).
    """
    expected_hash = compute_sha256_hex(content_text)
    if not claimed_hash or claimed_hash.lower() != expected_hash.lower():
        return False, "Integrity check failed: SHA-256 content_hash mismatch (payload adulterado)."

    if signature_hex or public_key_hex:
        if not (signature_hex and public_key_hex):
            return False, "Both signature_hex and public_key_hex are required when signing is used."
        try:
            pub_bytes = bytes.fromhex(public_key_hex)
            sig_bytes = bytes.fromhex(signature_hex)
            if len(pub_bytes) != 32:
                return False, "Invalid Ed25519 public key length (expected 32 bytes / 64 hex chars)."
            if len(sig_bytes) != 64:
                return False, "Invalid Ed25519 signature length (expected 64 bytes / 128 hex chars)."

            pub_key = Ed25519PublicKey.from_public_bytes(pub_bytes)
            # Aceita assinatura tanto sobre o digest hexadecimal quanto sobre o conteúdo UTF-8 bruto
            try:
                pub_key.verify(sig_bytes, expected_hash.encode("utf-8"))
            except InvalidSignature:
                pub_key.verify(sig_bytes, content_text.encode("utf-8"))
        except InvalidSignature:
            return False, "Ed25519 signature verification failed (Anti-Spoofing triggered)."
        except ValueError:
            return False, "Malformed hexadecimal encoding in signature_hex or public_key_hex."

    return True, "ok"
