import requests

try:
    print("=== OPTIONS /api/v1/auth/login ===")
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
    }
    res = requests.options("https://inho-api.orbesystems.com.br/api/v1/auth/login", headers=headers)
    print("STATUS:", res.status_code)
    print("HEADERS:")
    for k, v in res.headers.items():
        print(f"  {k}: {v}")
    print("BODY:", res.text)
    
except Exception as e:
    print("ERROR:", e)
