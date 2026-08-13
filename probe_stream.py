import requests

url = "https://api.orbesystems.com.br/api/optout/stream"
try:
    print(f"GET {url}")
    r = requests.get(url)
    print("STATUS:", r.status_code)
    print("BODY:", r.text[:200])
except Exception as e:
    print(e)
