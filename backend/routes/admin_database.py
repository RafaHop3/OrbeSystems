"""
routes/admin_database.py — Admin Database Management
════════════════════════════════════════════════════════
Endpoints para inspecionar e administrar o banco de dados do sistema.

Rotas (todas protegidas por admin auth):
  GET  /admin/database/health        → Status geral do banco
  GET  /admin/database/tables        → Lista todas as tabelas com contagem de registros
  GET  /admin/database/tables/{name} → Inspeciona colunas de uma tabela específica
  POST /admin/database/migrate       → Cria/atualiza tabelas via SQLAlchemy (create_all)
  GET  /admin/database/audit-logs    → Lista logs de auditoria recentes
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text, func
from typing import Optional

from security.auth import get_current_admin_user
from database import get_db, engine, Base
from models.audit_log import AuditLog

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/database/health")
async def database_health(
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin_user),
):
    """Verifica a saúde do banco de dados — conexão, tabelas, engine."""
    try:
        db.execute(text("SELECT 1"))
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return {
            "status": "healthy",
            "engine": str(engine.url).split("@")[-1],  # nunca expõe credenciais
            "dialect": engine.dialect.name,
            "table_count": len(tables),
            "tables": tables,
        }
    except Exception as e:
        logger.error(f"[AdminDatabase] Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database health check failed: {str(e)}")


@router.get("/database/tables")
async def list_tables(
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin_user),
):
    """Lista todas as tabelas com contagem de registros."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        result = []
        for table in tables:
            try:
                count = db.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar()
            except Exception:
                count = -1
            result.append({"table": table, "row_count": count})
        return {"tables": result, "total_tables": len(tables)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/tables/{table_name}")
async def inspect_table(
    table_name: str,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin_user),
):
    """Inspeciona colunas e amostra de dados de uma tabela específica."""
    # Sanitize table name — apenas alfanumérico e underscore
    if not all(c.isalnum() or c == "_" for c in table_name):
        raise HTTPException(status_code=400, detail="Invalid table name.")

    try:
        inspector = inspect(engine)
        if table_name not in inspector.get_table_names():
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")

        columns = [
            {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "primary_key": col.get("primary_key", False),
            }
            for col in inspector.get_columns(table_name)
        ]

        count = db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
        sample = db.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5')).mappings().all()

        return {
            "table": table_name,
            "row_count": count,
            "columns": columns,
            "sample": [dict(row) for row in sample],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/database/migrate")
async def run_migration(
    admin: str = Depends(get_current_admin_user),
):
    """
    Executa create_all para criar/atualizar tabelas sem deletar dados existentes.
    Equivalente a uma migração não-destrutiva.
    """
    try:
        Base.metadata.create_all(bind=engine)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"[AdminDatabase] Migration executed by admin: {admin}")
        return {
            "status": "success",
            "message": "Migração executada com sucesso (create_all).",
            "tables_after": tables,
        }
    except Exception as e:
        logger.error(f"[AdminDatabase] Migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


@router.get("/database/audit-logs")
async def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin_user),
):
    """Lista os logs de auditoria com filtro opcional por ação."""
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.filter(AuditLog.action == action)
    total = query.count()
    logs = query.offset(skip).limit(limit).all()
    return {
        "logs": [log.to_dict() for log in logs],
        "total": total,
        "skip": skip,
        "limit": limit,
    }
