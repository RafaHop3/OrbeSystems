import urllib.request, urllib.error
req = urllib.request.Request("https://inho-api.orbesystems.com.br/api/v1/auth/login", method="OPTIONS", headers={"Origin": "https://inho.orbesystems.com.br", "Access-Control-Request-Method": "POST"})
try:
    res = urllib.request.urlopen(req)
    print("OK:", res.status)
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("LOCATION_REPR:", repr(e.headers.get("Location")))
except Exception as e:
    print("Error:", e)
