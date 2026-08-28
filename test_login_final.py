import requests

try:
    print("Testing FINAL JSON POST to /auth/login")
    headers = {"Origin": "http://localhost:3000"}  # Trigger CORS
    res = requests.post(
        "https://inho-api.orbesystems.com.br/api/v1/auth/login",
        json={"email": "robo_tester_csp@inho.com", "password": "TestOrbe2026@"},
        headers=headers
    )
    print("STATUS:", res.status_code)
    print("HEADERS:")
    for k, v in res.headers.items():
        print(f"  {k}: {v}")
    print("BODY:", res.text)
except Exception as e:
    print("ERROR:", e)
