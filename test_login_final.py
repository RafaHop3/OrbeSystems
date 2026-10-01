import requests

json_payload = {
  "email": "qa1@orbesystems.com.br",
  "password": "Password@2026INHO!"
}
try:
    print("Sending POST /api/v1/auth/login to Live API...")
    r = requests.post("https://inho-api.orbesystems.com.br/api/v1/auth/login", json=json_payload)
    print("STATUS:", r.status_code)
    print("RESPONSE:", r.text)
except Exception as e:
    print(e)
