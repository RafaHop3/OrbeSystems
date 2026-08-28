import urllib.parse
from decimal import Decimal

async def async_dispatch_whatsapp_receipt(phone: str, customer_name: str, amount: Decimal, business_name: str):
    amt_str = f"R$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    msg = (
        f"✅ *RECIBO DE PAGAMENTO - {business_name}*\n\n"
        f"Olá, *{customer_name}*!\n"
        f"Seu pagamento de *{amt_str}* foi confirmado com sucesso!\n\n"
        f"Muito obrigado pela preferência. A sua conta já encontra-se totalmente liberada.\n"
        f"Qualquer dúvida, nossa equipe está à disposição."
    )
    encoded_msg = urllib.parse.quote(msg)
    wa_url = f"https://wa.me/{phone}?text={encoded_msg}"
    print(f"[MESSAGING] WhatsApp Receipt Link Generated: {wa_url}")
    return wa_url

async def async_dispatch_email_receipt(email: str, customer_name: str, amount: Decimal, business_name: str):
    amt_str = f"R$ {amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    msg = (
        f"Assunto: Recibo de Pagamento - {business_name}\n\n"
        f"Prezado(a) {customer_name},\n\n"
        f"Registramos o pagamento da sua fatura no valor de {amt_str}.\n"
        f"Sua conta está ativa e em situação regular.\n\n"
        f"Atenciosamente,\n{business_name}"
    )
    print(f"[MESSAGING] Email Receipt text for {email}: \n{msg}")
    return True
