"""
INHO – Audit Router
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, require_admin
from db.session import get_db
from models.models import AuditLog, User
from schemas.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/me", response_model=List[AuditLogOut])
async def list_my_audit_logs(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    entity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista o log de auditoria do próprio usuário (somente leitura)."""
    query = select(AuditLog).where(AuditLog.user_id == current_user.id)
    if entity:
        query = query.where(AuditLog.entity == entity)
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    return logs


@router.get("/all", response_model=List[AuditLogOut])
async def list_all_audit_logs(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    entity: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os logs de auditoria da instituição."""
    query = select(AuditLog)
    if entity:
        query = query.where(AuditLog.entity == entity)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
        
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return logs


@router.get("/siem")
async def get_siem_security_overview(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    SIEM (Security Information and Event Management) Security Operations Endpoint.
    Retorna métricas em tempo real, logs de auditoria imutáveis com severidade e status de bloqueios por rate limit.
    """
    from core.mfa_limiter import mfa_limiter

    # 1. Fetch recent audit logs
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100)
    result = await db.execute(query)
    logs = result.scalars().all()

    total_events = len(logs)
    failed_logins = 0
    mfa_failures = 0
    critical_alerts = 0

    enriched_logs = []
    for log in logs:
        action_lower = (log.action or "").lower()
        
        # Determine Severity Level
        if "fail" in action_lower or "lockout" in action_lower or "unauthorized" in action_lower:
            severity = "CRITICAL"
            critical_alerts += 1
            if "login" in action_lower:
                failed_logins += 1
            if "mfa" in action_lower or "2fa" in action_lower:
                mfa_failures += 1
        elif "update" in action_lower or "delete" in action_lower or "dispatch" in action_lower:
            severity = "WARNING"
        else:
            severity = "INFO"

        enriched_logs.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_email": log.user_email or "Sistema/Anônimo",
            "action": log.action,
            "entity": log.entity,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "ip_address": log.ip_address or "127.0.0.1",
            "user_agent": log.user_agent or "Interno",
            "details": log.details,
            "severity": severity
        })

    # Active 2FA Rate Lockouts from in-memory limiter
    mfa_lockouts_active = mfa_limiter.get_locked_accounts_count() if hasattr(mfa_limiter, "get_locked_accounts_count") else 0

    # Overall Threat Level
    if critical_alerts > 10 or mfa_lockouts_active > 3:
        threat_level = "HIGH"
    elif critical_alerts > 3:
        threat_level = "MEDIUM"
    else:
        threat_level = "LOW"

    # Out-of-Band Webhook Alert Dispatch on HIGH/CRITICAL threat
    if threat_level in ["HIGH", "CRITICAL"]:
        from core.security_alerts import dispatch_security_webhook_alert
        dispatch_security_webhook_alert(
            threat_level=threat_level,
            action="SIEM_THREAT_SPIKE",
            details=f"Nível de ameaça elevado para {threat_level}. {critical_alerts} alertas críticos ativos.",
            user_email=current_user.email
        )

    return {
        "status": "active",
        "threat_level": threat_level,
        "metrics": {
            "total_audit_events": total_events,
            "failed_logins_count": failed_logins,
            "mfa_failures_count": mfa_failures,
            "active_mfa_lockouts": mfa_lockouts_active,
            "critical_alerts_count": critical_alerts,
        },
        "logs": enriched_logs
    }


@router.get("/siem/stream")
async def stream_siem_events(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pilar 1 - Server-Sent Events (SSE) Push Stream:
    Envia eventos de auditoria em tempo real via text/event-stream, eliminando polling HTTP no frontend.
    """
    import asyncio
    from fastapi.responses import StreamingResponse

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            overview = await get_siem_security_overview(request, db, current_user)
            yield f"data: {json.dumps(overview)}\n\n"
            await asyncio.sleep(5.0)  # Stream update every 5 seconds

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/siem/prune")
async def prune_audit_logs(
    retention_days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pilar 3 - Rotação e Retenção de Dados de Auditoria:
    Expurga logs informativos (INFO) mais antigos que retention_days (padrão: 90 dias).
    """
    from core.audit_retention import rotate_old_audit_logs
    return await rotate_old_audit_logs(db, retention_days=retention_days)


