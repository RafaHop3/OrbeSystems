import requests
import json
import datetime

BASE_URL = "https://inho-api.orbesystems.com.br/api/v1"

print("1. Logging in using Rafael's credentials...")
res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "rafael@orbesystems.com.br", 
    "password": "Muhammadalivsroyjonesjr#Ju.130798", 
    "mfa_code": ""
})

if res.status_code != 200:
    print(f"Login failed: {res.status_code} {res.text}")
    exit(1)

token = res.json().get("access_token")
print("Login OK! Token acquired.")
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("\n2. Disparando WhatsApp direto pela Nova Rota (Baileys Proxy)...")
wa_url = f"{BASE_URL}/crm/whatsapp/send"
res_wa = requests.post(wa_url, json={
    "phone": "51984743957",
    "message": "Você acaba de receber a fatura do Contrato Verde Pulse! Acesse a proposta: https://inho.orbesystems.com.br/vendas/propostas"
}, headers=headers)

if res_wa.status_code in [200, 201]:
    print(f"✅ WhatsApp Notification Triggered successfully: {res_wa.status_code} \n{res_wa.text}")
else:
    print(f"❌ Failed to trigger WhatsApp on {wa_url}: {res_wa.status_code} \n{res_wa.text}")
