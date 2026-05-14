"""
services/audit_service.py — Audit Log Service
════════════════════════════════════════════════
Serviço para registrar logs de auditoria de ações administrativas.
"""

from sqlalchemy.orm import Session
from models.audit_log import AuditLog
from utils.logger import admin_logger


def log_audit(
    db: Session,
    admin_email: str,
    action: str,
    target_type: str,
    target_id: str,
    details: dict = None,
    ip_address: str = None
):
    """
    Registra uma ação administrativa no log de auditoria.
    """
    try:
        audit_log = AuditLog(
            admin_email=admin_email,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address
        )
        db.add(audit_log)
        db.commit()
        admin_logger.info(f"Audit log created - admin={admin_email}, action={action}, target={target_type}:{target_id}")
    except Exception as e:
        admin_logger.error(f"Failed to create audit log: {e}")
        db.rollback()
