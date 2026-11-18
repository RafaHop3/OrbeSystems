"""
Omnichannel Custo Zero Adapters & AI-First / Human-Last Escalation Engine (INHO Turismo).

Channels supported at R$ 0/msg:
1. WHATSAPP (existing Baileys container http://orbe_whatsapp:3001/send)
2. INSTAGRAM (Meta Official Instagram Messaging API - graph.facebook.com)
3. TELEGRAM (Official Telegram Bot API - api.telegram.org)

Strictly forbids unofficial scrapers (e.g., instagrapi).
"""
from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional

import httpx


HUMAN_LAST_TRIGGERS = (
    "EMISSION_FINAL",
    "FINANCIAL_EXCEPTION",
    "FLIGHT_CRISIS",
    "LOW_CONFIDENCE_OR_ANGER",
    "EXPLICIT_HUMAN_REQUEST",
)


def evaluate_human_last_escalation(
    *,
    message: str,
    intent: str = "",
    intent_confidence: float = 1.0,
    sentiment: str = "NEUTRAL",
    is_final_emission: bool = False,
    financial_exception: bool = False,
) -> Dict[str, Any]:
    """
    AI-First / Human-Last evaluator:
    Only escalates to a human agent when one of the 5 strict triggers occurs.
    """
    low = (message or "").lower()
    if is_final_emission or re.search(r"\b(emitir\s+agora|confirmar\s+emiss[aã]o|finalizar\s+bilhete)\b", low):
        return {"escalate": True, "trigger": "EMISSION_FINAL", "reason": "Emissão final exige conferência humana."}
    if financial_exception or re.search(r"\b(estorno|chargeback|reembolso\s+urgente|cobran[cç]a\s+duplicada)\b", low):
        return {"escalate": True, "trigger": "FINANCIAL_EXCEPTION", "reason": "Exceção financeira encaminhada ao financeiro."}
    if re.search(r"\b(voo\s+cancelado|overbooking|perdi\s+o\s+voo|conex[aã]o\s+perdida|aeroporto\s+fechado|emerg[eê]ncia\s+embarque)\b", low):
        return {"escalate": True, "trigger": "FLIGHT_CRISIS", "reason": "Crise de voo/embarque escalada com prioridade."}
    if intent == "ATENDIMENTO_HUMANO" or re.search(r"\b(atendente|humano|consultor|agente\s+de\s+viagem)\b", low):
        return {"escalate": True, "trigger": "EXPLICIT_HUMAN_REQUEST", "reason": "Cliente solicitou consultor humano."}
    if sentiment == "NEGATIVE" or intent_confidence < 0.65:
        return {"escalate": True, "trigger": "LOW_CONFIDENCE_OR_ANGER", "reason": "Baixa confiança ou insatisfação detectada."}
    return {"escalate": False, "trigger": None, "reason": "AI-First atende autonomamente."}


async def send_omnichannel_message(
    *,
    channel: str,
    recipient: str,
    text: str,
    access_token: Optional[str] = None,
    ig_page_id: Optional[str] = None,
    telegram_bot_token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Unified sender for WhatsApp (Baileys), Instagram (Meta Official), and Telegram (Bot API).
    Runs in safe sandbox mode during SQLite tests or when tokens are absent.
    """
    ch = (channel or "WHATSAPP").upper()
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")

    if ch == "WHATSAPP":
        if is_sqlite:
            return {"channel": "WHATSAPP", "delivered": True, "mode": "SANDBOX_TEST", "recipient": recipient}
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    "http://orbe_whatsapp:3001/send",
                    json={"phone": recipient, "message": text},
                )
                return {"channel": "WHATSAPP", "delivered": resp.status_code == 200, "status_code": resp.status_code}
        except Exception as exc:
            return {"channel": "WHATSAPP", "delivered": False, "error": str(exc)}

    if ch == "INSTAGRAM":
        if is_sqlite or not access_token or not ig_page_id:
            return {"channel": "INSTAGRAM", "delivered": True, "mode": "SANDBOX_NO_TOKEN", "recipient": recipient}
        url = f"https://graph.facebook.com/v20.0/{ig_page_id}/messages"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(
                    url,
                    params={"access_token": access_token},
                    json={"recipient": {"id": recipient}, "message": {"text": text}},
                )
                return {"channel": "INSTAGRAM", "delivered": resp.status_code in (200, 201), "status_code": resp.status_code}
        except Exception as exc:
            return {"channel": "INSTAGRAM", "delivered": False, "error": str(exc)}

    if ch == "TELEGRAM":
        bot_tok = (telegram_bot_token or "").strip()
        if is_sqlite or not bot_tok:
            return {"channel": "TELEGRAM", "delivered": True, "mode": "SANDBOX_NO_TOKEN", "recipient": recipient}
        url = f"https://api.telegram.org/bot{bot_tok}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.post(url, json={"chat_id": recipient, "text": text})
                return {"channel": "TELEGRAM", "delivered": resp.status_code == 200, "status_code": resp.status_code}
        except Exception as exc:
            return {"channel": "TELEGRAM", "delivered": False, "error": str(exc)}

    return {"channel": ch, "delivered": False, "error": f"Unsupported channel: {ch}"}


def parse_instagram_webhook_events(payload: Dict[str, Any]) -> List[Dict[str, str]]:
    """Extract normalized inbound messages from Meta Instagram Messaging API webhook."""
    events: List[Dict[str, str]] = []
    for entry in payload.get("entry") or []:
        for msg_ev in entry.get("messaging") or []:
            sender_id = str((msg_ev.get("sender") or {}).get("id") or "")
            text = str((msg_ev.get("message") or {}).get("text") or "").strip()
            if sender_id and text:
                events.append({"channel": "INSTAGRAM", "sender_id": sender_id, "text": text})
    return events


def parse_telegram_webhook_event(payload: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Extract normalized inbound message from official Telegram Bot API webhook."""
    msg = payload.get("message") or payload.get("edited_message")
    if not isinstance(msg, dict):
        return None
    chat_id = str((msg.get("chat") or {}).get("id") or "")
    text = str(msg.get("text") or "").strip()
    sender_name = str((msg.get("from") or {}).get("first_name") or "Viajante")
    if not chat_id or not text:
        return None
    return {"channel": "TELEGRAM", "sender_id": chat_id, "sender_name": sender_name, "text": text}
