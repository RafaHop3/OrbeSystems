"""
logging_middleware.py — Middleware de auditoria estruturado para CloudWatch

Intercepta cada request/response e emite JSON estruturado contendo:
  - Timestamp ISO8601
  - IP real do cliente (X-Forwarded-For via CloudFront)
  - User ID do JWT (quando presente)
  - Rota e método HTTP
  - Status code
  - Duração da request em ms

Os logs JSON são capturados automaticamente pelo CloudWatch Logs agent do Pod.
"""
import json
import time
import logging
import traceback
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp
from jose import jwt, JWTError

from config import settings

# Logger dedicado ao audit trail
audit_logger = logging.getLogger("orbe.audit")

# Configurar para emitir JSON puro (CloudWatch processa automaticamente)
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(message)s"))  # Apenas a mensagem JSON
audit_logger.addHandler(_handler)
audit_logger.setLevel(logging.INFO)
audit_logger.propagate = False  # Evitar duplicação nos logs padrão


def _extract_real_ip(request: Request) -> str:
    """
    Extrai o IP real do cliente.
    CloudFront → ALB repassa via X-Forwarded-For.
    O primeiro IP do header é sempre o IP do cliente original.
    """
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    # Fallback para conexão direta (dev local)
    return request.client.host if request.client else "unknown"


def _extract_user_id_from_token(request: Request) -> Optional[str]:
    """
    Extrai o user_id do JWT sem validar completamente (apenas decodificação).
    Usado apenas para logging — não é uma verificação de segurança.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        # decode_options={"verify_exp": False} para não falhar em tokens expirados
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            options={"verify_exp": False},
        )
        return payload.get("sub")
    except (JWTError, Exception):
        return None


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware de auditoria: intercept → processa → loga.
    Captura IP, User ID, rota, método, status e duração.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # ── Dados de entrada ────────────────────────────────────────────────
        start_time = time.perf_counter()
        ip_address = _extract_real_ip(request)
        user_id = _extract_user_id_from_token(request)
        method = request.method
        path = request.url.path
        query = str(request.url.query) if request.url.query else None

        # ── Processar a request ──────────────────────────────────────────────
        status_code = 500
        error_detail = None

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            error_detail = str(e)
            # Re-raise para o global exception handler da FastAPI processar
            raise
        finally:
            # ── Calcular duração ─────────────────────────────────────────────
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # ── Montar log estruturado JSON ──────────────────────────────────
            log_entry = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "service": "orbe-systems-api",
                "event_type": "http_request",
                "ip_address": ip_address,
                "user_id": user_id or "anonymous",
                "method": method,
                "path": path,
                "query": query,
                "status_code": status_code,
                "duration_ms": duration_ms,
                # Categorização de segurança
                "is_error": status_code >= 400,
                "is_server_error": status_code >= 500,
            }

            if error_detail:
                log_entry["error"] = error_detail

            # ── Logs de segurança específicos ────────────────────────────────
            if status_code == 403:
                log_entry["security_event"] = "access_denied_premium_route"
            elif status_code == 429:
                log_entry["security_event"] = "rate_limit_exceeded"
            elif status_code == 401:
                log_entry["security_event"] = "authentication_failed"

            # ── Omitir rotas de health check dos logs de auditoria ───────────
            if path == "/health":
                return response  # type: ignore

            # ── Emitir JSON estruturado para CloudWatch ───────────────────────
            # Nível WARNING para erros 4xx/5xx, INFO para sucesso
            if status_code >= 400:
                audit_logger.warning(json.dumps(log_entry, ensure_ascii=False))
            else:
                audit_logger.info(json.dumps(log_entry, ensure_ascii=False))

        return response  # type: ignore
