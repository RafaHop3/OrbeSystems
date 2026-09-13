import urllib.request, urllib.error
req = urllib.request.Request(
    "http://52.20.22.241/api/v1/auth/login",
    method="OPTIONS",
    headers={"Origin": "https://inho.orbesystems.com.br", "Access-Control-Request-Method": "POST", "Host": "inho-api.orbesystems.com.br"}
)
try:
    res = urllib.request.urlopen(req)
    print("OK:", res.status)
    print(dict(res.headers))
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("HEADERS:", dict(e.headers))
except Exception as e:
    print("ERROR:", e)
