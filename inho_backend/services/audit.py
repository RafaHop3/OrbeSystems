"""
INHO – Audit Log Service
Registra todo CRUD + eventos de seguranca (imutavel).
"""
import json
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import AuditLog, AuditAction

# FIX: lista de proxies confiaveis — X-Forwarded-For so e aceito quando vier deles
_TRUSTED_PROXIES: set[str] = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


async def write_audit(
    db: AsyncSession,
    action: AuditAction,
    entity: str,
    *,
    user_id: Optional[UUID] = None,
    entity_id: Optional[str] = None,
    detail: Optional[dict] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """
    Grava um registro imutavel no AuditLog.
    Nunca deve ser chamado dentro de transacoes que possam ser revertidas
    sem antes fazer flush, para garantir persistencia do log.
    """
    ip  = _extract_ip(request)
    ua  = _extract_ua(request)
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id else None,
        detail=json.dumps(detail, default=str) if detail else None,
        ip_address=ip,
        user_agent=ua,
    )
    db.add(log)
    await db.flush()   # persiste imediatamente (antes do commit externo)
    return log


def _extract_ip(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None

    client_ip = request.client.host if request.client else None

    # FIX: so confia em X-Forwarded-For se o request vem de um proxy confiavel
    # Evita IP spoofing onde atacante envia X-Forwarded-For: 1.2.3.4 diretamente
    if client_ip in _TRUSTED_PROXIES:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # pega o IP mais a esquerda (cliente original)
            return forwarded.split(",")[0].strip()

    return client_ip


def _extract_ua(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None
    ua = request.headers.get("User-Agent", "")
    # Trunca para nao exceder o VARCHAR(512) do modelo
    return ua[:512] if ua else None
