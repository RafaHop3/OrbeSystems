import asyncio
import json
import logging
from collections import defaultdict
from typing import Dict, List

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.users import User
from models.optout import OptOutRequest
from security.auth import get_current_user

router = APIRouter()
logger = logging.getLogger("optout")

# ── SSE Connection Registry ───────────────────────────────────────────────────
# Maps user_id → list of asyncio.Queue (one queue per open browser tab).
# Kept in-process memory: fast, zero-dependency, works perfectly for a
# single-process deployment. For multi-pod/multi-worker envs, swap for
# Redis Pub/Sub. Entries are created on connect and cleaned up on disconnect.
_sse_registry: Dict[str, List[asyncio.Queue]] = defaultdict(list)


def _register(user_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _sse_registry[user_id].append(q)
    logger.info(f"[SSE] Client connected for user={user_id}  open_tabs={len(_sse_registry[user_id])}")
    return q


def _unregister(user_id: str, q: asyncio.Queue) -> None:
    try:
        _sse_registry[user_id].remove(q)
    except ValueError:
        pass
    if not _sse_registry[user_id]:
        del _sse_registry[user_id]
    logger.info(f"[SSE] Client disconnected for user={user_id}")


def _push_to_user(user_id: str, event_name: str, payload: dict) -> None:
    """Fire-and-forget push to all open tabs of a user."""
    data = json.dumps(payload)
    message = f"event: {event_name}\ndata: {data}\n\n"
    for q in _sse_registry.get(user_id, []):
        q.put_nowait(message)


# ── Fernet Cipher ─────────────────────────────────────────────────────────────
def get_fernet_cipher() -> Fernet:
    if not settings.FERNET_SECRET_KEY:
        logger.warning("FERNET_SECRET_KEY missing, using temporary in-memory key!")
        return Fernet(Fernet.generate_key())
    try:
        return Fernet(settings.FERNET_SECRET_KEY.encode("utf-8"))
    except Exception as e:
        logger.error(f"Bad FERNET_SECRET_KEY: {e}")
        return Fernet(Fernet.generate_key())


# ── GitHub Actions Dispatcher ─────────────────────────────────────────────────
def trigger_github_workflow(request_id: str, broker: str) -> None:
    logger.info(f"[Ghost] Dispatching GitHub Actions for ticket={request_id} broker={broker}")
    if not settings.GITHUB_TOKEN:
        logger.error("GITHUB_TOKEN not set — cannot dispatch worker.")
        return
    try:
        response = httpx.post(
            "https://api.github.com/repos/RafaHop3/OrbeSystems/actions/workflows/broker-demolition.yml/dispatches",
            headers={
                "Accept": "application/vnd.github.v3+json",
                "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
            },
            json={"ref": "main", "inputs": {"ticket_id": str(request_id), "target_broker": broker}},
            timeout=10.0,
        )
        if response.status_code // 100 == 2:
            logger.info("[Ghost] Workflow dispatched successfully.")
        else:
            logger.error(f"[Ghost] Dispatch failed: {response.status_code} — {response.text}")
    except Exception as e:
        logger.error(f"[Ghost] Exception dispatching workflow: {e}")


# ── Schemas ───────────────────────────────────────────────────────────────────
class OptOutCreatePayload(BaseModel):
    full_name: str
    cpf: str
    target_broker: str
    birth_date: str = ""
    email: str = ""


class GithubWebhookPayload(BaseModel):
    ticket_id: str
    status: str
    log: str = ""


# ── POST /request ─────────────────────────────────────────────────────────────
@router.post("/request")
def create_opt_out_ticket(
    payload: OptOutCreatePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "premium":
        raise HTTPException(
            status_code=403,
            detail="A Remoção em Massa de Dados é exclusiva do Plano Premium. Faça o upgrade.",
        )
    try:
        cipher = get_fernet_cipher()
        encrypted_cpf = cipher.encrypt(payload.cpf.encode("utf-8")).decode("utf-8")
    except Exception:
        raise HTTPException(status_code=500, detail="Erro interno no Motor de Criptografia LGPD.")

    novo_pedido = OptOutRequest(
        user_id=current_user.id,
        cpf_encrypted=encrypted_cpf,
        full_name=payload.full_name,
        birth_date=payload.birth_date,
        email=payload.email,
        target_broker=payload.target_broker,
        status="PENDING",
    )
    db.add(novo_pedido)
    db.commit()
    db.refresh(novo_pedido)

    # Dispatch GitHub Actions in background (fire and forget)
    background_tasks.add_task(trigger_github_workflow, novo_pedido.id, payload.target_broker)

    # Push SSE event to the user's open tabs immediately — PENDING state
    _push_to_user(
        current_user.id,
        "ticket_created",
        {
            "id": novo_pedido.id,
            "target_broker": novo_pedido.target_broker,
            "status": "PENDING",
            "logs": None,
            "created_at": novo_pedido.created_at.isoformat(),
        },
    )

    return {"message": "Protocolo gerado e despachado", "ticket_id": novo_pedido.id}


# ── POST /webhook  (called by GitHub Actions runner) ─────────────────────────
@router.post("/webhook")
def github_status_webhook(payload: GithubWebhookPayload, db: Session = Depends(get_db)):
    """Receives final status from GitHub Actions and pushes SSE update to the owner's browser."""
    pedido = db.query(OptOutRequest).filter(OptOutRequest.id == payload.ticket_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    pedido.status = payload.status
    if payload.log:
        pedido.logs = f"{pedido.logs or ''}\n{payload.log}"
    db.commit()

    # Real-time push: the user's browser receives this in <50ms
    _push_to_user(
        pedido.user_id,
        "ticket_update",
        {
            "id": pedido.id,
            "target_broker": pedido.target_broker,
            "status": pedido.status,
            "logs": pedido.logs,
            "created_at": pedido.created_at.isoformat(),
        },
    )

    logger.info(f"[SSE] Pushed ticket_update to user={pedido.user_id} ticket={pedido.id} status={pedido.status}")
    return {"status": "Updated"}


# ── GET /stream  (SSE endpoint) ───────────────────────────────────────────────
@router.get("/stream")
async def ticket_sse_stream(
    token: str = Query(..., description="JWT bearer token (EventSource cannot send headers)"),
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events stream for real-time ticket updates.

    The browser EventSource API cannot set Authorization headers, so the
    JWT is passed as a query parameter instead.  The token is validated
    server-side exactly like the Bearer header path.

    Flow:
      1. Browser opens  EventSource("/api/optout/stream?token=<jwt>")
      2. FastAPI validates the token, identifies the user
      3. Connection is held open; heartbeat comment every 25s (prevents proxy timeouts)
      4. When /webhook fires, _push_to_user() drops a message into the queue
      5. The async generator picks it up and yields it over the open connection
      6. Browser EventSource dispatches the 'ticket_update' event to the handler
      7. React state is updated — card flips from PENDING → SUCCESS/FAILED instantly
    """
    from jose import JWTError, jwt as jose_jwt
    from config import settings as cfg

    try:
        payload_jwt = jose_jwt.decode(token, cfg.SECRET_KEY, algorithms=["HS256"])
        email: str = payload_jwt.get("sub")
        role: str = payload_jwt.get("role")
        if not email or not role:
            raise ValueError("Invalid token claims")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    from models.users import User as UserModel
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    user_id = user.id

    async def event_generator():
        q = _register(user_id)
        try:
            # Send an initial "connected" event so the client knows the stream is live
            yield f"event: connected\ndata: {json.dumps({'user_id': user_id})}\n\n"

            while True:
                try:
                    # Wait up to 25s for a message; if none, send a keepalive comment
                    # (prevents Cloudflare/nginx from closing idle connections at 30s)
                    message = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield message
                except asyncio.TimeoutError:
                    # SSE comment line — ignored by EventSource but keeps TCP alive
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            # Client disconnected cleanly (tab closed, navigation, etc.)
            pass
        finally:
            _unregister(user_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable nginx response buffering
            "Connection": "keep-alive",
        },
    )


# ── GET /list ─────────────────────────────────────────────────────────────────
@router.get("/list")
def list_optout_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initial data load. After mount the frontend switches to SSE for live updates."""
    pedidos = (
        db.query(OptOutRequest)
        .filter(OptOutRequest.user_id == current_user.id)
        .order_by(OptOutRequest.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "target_broker": p.target_broker,
            "status": p.status,
            "logs": p.logs,
            "created_at": p.created_at.isoformat(),
        }
        for p in pedidos
    ]
