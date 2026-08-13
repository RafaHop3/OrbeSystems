"""
INHO – NF-e Provider (Mock v1)

Interface abstrata para emissão de NF-e.
Na v1, todos os retornos são simulados localmente.
Na v2, substituir `issue_nfe_mock` por integração real (ex.: Focus NFe, Enotas, NFe.io).
"""
import uuid
import hashlib
from datetime import datetime, timezone


def issue_nfe_mock(order) -> dict:
    """
    Simula a emissão de uma NF-e para um SalesOrder.

    Retorna um dicionário com:
    - invoice_number: número sequencial fictício
    - nfe_key: chave de acesso de 44 dígitos (simulada)
    - status: "AUTHORIZED" (SEFAZ mock)
    - issued_at: timestamp de emissão
    """
    # Gera chave simulada de 44 dígitos (SHA-256 truncado)
    seed = f"{order.id}{order.amount}{datetime.now(timezone.utc).isoformat()}"
    digest = hashlib.sha256(seed.encode()).hexdigest()
    nfe_key = digest[:44].upper()

    # Número de invoice sequencial fictício baseado em parte do UUID
    invoice_number = f"NF-{str(order.id)[:8].upper()}"

    return {
        "invoice_number": invoice_number,
        "nfe_key": nfe_key,
        "status": "AUTHORIZED",
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "mock": True,  # flag para indicar que é simulação
    }
