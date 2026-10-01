import requests

json_payload = {
  "email": "qa2@orbesystems.com.br",
  "password": "Password@2026INHO!"
}
try:
    print("Testing QA2 login...")
    r = requests.post("https://inho-api.orbesystems.com.br/api/v1/auth/login", json=json_payload)
    print("STATUS:", r.status_code)
    print("RESPONSE:", r.text)
except Exception as e:
    print(e)
