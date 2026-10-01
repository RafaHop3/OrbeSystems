import requests
import json

print("1. Authenticating as Master to trigger Bot...")
login_res = requests.post("https://inho-api.orbesystems.com.br/api/v1/auth/login", json={
    "email": "rafael@orbesystems.com.br",
    "password": "Muhammadalivsroyjonesjr#Ju.130798"
})

if login_res.status_code == 200:
    token = login_res.json()["access_token"]
    print("Token Captured! Firing Bot Payload...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    wa_payload = {
        "phone": "5551984743957",
        "message": "🚀 Olá Juliana! Este é o disparo nativo automatizado da INHO através da malha Baileys (AWS Node.js). Produção 100% estável e alinhada com as contas Mestre/Operador!"
    }
    
    wa_res = requests.post("https://inho-api.orbesystems.com.br/api/v1/crm/whatsapp/send", json=wa_payload, headers=headers)
    print("WHATSAPP NODE STATUS:", wa_res.status_code)
    print("WHATSAPP NODE TRACE:", wa_res.text)
else:
    print("Auth Failed:", login_res.status_code, login_res.text)
