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
        
    # 3. Regra dos 8 dígitos no Brasil (Compatibilidade Extrema Baileys)
    # Se o número possui exatos 13 dígitos globais (55+xx+9+xxxx+xxxx) e começou com 55
    if len(digits) == 13 and digits.startswith("55"):
        # Pega do começo (DDI + DDD) e pula a posição 4 (o '9'), concatenando o resto
        # Ex: 55 51 9 8474 3957 -> 55 51 8474 3957
        digits = digits[:4] + digits[5:]
        
    return digits
