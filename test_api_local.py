import requests

try:
    print("Testing OPTIONS")
    headers = {"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"}
    res = requests.options("https://inho-api.orbesystems.com.br/api/v1/auth/login", headers=headers)
    print("STATUS:", res.status_code)
    print("HEADERS:", res.headers)
    print("BODY:", res.text)
    
    print("\Testing GET Health")
    res = requests.get("https://inho-api.orbesystems.com.br/health")
    print("STATUS:", res.status_code)
    print("HEADERS:", res.headers)
    print("BODY:", res.text)
except Exception as e:
    print("ERROR:", e)
