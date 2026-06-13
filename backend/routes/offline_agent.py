from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import json
import os

from security.auth import require_premium
from models.users import User
from services.offline_agent import (
    submit_proactive_prompt,
    get_job_status,
    list_all_jobs,
    JOBS_FILE
)

router = APIRouter(prefix="/api/offline-agent", tags=["Offline Proactive Agent"])

class SubmitPromptRequest(BaseModel):
    prompt: str

@router.post("/submit")
async def submit_prompt(req: SubmitPromptRequest, current_user: User = Depends(require_premium)):
    """Submete uma instrução ou diálogo em linguagem humana comum para ser processado offline em background."""
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="O prompt de instrução não pode ser vazio.")
    
    job_id = submit_proactive_prompt(prompt)
    return {
        "status": "pending",
        "job_id": job_id,
        "message": "Tarefa enviada com sucesso para o processamento em segundo plano (offline)."
    }

@router.get("/jobs/{job_id}")
async def get_job(job_id: str, current_user: User = Depends(require_premium)):
    """Busca o status e os resultados de uma tarefa específica do agente offline."""
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Tarefa não localizada no histórico.")
    return job

@router.get("/jobs")
async def list_jobs(current_user: User = Depends(require_premium)):
    """Lista o histórico de todas as tarefas de background submetidas ao agente offline."""
    return list_all_jobs()

@router.delete("/jobs")
async def clear_jobs(current_user: User = Depends(require_premium)):
    """Limpa todo o histórico de tarefas offline do banco de dados/registro local."""
    try:
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=2)
        return {"message": "Histórico de tarefas offline limpo com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao limpar histórico: {str(e)}")
