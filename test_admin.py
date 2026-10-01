import requests

json_payload = {
  "email": "rafael@orbesystems.com.br",
  "password": "Muhammadalivsroyjonesjr#Ju.130798"
}
try:
    print("Testing MASTER login...")
    r = requests.post("https://inho-api.orbesystems.com.br/api/v1/auth/login", json=json_payload)
    print("STATUS:", r.status_code)
    print("RESPONSE:", r.text)
except Exception as e:
    print(e)
