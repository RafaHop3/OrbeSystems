import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import json
import logging

from config import settings
from database import get_db
from models.users import User
from models.optout import OptOutRequest
from security.auth import get_current_user

router = APIRouter()
logger = logging.getLogger("optout")

def get_fernet_cipher():
    if not settings.FERNET_SECRET_KEY:
        # Gerar uma fallback key dinâmica temporária caso falte no ambiente, 
        # porém em prod DEVE estar presente no .env
        logger.warning("FERNET_SECRET_KEY missing, using temporary memory key (Data loss possible on restart)!")
        return Fernet(Fernet.generate_key())
    
    try:
        return Fernet(settings.FERNET_SECRET_KEY.encode('utf-8'))
    except Exception as e:
        logger.error(f"Erro ao instanciar Fernet Cipher: {e}")
        # Chave inválida? Gera uma aleatória pra evitar crash letal na rota JWT, mas perderá os dados
        return Fernet(Fernet.generate_key())

def trigger_github_workflow(request_id: str, broker: str):
    """
    Despacha o worker no Github Actions. (Fire and Forget)
    Github Token precisa ser adicionado no backend environment secret,
    ou usamos um API Endpoint Serverless aberto para webhook.
    """
    logger.info(f"Disparando Workflow Github Actions para o ticket: {request_id} ({broker})")
    # TODO: Disparo Real usando httpx.post para api.github.com/repos/X/X/actions/workflows/broker-demolition.yml/dispatches

from pydantic import BaseModel
class OptOutCreatePayload(BaseModel):
    full_name: str
    cpf: str
    target_broker: str
    birth_date: str = ""
    email: str = ""

@router.post("/request")
def create_opt_out_ticket(
    payload: OptOutCreatePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        cipher = get_fernet_cipher()
        encrypted_cpf = cipher.encrypt(payload.cpf.encode('utf-8')).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erro interno no Motor de Criptografia LGPD.")

    novo_pedido = OptOutRequest(
        user_id=current_user.id,
        cpf_encrypted=encrypted_cpf,
        full_name=payload.full_name,
        birth_date=payload.birth_date,
        email=payload.email,
        target_broker=payload.target_broker,
        status="PENDING"
    )
    
    db.add(novo_pedido)
    db.commit()
    db.refresh(novo_pedido)
    
    # Acorda a nuvem da Microsoft (Github) em Backend para não travar o FastAPI
    background_tasks.add_task(trigger_github_workflow, novo_pedido.id, payload.target_broker)
    
    return {"message": "Protocolo gerado e despachado", "ticket_id": novo_pedido.id}

class GithubWebhookPayload(BaseModel):
    ticket_id: str
    status: str
    log: str = ""

@router.post("/webhook")
def github_status_webhook(payload: GithubWebhookPayload, db: Session = Depends(get_db)):
    """Recebe o STATUS do Github Actions (Sucesso ou Falha da remoção do DataBroker)"""
    pedido = db.query(OptOutRequest).filter(OptOutRequest.id == payload.ticket_id).first()
    
    if not pedido:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
        
    pedido.status = payload.status
    if payload.log:
        pedido.logs = f"{pedido.logs or ''}\\n{payload.log}"
        
    db.commit()
    return {"status": "Updated"}
