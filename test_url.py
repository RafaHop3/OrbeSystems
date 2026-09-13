import urllib.request
req = urllib.request.Request("https://inho-api.orbesystems.com.br/api/v1/auth/login", method="POST", headers={"User-Agent": "Mozilla/5.0"})
try:
    urllib.request.urlopen(req)
except Exception as e:
    print(getattr(e, 'code', 'No Code'))
    print(getattr(e, 'headers', {}).get('Location'))
