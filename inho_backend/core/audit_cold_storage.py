"""
INHO – Audit Cold Storage Archiving Engine
Exporta logs informativos antigos para armazenamento persistente de longo prazo em JSON/Parquet (Conformidade ISO/LGPD).
"""
import os
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

logger = logging.getLogger("inho.audit_cold_storage")

COLD_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "cold_storage")
os.makedirs(COLD_STORAGE_DIR, exist_ok=True)


def export_logs_to_cold_storage(logs: List[Dict[str, Any]]) -> str:
    """
    Serializa uma lista de registros de auditoria em arquivo JSON comprimido no Cold Storage.
    Retorna o caminho absoluto do arquivo gerado.
    """
    if not logs:
        logger.info("Nenhum log para exportar para o Cold Storage.")
        return ""

    today_str = datetime.now(timezone.utc).strftime("%Y_%m_%d_%H%M%S")
    archive_filename = f"audit_archive_{today_str}.json"
    archive_path = os.path.join(COLD_STORAGE_DIR, archive_filename)

    export_payload = {
        "archived_at": datetime.now(timezone.utc).isoformat(),
        "total_records": len(logs),
        "compliance_policy": "ISO_27001_LGPD_RETENTION_90_DAYS",
        "records": logs
    }

    with open(archive_path, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2, ensure_ascii=False)

    logger.info(f"Cold Storage: {len(logs)} registros arquivados com sucesso em {archive_path}")
    return archive_path
