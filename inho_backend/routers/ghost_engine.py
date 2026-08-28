"""
INHO – Ghost Engine Router
GET /ghost/brokers | POST /ghost/requests/dispatch | GET /ghost/requests | POST /ghost/parse-response
"""
import uuid
from uuid import UUID
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from models.models import DataBroker, DataBrokerMethod, PrivacyRequest, PrivacyRequestStatus, User
from schemas.schemas import (
    DataBrokerOut, PrivacyRequestCreate, PrivacyRequestOut,
    DPOResponseParseRequest, DPOResponseParseResult
)
from core.deps import get_current_user
from services.ghost_engine import (
    DEFAULT_DATA_BROKERS, generate_lgpd_notice,
    parse_dpo_email_response, log_anonymized_dispatch
)

router = APIRouter(prefix="/ghost", tags=["Ghost Engine (LGPD Automator)"])


@router.get("/brokers", response_model=List[DataBrokerOut])
async def list_data_brokers(
    db: AsyncSession = Depends(get_db),
):
    """
    Lista todos os Data Brokers cadastrados. Se a tabela estiver vazia, semeia automaticamente os 5 principais alvos do Brasil.
    """
    result = await db.execute(select(DataBroker).where(DataBroker.is_active == True))
    brokers = result.scalars().all()

    if not brokers:
        # Auto-seed 5 Brazilian Data Brokers
        for seed in DEFAULT_DATA_BROKERS:
            b = DataBroker(
                name=seed["name"],
                dpo_email=seed["dpo_email"],
                delete_url=seed["delete_url"],
                method=DataBrokerMethod(seed["method"]),
                category=seed["category"],
            )
            db.add(b)
        await db.commit()

        result = await db.execute(select(DataBroker).where(DataBroker.is_active == True))
        brokers = result.scalars().all()

    return brokers


@router.post("/requests/dispatch", response_model=dict)
async def dispatch_privacy_request(
    body: PrivacyRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Gera o Requerimento LGPD Art. 18, registra o pedido no Supabase e dispara o fluxo de exclusão.
    """
    result = await db.execute(select(DataBroker).where(DataBroker.id == body.broker_id))
    broker: DataBroker | None = result.scalar_one_or_none()

    if not broker:
        raise HTTPException(status_code=404, detail="Data Broker nao encontrado")

    # 1. Generate Legal Notice (LGPD Art. 18)
    notice = generate_lgpd_notice(
        full_name=body.full_name,
        cpf=body.cpf,
        email=body.email,
        broker_name=broker.name
    )

    # 2. Determine Initial Status
    if broker.method == DataBrokerMethod.EMAIL:
        initial_status = PrivacyRequestStatus.EMAIL_SENT
        notes = f"E-mail enviado juridicamente para o DPO ({broker.dpo_email})"
    elif broker.method == DataBrokerMethod.FORM:
        initial_status = PrivacyRequestStatus.MANUAL_REQUIRED
        notes = f"Requer preenchimento de formulário no portal: {broker.delete_url}"
    else:
        initial_status = PrivacyRequestStatus.PENDING
        notes = "Processamento automático agendado"

    # 3. Create or Update Privacy Request in DB
    existing = await db.execute(
        select(PrivacyRequest).where(
            PrivacyRequest.user_id == user.id,
            PrivacyRequest.broker_id == broker.id
        )
    )
    pr: PrivacyRequest | None = existing.scalar_one_or_none()

    if pr:
        pr.status = initial_status
        pr.sent_at = datetime.now(timezone.utc)
        pr.notes = notes
    else:
        pr = PrivacyRequest(
            user_id=user.id,
            broker_id=broker.id,
            status=initial_status,
            sent_at=datetime.now(timezone.utc),
            notes=notes,
        )
        db.add(pr)

    await db.commit()
    await db.refresh(pr)

    # 4. Senior Dev Logging: Anonymized log
    log_anonymized_dispatch(str(user.id), str(broker.id), broker.method.value)

    return {
        "request_id": str(pr.id),
        "broker_name": broker.name,
        "status": pr.status.value,
        "method": broker.method.value,
        "dpo_email": broker.dpo_email,
        "delete_url": broker.delete_url,
        "notice_subject": notice["subject"],
        "notice_body": notice["body"],
        "notes": notes,
    }


@router.get("/requests", response_model=List[PrivacyRequestOut])
async def list_my_privacy_requests(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista o histórico de solicitações de exclusão do usuário."""
    result = await db.execute(select(PrivacyRequest).where(PrivacyRequest.user_id == user.id))
    return result.scalars().all()


@router.post("/parse-response", response_model=DPOResponseParseResult)
async def parse_dpo_response(
    body: DPOResponseParseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analisa e-mail retornado pelo DPO, atualiza o status no Supabase e classifica se a exclusão foi concluída ou exige documentos.
    """
    result = await db.execute(select(PrivacyRequest).where(PrivacyRequest.id == body.request_id))
    pr: PrivacyRequest | None = result.scalar_one_or_none()

    if not pr:
        raise HTTPException(status_code=404, detail="Solicitacao de privacidade nao encontrada")

    parsed = parse_dpo_email_response(body.email_body)

    # Update DB Status based on AI/NLP classification
    new_status = PrivacyRequestStatus(parsed["detected_status"])
    pr.status = new_status
    pr.last_checked_at = datetime.now(timezone.utc)
    pr.notes = parsed["summary"]
    await db.commit()

    return DPOResponseParseResult(
        request_id=pr.id,
        detected_status=new_status,
        is_deletion_confirmed=parsed["is_deletion_confirmed"],
        requires_documents=parsed["requires_documents"],
        confidence=parsed["confidence"],
        reasoning=parsed["reasoning"],
        requested_docs=parsed["requested_docs"],
        summary=parsed["summary"]
    )


async def _run_playwright_background_worker(
    request_id: UUID,
    broker_name: str,
    user_data: dict,
    db_factory
):
    """Worker em segundo plano para execucao do robô Playwright."""
    from services.playwright_automator import run_playwright_form_submission
    from db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PrivacyRequest).where(PrivacyRequest.id == request_id))
        pr: PrivacyRequest | None = result.scalar_one_or_none()

        if not pr:
            return

        # Status inicial de processamento
        pr.status = PrivacyRequestStatus.DISPATCHED
        await db.commit()

        # Execução do Playwright com Stealth & CAPTCHA Handler
        res = await run_playwright_form_submission(
            request_id=str(request_id),
            broker_key=broker_name.lower(),
            user_data=user_data
        )

        # Atualização pós-automação com evidência
        pr.status = PrivacyRequestStatus(res["status"])
        pr.notes = res["reasoning"]
        if res.get("evidence_url"):
            pr.legal_notice = f"Evidencia: {res['evidence_url']}"

        await db.commit()


@router.post("/dispatch-form/{request_id}", status_code=202)
async def dispatch_form_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fase 5 - Orquestração e Filas:
    Dispara o motor Playwright para preenchimento de formulário em segundo plano sem bloquear a requisição HTTP.
    """
    result = await db.execute(select(PrivacyRequest).where(PrivacyRequest.id == request_id))
    pr: PrivacyRequest | None = result.scalar_one_or_none()

    if not pr:
        raise HTTPException(status_code=404, detail="Solicitação de privacidade não encontrada")

    result_broker = await db.execute(select(DataBroker).where(DataBroker.id == pr.broker_id))
    broker: DataBroker | None = result_broker.scalar_one_or_none()

    broker_name = broker.name if broker else "serasa"

    user_data = {
        "full_name": user.full_name or "Titular dos Dados",
        "cpf": "000.000.000-00",
        "email": user.email
    }

    # Envia para a fila em segundo plano (FastAPI BackgroundTasks)
    background_tasks.add_task(
        _run_playwright_background_worker,
        request_id=request_id,
        broker_name=broker_name,
        user_data=user_data,
        db_factory=None
    )

    return {
        "status": "QUEUED",
        "message": f"Robô Ghost Engine agendado para o broker {broker_name}. Executando em segundo plano.",
        "request_id": request_id
    }

