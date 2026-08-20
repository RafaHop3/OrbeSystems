"""
INHO – Security Alerts Module
Out-of-Band Webhook Alert Dispatcher (Telegram / Discord / Slack)
"""
import os
import json
import logging
import urllib.request
from typing import Dict, Any, Optional

logger = logging.getLogger("inho.security_alerts")

WEBHOOK_URL = os.getenv("SECURITY_WEBHOOK_URL", "")


def dispatch_security_webhook_alert(
    threat_level: str,
    action: str,
    details: str,
    user_email: str = "Sistema",
    ip_address: str = "127.0.0.1"
) -> Dict[str, Any]:
    """
    Dispara notificação out-of-band via Webhook HTTP POST (compatível com Discord, Slack e Telegram)
    quando o Threat Level for HIGH ou CRITICAL.
    """
    payload = {
        "content": f"🚨 **ALERT DE CIBERSEGURANÇA (SIEM SOC)** 🚨\n"
                   f"**Nível de Ameaça:** `{threat_level}`\n"
                   f"**Ação:** `{action}`\n"
                   f"**Usuário:** `{user_email}`\n"
                   f"**Endereço IP:** `{ip_address}`\n"
                   f"**Detalhes:** {details}",
        "username": "Orbe SIEM Guard",
        "avatar_url": "https://orbesystems.com.br/logo.png"
    }

    if not WEBHOOK_URL:
        logger.info(f"[SIMULAÇÃO WEBHOOK] {threat_level} | {action} | IP: {ip_address}")
        return {
            "sent": True,
            "simulated": True,
            "payload": payload
        }

    try:
        req = urllib.request.Request(
            WEBHOOK_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "OrbeSIEM/1.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            logger.info(f"Webhook de segurança disparado com sucesso: Status {response.status}")
            return {"sent": True, "simulated": False, "status_code": response.status}
    except Exception as e:
        logger.error(f"Falha ao enviar webhook de segurança: {e}")
        return {"sent": False, "simulated": False, "error": str(e)}
