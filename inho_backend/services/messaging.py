import re

def format_whatsapp_phone(raw_phone: str) -> str:
    """
    Sanitiza e padroniza números de telefone para compatibilidade EXATA com o WhatsApp Baileys.
    Regras aplicadas:
    1. Retira parênteses, traços e espaços (+55 (51) 98474-3957 -> 5551984743957)
    2. Adiciona DDI '55' caso o número chegue sem ele.
    3. Trata a "Zebra" crônica do Meta no Brasil (DDI 55, mas ignorando o Nono Dígito para certos DDDs).
       - O Baileys costuma rejeitar mensagens enviadas para contas antigas que possuem 13 dígitos 
         (ex: 5551981598760 é ignorado). Nós truncamos para o formato 8 dígitos oficial da Meta: 555181598760
    """
    if not raw_phone:
        return ""

    # 1. Remove qualquer caractere não-numérico
    digits = re.sub(r'\D', '', raw_phone)
    
    # 2. Se o cliente salvou no CRM sem o código do país DDI (ex: 51984743957 ou 5184743957)
    if len(digits) in [10, 11]:
        digits = "55" + digits
        
    # 2. Se for 13 digitos no padrão Orbe/Baileys com '55' no início e '9' extra
    # Regra do 9º Dígito: Removemos a 5º casa (que é o 9) para forçar o padrao 12-chars de API
    if len(digits) == 13 and digits.startswith("55"):
        digits = digits[:4] + digits[5:]
        
    return digits


import httpx
import logging
logger = logging.getLogger("inho")

async def async_dispatch_whatsapp_receipt(phone: str, customer_name: str, amount: float, business_name: str):
    """
    Despacha notificação via WhatsApp Baileys.
    Implementa um mecanismo de redundância (Dual-Dispatch) para garantir envio 
    tentando com o prefixo 55 e sem o prefixo 55 (Tratamento para instabilidades de rota do Meta).
    """
    if not phone:
        return
        
    # Limpa o telefone que já deveria estar sanitizado    
    clean_phone = format_whatsapp_phone(phone)
    if not clean_phone:
        return

    # Gera a versão SEM o 55 (removendo DDI apenas se ele estiver presente e couber)
    fallback_phone = clean_phone[2:] if clean_phone.startswith('55') and len(clean_phone) > 10 else clean_phone
    
    variations = list(set([clean_phone, fallback_phone]))
    
    # URL do Microserviço Baileys da Orbe (Placeholder/Local)
    baileys_url = "http://localhost:3333/message/sendText"
    
    msg_text = f"Olá {customer_name}! Confirmamos o recebimento automático de R${amount:.2f} registrado por {business_name}."

    async with httpx.AsyncClient() as client:
        for number_variant in variations:
            payload = {
                "number": number_variant,
                "options": {
                    "delay": 1200,
                    "presence": "composing"
                },
                "textMessage": {"text": msg_text}
            }
            try:
                # Gatilho assíncrono redundante
                response = await client.post(baileys_url, json=payload, timeout=5.0)
                if response.status_code == 200:
                    logger.info(f"✅ Recibo Enviado c/ Sucesso para: {number_variant}")
                else:
                    logger.warning(f"⚠️ Falha no envio WhatsApp para {number_variant}: {response.status_code}")
            except Exception as e:
                logger.error(f"❌ Erro Crítico no Dispatch do Bot (Variante: {number_variant}): {str(e)}")

async def async_dispatch_email_receipt(email: str, customer_name: str, amount: float, business_name: str):
    """
    Placeholder assíncrono para despachar e-mail da fatura,
    necessário para destravar os imports no webhook de billing.
    """
    if not email:
        return
    logger.info(f"📧 Enviando e-mail de Recibo fictício para {email} (R${amount})")

