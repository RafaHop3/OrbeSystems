import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config import settings

router = APIRouter()

API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
HEADERS = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    # System prompt blindado para definir o comportamento da IA
    system_prompt = "Você é um assistente virtual da Orbe. Responda de forma profissional e objetiva."
    
    # Formatação exigida pelo modelo Mistral (instruções entre [INST] e [/INST])
    full_prompt = f"<s>[INST] {system_prompt}\n\nUsuário: {request.message} [/INST]"
    
    payload = {
        "inputs": full_prompt,
        "parameters": {
            "max_new_tokens": 250, # Limita o tamanho da resposta
            "temperature": 0.5     # Controla a criatividade (mais baixo = mais focado)
        }
    }
    
    try:
        response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=30)
        response.raise_for_status() # Dispara erro se o HTTP Status não for 200
        data = response.json()
        
        # Extrai apenas a resposta da IA, removendo o prompt original
        bot_reply = data[0].get("generated_text", "").split("[/INST]")[-1].strip()
        
        return {"reply": bot_reply}
        
    except requests.exceptions.RequestException as e:
        # Tratamento de erro genérico para não expor stack trace ao frontend
        print(f"Erro na API Hugging Face: {e}")
        raise HTTPException(status_code=500, detail="Serviço de inteligência indisponível no momento.")
