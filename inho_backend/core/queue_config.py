"""
INHO – Ghost Engine Persistent Message Queue & Broker Specification (Celery / Redis)
Garante persistência de tarefas assíncronas contra reinicializações do servidor.
"""
import os
import logging
from typing import Dict, Any

logger = logging.getLogger("inho.queue_config")

# Configurações do Message Broker (Redis / SQS / RabbitMQ)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

if REDIS_PASSWORD:
    CELERY_BROKER_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
else:
    CELERY_BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

CELERY_RESULT_BACKEND = CELERY_BROKER_URL

CELERY_CONFIG: Dict[str, Any] = {
    "broker_url": CELERY_BROKER_URL,
    "result_backend": CELERY_RESULT_BACKEND,
    "task_serializer": "json",
    "result_serializer": "json",
    "accept_content": ["json"],
    "timezone": "America/Sao_Paulo",
    "enable_utc": True,
    "task_concurrency": 3,  # Máximo de 3 workers de Playwright por nó de execução
    "task_acks_late": True,  # Confirma a tarefa apenas APÓS o término bem-sucedido
    "task_reject_on_worker_lost": True, # Re-enfileira automaticamente se o worker cair
}


def get_queue_status() -> Dict[str, Any]:
    """Retorna o status da infraestrutura de filas ativas."""
    return {
        "broker": "Redis / Celery",
        "broker_url": CELERY_BROKER_URL.split("@")[-1],  # Oculta credenciais sensíveis
        "concurrency_limit": CELERY_CONFIG["task_concurrency"],
        "persistence": "Acks Late (Re-queue on Worker Crash)"
    }
