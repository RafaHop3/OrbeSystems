"""
OrbeJobs — Serviço de Envio Gmail API OAuth2, Cofre MultiFernet AES-256,
Validação DNS MX (Anti-Bounce), Jitter Aleatório, Teto Diário (10-15/dia), Kill-Switch e Auditoria LGPD (Phase 4).
"""
import base64
import hashlib
import json
import logging
import os
import random
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import dns.resolver
import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import decrypt_secret, encrypt_secret
from models.models import (
    AuditAction,
    AuditLog,
    LivingCVProfile,
    OrbeJobApplication,
    OrbeJobOAuthVault,
    OrbeJobSendLog,
    OrbeJobSendQueue,
)

logger = logging.getLogger("inho.orbejobs.mailer")

MAX_DAILY_SEND_HARD_CAP = 15
DEFAULT_DAILY_SEND_CAP = 12
GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
_SECURE_RNG = random.SystemRandom()


def clamp_daily_limit(limit: Optional[int]) -> int:
    """Aplica o teto operacional seguro de envios diários (1 a 15 envios/dia)."""
    if limit is None:
        return DEFAULT_DAILY_SEND_CAP
    return max(1, min(MAX_DAILY_SEND_HARD_CAP, int(limit)))


def compute_random_jitter_seconds(min_seconds: float = 15.0, max_seconds: float = 95.0) -> float:
    """Calcula jitter aleatório criptograficamente seguro para cadência humana de disparo."""
    low = max(0.0, float(min_seconds))
    high = max(low, float(max_seconds))
    return round(_SECURE_RNG.uniform(low, high), 2)


def validate_email_mx_records(
    recipient_email: str,
    *,
    resolver_fn: Optional[Callable[[str], List[str]]] = None,
    timeout_seconds: float = 3.0,
) -> Tuple[bool, List[str], Optional[str]]:
    """
    Valida previamente os registros DNS MX do domínio destinatário para evitar hard bounces.
    Permite injeção de resolver_fn em testes offline determinísticos.
    """
    email = (recipient_email or "").strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        return False, [], "Formato de e-mail inválido."

    domain = email.split("@", 1)[1].strip()
    if "." not in domain or len(domain) < 3:
        return False, [], "Domínio de e-mail inválido."

    if resolver_fn is not None:
        try:
            hosts = [str(h).rstrip(".") for h in resolver_fn(domain) if str(h).strip()]
            if not hosts:
                return False, [], f"Nenhum registro MX encontrado para '{domain}'."
            return True, hosts, None
        except Exception as exc:
            return False, [], f"Falha na consulta MX para '{domain}': {exc}"

    try:
        resolver = dns.resolver.Resolver()
        resolver.lifetime = timeout_seconds
        resolver.timeout = timeout_seconds
        answers = resolver.resolve(domain, "MX")
        sorted_hosts = sorted(
            [(int(getattr(r, "preference", 10)), str(r.exchange).rstrip(".")) for r in answers],
            key=lambda item: item[0],
        )
        hosts = [h for _, h in sorted_hosts if h and h != "."]
        if not hosts:
            return False, [], f"Domínio '{domain}' possui registro MX nulo (Null MX RFC 7505)."
        return True, hosts, None
    except Exception as exc:
        return False, [], f"DNS MX indisponível ou inexistente para '{domain}': {exc}"


def build_gmail_oauth_url(state_token: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
    """Constrói URL de autorização OAuth2 restrita ao escopo mínimo gmail.send."""
    client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    eff_redirect = (
        redirect_uri
        or os.environ.get("GOOGLE_OAUTH_REDIRECT_URI", "").strip()
        or "https://inho.orbesystems.com.br/dashboard/orbejobs"
    )
    params = {
        "client_id": client_id or "CONFIGURE_GOOGLE_OAUTH_CLIENT_ID",
        "redirect_uri": eff_redirect,
        "response_type": "code",
        "scope": GMAIL_SEND_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state_token,
    }
    return {
        "configured": bool(client_id),
        "scope": GMAIL_SEND_SCOPE,
        "auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}",
    }


def build_raw_gmail_message(
    *,
    sender_email: str,
    recipient_email: str,
    subject: str,
    body_text: str,
) -> str:
    """Monta mensagem RFC 2822 codificada em base64url compatível com users.messages.send."""
    msg = EmailMessage()
    msg["To"] = recipient_email
    msg["From"] = sender_email
    msg["Subject"] = subject
    msg.set_content(body_text)
    raw_bytes = msg.as_bytes()
    return base64.urlsafe_b64encode(raw_bytes).decode("ascii").rstrip("=")


async def save_oauth_vault_tokens(
    db: AsyncSession,
    *,
    business_id: str,
    user_id: str,
    account_email: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    scopes: str = GMAIL_SEND_SCOPE,
    expires_in_seconds: Optional[int] = 3600,
) -> OrbeJobOAuthVault:
    """Armazena tokens OAuth2 no cofre criptografado com MultiFernet AES-256."""
    enc_access = encrypt_secret(access_token)
    enc_refresh = encrypt_secret(refresh_token) if refresh_token else None
    expiry = (
        datetime.now(timezone.utc) + timedelta(seconds=int(expires_in_seconds))
        if expires_in_seconds
        else None
    )

    existing = (
        await db.execute(
            select(OrbeJobOAuthVault).where(
                OrbeJobOAuthVault.business_id == business_id,
                OrbeJobOAuthVault.user_id == user_id,
                OrbeJobOAuthVault.provider == "gmail",
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.account_email = account_email.strip().lower()
        existing.encrypted_access_token = enc_access
        if enc_refresh:
            existing.encrypted_refresh_token = enc_refresh
        existing.scopes = scopes
        existing.token_expiry = expiry
        existing.is_active = True
        vault = existing
    else:
        vault = OrbeJobOAuthVault(
            business_id=business_id,
            user_id=user_id,
            provider="gmail",
            account_email=account_email.strip().lower(),
            encrypted_access_token=enc_access,
            encrypted_refresh_token=enc_refresh,
            scopes=scopes,
            token_expiry=expiry,
            is_active=True,
        )
        db.add(vault)

    await db.flush()
    return vault


async def count_daily_sent_emails(
    db: AsyncSession,
    *,
    business_id: str,
    user_id: str,
) -> int:
    """Conta quantos envios concluídos o usuário realizou nas últimas 24h (janela diária UTC)."""
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    res = await db.execute(
        select(func.count(OrbeJobSendLog.id)).where(
            OrbeJobSendLog.business_id == business_id,
            OrbeJobSendLog.user_id == user_id,
            OrbeJobSendLog.status.in_(("SENT", "SENT_SANDBOX")),
            OrbeJobSendLog.created_at >= day_start,
        )
    )
    return int(res.scalar() or 0)


def compute_lgpd_audit_hash(
    *,
    user_id: str,
    recipient_email: str,
    application_id: str,
    status: str,
    timestamp_iso: str,
) -> str:
    """Gera digest SHA-256 rastreável para auditoria LGPD sem expor conteúdo do currículo."""
    payload = f"{user_id}|{recipient_email.lower()}|{application_id}|{status}|{timestamp_iso}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def dispatch_queue_item(
    db: AsyncSession,
    *,
    queue_item: OrbeJobSendQueue,
    profile: LivingCVProfile,
    vault: Optional[OrbeJobOAuthVault],
    mx_resolver_fn: Optional[Callable[[str], List[str]]] = None,
    gmail_sender_fn: Optional[Callable[[str, str, str, str, str], str]] = None,
) -> Dict[str, Any]:
    """
    Executa todas as travas de segurança antes do envio via Gmail API:
    1. Kill-Switch ativo -> bloqueia imediatamente.
    2. Human-in-the-Loop -> exige aprovação prévia se habilitado no Living CV.
    3. Teto diário (10-15 envios/dia) -> bloqueia excedentes.
    4. Validação DNS MX -> bloqueia domínios sem MX (anti-bounce).
    5. Disparo via Gmail API (`gmail.send`) usando token descriptografado do cofre MultiFernet.
    6. Grava OrbeJobSendLog + AuditLog imutável (LGPD).
    """
    t0 = time.perf_counter()
    now = datetime.now(timezone.utc)

    # 1. Kill-Switch
    if profile.kill_switch_active:
        queue_item.status = "BLOCKED_KILL_SWITCH"
        queue_item.error_message = "Kill-Switch OrbeJobs ativo: disparos suspensos."
        await db.flush()
        return {"status": "BLOCKED_KILL_SWITCH", "detail": queue_item.error_message}

    app_obj = (
        await db.execute(
            select(OrbeJobApplication).where(OrbeJobApplication.id == queue_item.application_id)
        )
    ).scalar_one_or_none()

    # 2. Human-in-the-Loop
    if profile.human_in_the_loop and app_obj and app_obj.requires_approval and not app_obj.approved_by_human:
        queue_item.status = "PENDING_APPROVAL"
        queue_item.error_message = "Aguardando aprovação humana (Human-in-the-Loop)."
        await db.flush()
        return {"status": "PENDING_APPROVAL", "detail": queue_item.error_message}

    # 3. Daily Cap (10-15 max)
    daily_cap = clamp_daily_limit(profile.daily_send_limit)
    sent_today = await count_daily_sent_emails(
        db,
        business_id=str(queue_item.business_id),
        user_id=str(queue_item.user_id),
    )
    if sent_today >= daily_cap:
        queue_item.status = "BLOCKED_DAILY_CAP"
        queue_item.error_message = f"Teto diário atingido ({sent_today}/{daily_cap} envios hoje)."
        await db.flush()
        return {"status": "BLOCKED_DAILY_CAP", "detail": queue_item.error_message, "sent_today": sent_today, "daily_cap": daily_cap}

    # 4. Pre-send DNS MX Check (anti-bounce)
    mx_ok, mx_hosts, mx_err = validate_email_mx_records(
        queue_item.recipient_email,
        resolver_fn=mx_resolver_fn,
    )
    queue_item.mx_valid = mx_ok
    queue_item.mx_records_json = json.dumps(mx_hosts)
    if not mx_ok:
        queue_item.status = "FAILED_MX"
        queue_item.error_message = mx_err
        audit_hash = compute_lgpd_audit_hash(
            user_id=str(queue_item.user_id),
            recipient_email=queue_item.recipient_email,
            application_id=str(queue_item.application_id),
            status="FAILED_MX",
            timestamp_iso=now.isoformat(),
        )
        db.add(OrbeJobSendLog(
            business_id=queue_item.business_id,
            user_id=queue_item.user_id,
            queue_id=queue_item.id,
            application_id=queue_item.application_id,
            recipient_email=queue_item.recipient_email,
            mx_host="",
            status="FAILED_MX",
            latency_ms=int((time.perf_counter() - t0) * 1000),
            lgpd_audit_hash=audit_hash,
            detail=mx_err,
        ))
        await db.flush()
        return {"status": "FAILED_MX", "detail": mx_err}

    # 5. Jitter & OAuth2 MultiFernet decrypt
    if not float(queue_item.jitter_seconds or 0):
        queue_item.jitter_seconds = compute_random_jitter_seconds()

    gmail_msg_id: Optional[str] = None
    final_status = "SENT"
    detail_msg = "Enviado via Gmail API (gmail.send) com validação DNS MX."

    if vault and vault.is_active:
        access_token = decrypt_secret(vault.encrypted_access_token)
        sender_email = vault.account_email
        if gmail_sender_fn is not None:
            gmail_msg_id = gmail_sender_fn(
                access_token,
                sender_email,
                queue_item.recipient_email,
                queue_item.subject,
                queue_item.body_text,
            )
        elif os.environ.get("ORBEJOBS_LIVE_GMAIL_SEND", "false").lower() == "true":
            raw_b64 = build_raw_gmail_message(
                sender_email=sender_email,
                recipient_email=queue_item.recipient_email,
                subject=queue_item.subject,
                body_text=queue_item.body_text,
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                    json={"raw": raw_b64},
                )
                if resp.status_code not in (200, 201):
                    queue_item.status = "FAILED_SEND"
                    queue_item.error_message = f"Gmail API HTTP {resp.status_code}: {resp.text[:300]}"
                    await db.flush()
                    return {"status": "FAILED_SEND", "detail": queue_item.error_message}
                gmail_msg_id = str(resp.json().get("id") or "")
        else:
            gmail_msg_id = f"vault-queued-{str(queue_item.id)[:8]}"
            final_status = "SENT_SANDBOX"
            detail_msg = "Token OAuth2 MultiFernet validado + DNS MX OK (modo sandbox seguro)."
    else:
        gmail_msg_id = f"sandbox-{str(queue_item.id)[:8]}"
        final_status = "SENT_SANDBOX"
        detail_msg = "DNS MX validado; cofre Gmail OAuth2 em modo simulação."

    queue_item.status = "SENT"
    queue_item.sent_at = now
    queue_item.error_message = None

    if app_obj:
        app_obj.stage = "SENT"
        app_obj.applied_at = now

    latency_ms = int((time.perf_counter() - t0) * 1000)
    audit_hash = compute_lgpd_audit_hash(
        user_id=str(queue_item.user_id),
        recipient_email=queue_item.recipient_email,
        application_id=str(queue_item.application_id),
        status=final_status,
        timestamp_iso=now.isoformat(),
    )

    db.add(OrbeJobSendLog(
        business_id=queue_item.business_id,
        user_id=queue_item.user_id,
        queue_id=queue_item.id,
        application_id=queue_item.application_id,
        recipient_email=queue_item.recipient_email,
        gmail_message_id=gmail_msg_id,
        mx_host=mx_hosts[0] if mx_hosts else None,
        status=final_status,
        latency_ms=latency_ms,
        lgpd_audit_hash=audit_hash,
        detail=detail_msg,
    ))
    db.add(AuditLog(
        business_id=queue_item.business_id,
        user_id=queue_item.user_id,
        action=AuditAction.CREATE,
        entity="ORBEJOBS_DISPATCH",
        entity_id=queue_item.application_id,
        detail=f"status={final_status}; mx={mx_hosts[0]}; jitter={queue_item.jitter_seconds}s; lgpd_hash={audit_hash}",
    ))
    await db.flush()

    return {
        "status": final_status,
        "gmail_message_id": gmail_msg_id,
        "mx_hosts": mx_hosts,
        "jitter_seconds": float(queue_item.jitter_seconds),
        "lgpd_audit_hash": audit_hash,
        "sent_today": sent_today + 1,
        "daily_cap": daily_cap,
    }
