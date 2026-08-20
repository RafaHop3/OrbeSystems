"""
INHO – SIEM Senior Enhancements Pytest Suite
Testes para Alertas Out-of-Band via Webhook, Rotação de Logs e Stream SSE.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from core.security_alerts import dispatch_security_webhook_alert
from core.audit_retention import rotate_old_audit_logs


def test_out_of_band_webhook_simulation():
    """Valida a formatacao e simulacao do despacho de Webhook para alertas CRITICAL."""
    res = dispatch_security_webhook_alert(
        threat_level="CRITICAL",
        action="TEST_MFA_BRUTE_FORCE",
        details="Tentativa de força bruta detectada no token TOTP",
        user_email="attacker@external.com",
        ip_address="198.51.100.42"
    )

    assert res["sent"] is True
    assert res["simulated"] is True
    assert "payload" in res
    assert "CRITICAL" in res["payload"]["content"]
    assert "198.51.100.42" in res["payload"]["content"]


@pytest.mark.asyncio
async def test_audit_retention_rotation_mocked():
    """Valida a rotina de expurgo e rotacao de logs de auditoria usando mock de sessao async."""
    mock_db = AsyncMock()
    mock_result_before = MagicMock()
    mock_result_before.scalar.return_value = 150

    mock_result_select = MagicMock()
    mock_result_select.scalars.return_value.all.return_value = []

    mock_result_delete = MagicMock()
    mock_result_delete.rowcount = 42

    mock_result_after = MagicMock()
    mock_result_after.scalar.return_value = 108

    mock_db.execute.side_effect = [
        mock_result_before,
        mock_result_select,
        mock_result_delete,
        mock_result_after
    ]

    res = await rotate_old_audit_logs(mock_db, retention_days=90)

    assert res["status"] == "success"
    assert res["retention_days"] == 90
    assert res["logs_expurgated"] == 42
    assert res["total_remaining_logs"] == 108


def test_cold_storage_export_file_creation():
    """Valida a escrita e serializacao de logs no Cold Storage em formato JSON."""
    import os
    import json
    from core.audit_cold_storage import export_logs_to_cold_storage

    sample_logs = [
        {
            "id": "log_001",
            "timestamp": "2026-05-01T12:00:00Z",
            "user_email": "user@orbesystems.com.br",
            "action": "USER_LOGIN_SUCCESS",
            "entity": "Auth",
            "ip_address": "189.10.20.30",
            "details": "Login de teste arquivado"
        }
    ]

    archive_path = export_logs_to_cold_storage(sample_logs)

    assert os.path.exists(archive_path)
    with open(archive_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["total_records"] == 1
    assert data["records"][0]["id"] == "log_001"

