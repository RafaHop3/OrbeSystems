"""
INHO – Audit Data Retention Policy & Log Rotation Module
"""
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.models import AuditLog

logger = logging.getLogger("inho.audit_retention")


async def rotate_old_audit_logs(db: AsyncSession, retention_days: int = 90) -> dict:
    """
    Expurga logs informativos (INFO) com mais de 'retention_days' (padrão: 90 dias).
    Logs de severidade CRITICAL ou WARNING são mantidos para conformidade forense.
    """
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=retention_days)).replace(tzinfo=None)

    # 1. Total de logs antes da rotação
    try:
        count_before_res = await db.execute(select(func.count(AuditLog.id)))
        total_before = count_before_res.scalar() or 0
    except Exception:
        total_before = 0

    # 2. Excluir logs INFO antigos (açao sem termos de falha/critical/lockout)
    stmt = delete(AuditLog).where(
        AuditLog.timestamp < cutoff_date,
        ~AuditLog.action.ilike("%fail%"),
        ~AuditLog.action.ilike("%lockout%"),
        ~AuditLog.action.ilike("%unauthorized%"),
        ~AuditLog.action.ilike("%critical%")
    )

    result = await db.execute(stmt)
    await db.commit()

    deleted_count = result.rowcount

    # 3. Total de logs após rotação
    count_after_res = await db.execute(select(func.count(AuditLog.id)))
    total_after = count_after_res.scalar() or 0

    logger.info(
        f"Rotação de Logs de Auditoria concluída: {deleted_count} logs INFO antigos (>{retention_days} dias) expurgados. "
        f"Total restante: {total_after}"
    )

    return {
        "status": "success",
        "retention_days": retention_days,
        "cutoff_date": cutoff_date.isoformat(),
        "logs_expurgated": deleted_count,
        "total_remaining_logs": total_after
    }
