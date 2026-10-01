import requests

print("--- Testing INHO Production API ---")
try:
    # 1. Health check to understand DB connection
    r1 = requests.get("https://inho-api.orbesystems.com.br/api/v1/health")
    print("Health Status:", r1.status_code)
    print("Health JSON:", r1.text)

    # 2. Login check
    json_payload = {
      "email": "qa1@orbesystems.com.br",
      "password": "Password@2026INHO!"
    }
    r2 = requests.post("https://inho-api.orbesystems.com.br/api/v1/auth/login", json=json_payload)
    print("Login Status:", r2.status_code)
    print("Login JSON:", r2.text)
except Exception as e:
    print(e)
