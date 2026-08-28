"""
INHO – Ghost Engine Playwright Automator Pytest Suite
Verifica o carregamento de configuracao, a degradacao graciosa de CAPTCHA e o Cofre de Evidencias.
"""
import os
import pytest
import asyncio
from services.playwright_automator import (
    load_broker_config,
    run_playwright_form_submission,
    EVIDENCE_DIR
)


def test_load_broker_config_success():
    """Valida se o mapa desacoplado de seletores do Serasa e carregado corretamente."""
    config = load_broker_config("serasa")
    assert config is not None, "Configuracao do Serasa nao pode ser nula"
    assert config["method"] == "FORM"
    assert "selectors" in config
    assert "name_input" in config["selectors"]
    assert "captcha_indicators" in config["selectors"]


@pytest.mark.asyncio
async def test_playwright_evidence_vault_and_submission():
    """Valida a operacao do motor e a geracao de recibo no Cofre de Evidencias."""
    test_request_id = "test_req_001"
    user_data = {
        "full_name": "Rafael Tester LGPD",
        "cpf": "123.456.789-00",
        "email": "test@orbesystems.com.br"
    }

    res = await run_playwright_form_submission(
        request_id=test_request_id,
        broker_key="serasa",
        user_data=user_data,
        headless=True
    )

    assert res["status"] in ["SUBMITTED", "MANUAL_REQUIRED"]
    assert res.get("evidence_url") is not None

    evidence_file = os.path.join(EVIDENCE_DIR, f"evidence_{test_request_id}.png")
    assert os.path.exists(evidence_file), f"Arquivo de evidencia nao gerado no Cofre: {evidence_file}"


@pytest.mark.asyncio
async def test_invalid_broker_fallback():
    """Valida fallback gracioso para brokers nao configurados."""
    res = await run_playwright_form_submission(
        request_id="test_req_invalid",
        broker_key="broker_inexistente",
        user_data={"email": "test@domain.com"}
    )

    assert res["status"] == "MANUAL_REQUIRED"
    assert "encontrada" in res["reasoning"]


@pytest.mark.asyncio
async def test_semaphore_concurrency_limit():
    """Valida se o semaforo asyncio.Semaphore limita a concorrência a no maximo 3 workers."""
    from services.playwright_automator import PLAYWRIGHT_SEMAPHORE, MAX_CONCURRENT_WORKERS

    assert MAX_CONCURRENT_WORKERS == 3
    assert PLAYWRIGHT_SEMAPHORE._value <= MAX_CONCURRENT_WORKERS


def test_celery_redis_queue_config():
    """Valida a especificacao e formato de persistencia do Celery Message Broker."""
    from core.queue_config import get_queue_status, CELERY_CONFIG

    status = get_queue_status()
    assert status["broker"] == "Redis / Celery"
    assert status["concurrency_limit"] == 3
    assert CELERY_CONFIG["task_acks_late"] is True
    assert CELERY_CONFIG["task_reject_on_worker_lost"] is True



