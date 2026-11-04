import os
from typing import Any, Dict, List, Optional
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config import settings

router = APIRouter()

HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"
HF_LEGACY_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"


class ChatRequest(BaseModel):
    message: Optional[str] = None
    system_prompt: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    user_message: Optional[str] = None
    intent: Optional[str] = None


def _build_orbrick_rag_prompt(req: ChatRequest) -> tuple[str, str]:
    """
    Constrói o System Prompt e User Prompt unificados para a IA Orbe Systems,
    isolando estritamente o conhecimento RAG e o perfil CBM preditivo do contratante (business_id).
    """
    base_sys = req.system_prompt or (
        "Você é o assistente virtual oficial da Orbe Systems (OrBrick-IA). "
        "Responda de forma profissional, empática, clara e objetiva em português do Brasil."
    )
    user_msg = (req.user_message or req.message or "").strip()
    ctx = req.context or {}
    if not ctx:
        return base_sys, user_msg

    inst_name = ctx.get("institution_name") or "Instituição"
    first_name = ctx.get("contact_first_name") or "Cliente"
    churn_risk = ctx.get("churn_risk_level") or "LOW"
    cbm_summary = ctx.get("cbm_predictive_summary") or ""
    invoices = ctx.get("open_invoices_summary") or []
    rag_docs = ctx.get("tenant_rag_docs") or []
    recent_history = ctx.get("recent_history") or []

    rag_block = ""
    if rag_docs:
        chunks_txt = "\n".join(
            f"- [{d.get('category', 'REGULAMENTO')}] {d.get('title', 'Norma')}: {d.get('content', '')}"
            for d in rag_docs[:4]
        )
        rag_block = (
            f"\n\n--- BASE DE CONHECIMENTO RAG EXCLUSIVA DE {inst_name.upper()} (ISOLAMENTO MULTI-TENANT) ---\n"
            f"{chunks_txt}\n"
            f"--- FIM DO REGULAMENTO DO CONTRATANTE ---"
        )

    inv_block = ""
    if invoices:
        inv_lines = "\n".join(
            f"- Fatura #{i.get('invoice_ref')}: R$ {float(i.get('amount', 0)):.2f} | Vencimento: {i.get('due_date')} | Status: {i.get('status')}"
            for i in invoices[:5]
        )
        inv_block = f"\n\n--- FATURAS EM ABERTO DO CLIENTE ---\n{inv_lines}"
    else:
        inv_block = "\n\n--- FATURAS EM ABERTO DO CLIENTE ---\nNenhuma fatura pendente no momento."

    history_block = ""
    if recent_history:
        h_lines = "\n".join(f"{h.get('role', 'user')}: {h.get('content', '')}" for h in recent_history[-6:])
        history_block = f"\n\n--- HISTÓRICO RECENTE DA CONVERSA ---\n{h_lines}"

    predictive_tone = (
        "ATENÇÃO PREDITIVA CBM: Cliente em ZONA DE RISCO DE CHURN. Adote tom altamente acolhedor, "
        "priorize retenção e ofereça suporte flexível dentro do regulamento da instituição."
        if churn_risk in ("HIGH", "CRITICAL")
        else "Cliente com saúde comportamental estável (RFM saudável). Mantenha atendimento ágil, cordial e resolutivo."
    )

    full_sys = (
        f"{base_sys}\n"
        f"Instituição Contratante: {inst_name} (Tenant ID: {ctx.get('tenant_id', 'isolated')})\n"
        f"Cliente em Atendimento: {first_name} | Risco Preditivo CBM: {churn_risk} {cbm_summary}\n"
        f"Diretriz Comportamental: {predictive_tone}"
        f"{rag_block}"
        f"{inv_block}"
        f"{history_block}"
    )
    return full_sys, user_msg


def _synthesize_orbe_rag_predictive_reply(req: ChatRequest) -> Optional[str]:
    """
    Síntese RAG Preditiva Autônoma da Orbe Systems (Tier 3 — Zero Latência):
    Quando o contratante possui documentos RAG relevantes (estatuto, regulamento, FAQ)
    para a dúvida do cliente, sintetiza a resposta oficial combinando o regulamento
    daquele tenant com os dados financeiros e preditivos (CBM).
    """
    ctx = req.context or {}
    rag_docs = ctx.get("tenant_rag_docs") or []
    if not rag_docs:
        return None

    inst_name = ctx.get("institution_name") or "nossa instituição"
    first_name = ctx.get("contact_first_name") or "Cooperado(a)"
    churn_risk = ctx.get("churn_risk_level") or "LOW"
    invoices = ctx.get("open_invoices_summary") or []
    top_doc = rag_docs[0]
    doc_title = top_doc.get("title", "Regulamento Oficial")
    doc_content = (top_doc.get("content") or "").strip()

    retention_note = ""
    if churn_risk in ("HIGH", "CRITICAL"):
        retention_note = (
            "\n\n💡 *Atendimento Prioritário CBM:* Identificamos seu perfil especial em nossa base e "
            "temos condições diferenciadas de acompanhamento caso precise de suporte personalizado."
        )

    inv_note = ""
    if invoices and req.intent in ("SEGUNDA_VIA_PIX", "DUVIDA_FATURA", "NEGOCIACAO_PRAZO"):
        inv = invoices[0]
        amt = float(inv.get("amount", 0.0))
        amt_str = f"R$ {amt:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        due_str = str(inv.get("due_date", ""))[:10]
        pix_code = inv.get("pix_code")
        inv_note = f"\n\n📄 *Resumo Financeiro Atual:* Consta título de *{amt_str}* (vencimento {due_str})."
        if pix_code and req.intent == "SEGUNDA_VIA_PIX":
            inv_note += f"\nChave/Código PIX Copia e Cola:\n*{pix_code}*"

    return (
        f"Olá, {first_name}! Conforme a diretriz oficial de *{inst_name}* "
        f"(*{doc_title}*):\n\n"
        f"{doc_content}"
        f"{inv_note}"
        f"{retention_note}"
    )


@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    user_msg = (request.user_message or request.message or "").strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    sys_prompt, clean_user = _build_orbrick_rag_prompt(request)
    gemini_key = (settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")).strip()
    hf_key = (settings.HUGGINGFACE_API_KEY or os.environ.get("HUGGINGFACE_API_KEY", "")).strip()

    # 1. Provedor Primário: Google Gemini Flash (Orbe Systems AI Engine)
    if gemini_key:
        try:
            gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}"
            resp = requests.post(
                url,
                json={
                    "system_instruction": {"parts": [{"text": sys_prompt}]},
                    "contents": [{"role": "user", "parts": [{"text": clean_user}]}],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 350},
                },
                timeout=6,
            )
            if resp.status_code == 200:
                data = resp.json()
                text_out = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                if text_out:
                    return {"reply": text_out, "provider": "ORBE_GEMINI_RAG_LLM"}
        except Exception as e:
            print(f"[Orbe AI Engine] Gemini skip: {e}")

    # 2. Provedor Secundário: Hugging Face Router (Qwen 2.5 72B Instruct / Mistral)
    if hf_key:
        try:
            resp = requests.post(
                HF_ROUTER_URL,
                headers={"Authorization": f"Bearer {hf_key}", "Content-Type": "application/json"},
                json={
                    "model": "Qwen/Qwen2.5-72B-Instruct",
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": clean_user},
                    ],
                    "max_tokens": 350,
                    "temperature": 0.4,
                },
                timeout=6,
            )
            if resp.status_code == 200:
                data = resp.json()
                text_out = (data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()
                if text_out:
                    return {"reply": text_out, "provider": "ORBE_HF_QWEN72B_RAG_LLM"}
        except Exception as e:
            print(f"[Orbe AI Engine] HF Router skip: {e}")

        try:
            full_prompt = f"<s>[INST] {sys_prompt}\n\nUsuário: {clean_user} [/INST]"
            resp2 = requests.post(
                HF_LEGACY_URL,
                headers={"Authorization": f"Bearer {hf_key}"},
                json={"inputs": full_prompt, "parameters": {"max_new_tokens": 250, "temperature": 0.4}},
                timeout=6,
            )
            if resp2.status_code == 200:
                data2 = resp2.json()
                bot_reply = data2[0].get("generated_text", "").split("[/INST]")[-1].strip()
                if bot_reply:
                    return {"reply": bot_reply, "provider": "ORBE_MISTRAL_RAG_LLM"}
        except Exception as e:
            print(f"[Orbe AI Engine] HF Legacy skip: {e}")

    # 3. Tier 3: Motor Autônomo de Síntese RAG Preditiva da Orbe Systems (Zero Latência)
    rag_synthesized = _synthesize_orbe_rag_predictive_reply(request)
    if rag_synthesized:
        return {"reply": rag_synthesized, "provider": "ORBE_RAG_PREDICTIVE_ENGINE"}

    return {"reply": "", "provider": "ORBE_FALLBACK_DELEGATED"}
