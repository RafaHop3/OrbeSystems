import requests

res = requests.get("https://inho-api.orbesystems.com.br/api/v1/crm/whatsapp-qr")
print("STATUS:", res.status_code)
print("BODY:")
print(res.text[:1000])
