import urllib.request, urllib.error, json

url = "https://inho-api.orbesystems.com.br/api/v1/auth/login"
data = json.dumps({"email": "rafael@orbesystems.com.br", "password": "SenhaFalsa123!", "domain": ""}).encode("utf-8")
req = urllib.request.Request(
    url,
    data=data,
    method="POST",
    headers={
        "Origin": "https://inho.orbesystems.com.br",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
)

try:
    res = urllib.request.urlopen(req)
    print("OK:", res.status)
    print(dict(res.headers))
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("HEADERS:", dict(e.headers))
    body = e.read().decode()
    print("BODY:", body)
except Exception as e:
    print("ERROR:", e)
