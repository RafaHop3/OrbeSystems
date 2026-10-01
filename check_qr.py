import requests

res = requests.get("https://inho-api.orbesystems.com.br/api/v1/crm/whatsapp-qr")
if res.status_code == 200:
    print("QR Code endpoint is LIVE!")
else:
    print("Failed to reach QR Code proxy:", res.status_code, res.text)
