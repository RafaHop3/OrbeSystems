import requests

try:
    print("Testing POST to /auth/login")
    res = requests.post("https://inho-api.orbesystems.com.br/api/v1/auth/login", data={"username": "robo_tester_csp@inho.com", "password": "TestOrbe2026@"})
    print("STATUS:", res.status_code)
    print("BODY:", res.text)
except Exception as e:
    print("ERROR:", e)
