"""
INHO – Ghost Engine Service Module
LGPD Art. 18 Data Broker Privacy Automator & DPO Response Parser
"""
import logging
import re
from typing import Dict, Any, List

logger = logging.getLogger("inho.ghost_engine")

# ── Seed Data Brokers Brasileiros ────────────────────────────────────
DEFAULT_DATA_BROKERS = [
    {
        "name": "Serasa Experian",
        "dpo_email": "dpo@experian.com",
        "delete_url": "https://www.serasa.com.br/protecao-dados-pessoais/direitos-do-titular",
        "method": "FORM",
        "category": "Score de Crédito & Finanças",
    },
    {
        "name": "Boa Vista SCPC / Equifax",
        "dpo_email": "dpo@boavistascdc.com.br",
        "delete_url": "https://www.consumidorpositivo.com.br/atendimento/lgpd",
        "method": "FORM",
        "category": "Score de Crédito & Cadastro",
    },
    {
        "name": "Econodata",
        "dpo_email": "dpo@econodata.com.br",
        "delete_url": "https://www.econodata.com.br/politica-privacidade",
        "method": "EMAIL",
        "category": "Prospecção & Dados B2B",
    },
    {
        "name": "Telelistas",
        "dpo_email": "dpo@telelistas.net",
        "delete_url": "https://www.telelistas.net/fale_conosco",
        "method": "EMAIL",
        "category": "Diretório Telefônico & CNPJ",
    },
    {
        "name": "Assertiva Soluções",
        "dpo_email": "dpo@assertivasolucoes.com.br",
        "delete_url": "https://www.assertivasolucoes.com.br/privacidade",
        "method": "EMAIL",
        "category": "Localização de Pessoas & Crédiok",
    },
]


def generate_lgpd_notice(full_name: str, cpf: str, email: str, broker_name: str) -> Dict[str, str]:
    """
    Gera o termo oficial de solicitação de exclusão com base no Art. 18, inciso VI da LGPD (Lei 13.709/2018).
    """
    subject = f"REQUERIMENTO DE EXCLUSÃO DE DADOS PESSOAIS - Art. 18 LGPD - CPF: {cpf}"
    body = f"""Prezado(a) Encarregado(a) de Dados (DPO) de {broker_name},

Na qualidade de titular de dados pessoais, venho por meio deste exercer o meu direito de exclusão, conforme estabelecido pelo Artigo 18, inciso VI, da Lei Geral de Proteção de Dados (Lei 13.709/2018).

Solicito a exclusão imediata de todos os meus dados pessoais, históricos e metadados que estejam sob a responsabilidade desta organização.

Dados para localização do cadastro:
• Nome Completo: {full_name}
• CPF: {cpf}
• E-mail: {email}

Aguardo confirmação formal da exclusão no prazo legal de 15 (quinze) dias, conforme previsto no Art. 19 da LGPD.

Atenciosamente,
{full_name}
"""
    return {"subject": subject, "body": body}


def parse_dpo_email_response(email_body: str) -> Dict[str, Any]:
    """
    Analisa o corpo da resposta de um DPO com saída estruturada contendo score de confiança e justificativa.
    Regra de Sênior: Se a confiança for menor que 0.90, o sistema automaticamente força o status para MANUAL_REQUIRED.
    """
    text = email_body.lower()

    # Confirmação de exclusão
    confirmed_keywords = [
        "confirmamos a exclusão", "dados excluídos", "dados deletados",
        "solicitação atendida", "exclusão efetuada", "excluídos de nossas bases",
        "eliminados com sucesso"
    ]
    is_confirmed = any(kw in text for kw in confirmed_keywords)

    # Documentos pendentes
    doc_keywords = [
        "documento de identidade", "rg", "cnh", "cópia do cpf",
        "comprovante de residência", "confirmação de identidade",
        "enviar documento", "anexo"
    ]
    requires_docs = any(kw in text for kw in doc_keywords)

    requested_docs = []
    if "rg" in text or "identidade" in text:
        requested_docs.append("RG / Documento Oficial com Foto")
    if "cpf" in text:
        requested_docs.append("Cópia do CPF")
    if "comprovante" in text or "residência" in text:
        requested_docs.append("Comprovante de Residência")

    # Classificação inicial e cálculo de confiança (Structured Output)
    if is_confirmed:
        initial_status = "DELETED"
        confidence = 0.98
        reasoning = "O e-mail menciona explicitamente a confirmação da eliminação dos registros nas bases de dados."
        summary = "DPO confirmou a exclusão definitiva dos dados pessoais."
    elif requires_docs:
        initial_status = "PENDING_DOCS"
        confidence = 0.95
        reasoning = "O e-mail exige o envio de documentos comprobatórios de identidade para prosseguir."
        summary = f"DPO solicitou documentos complementares para validação de identidade: {', '.join(requested_docs) if requested_docs else 'Documentos com foto'}."
    elif "portal" in text or "formulario" in text or "link" in text:
        initial_status = "MANUAL_REQUIRED"
        confidence = 0.92
        reasoning = "O e-mail orienta a realização do pedido através de portal ou formulário específico."
        summary = "DPO orientou preencher formulário específico no portal da empresa."
    else:
        # Resposta vaga/ambígua -> Confiança baixa
        initial_status = "MANUAL_REQUIRED"
        confidence = 0.70
        reasoning = "Resposta genérica ou ambígua do DPO sem confirmação explícita de exclusão ou pedido de documentos."
        summary = "Resposta ambígua do DPO. Ação manual necessária para validação."

    # 🚨 REGRA DE SÊNIOR: Se a confiança for menor que 0.90, forçar MANUAL_REQUIRED
    final_status = initial_status
    if confidence < 0.90:
        final_status = "MANUAL_REQUIRED"
        summary = f"[AVISO DE SEGURANÇA] Confiança baixa ({confidence:.2f} < 0.90). Requer revisão manual por humano."

    return {
        "detected_status": final_status,
        "is_deletion_confirmed": is_confirmed and final_status == "DELETED",
        "requires_documents": requires_docs,
        "requested_docs": requested_docs,
        "confidence": confidence,
        "reasoning": reasoning,
        "summary": summary
    }


def log_anonymized_dispatch(user_id: str, broker_id: str, method: str):
    """
    Senior Dev Policy: Loga requisições de forma estritamente anonimizada sem expor CPFs ou Nomes.
    """
    logger.info(f"GhostEngine Dispatch | UserID: {user_id} | BrokerID: {broker_id} | Method: {method}")
