import urllib.request
import json
import ssl

url = "https://inho-api.orbesystems.com.br/api/v1/auth/register"
data = {
    "email": "test_colab@orbe.com",
    "full_name": "Tester INHO",
    "password": "SecurePass123!"
}

req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={"Content-Type": "application/json"}, method="POST")

try:
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx) as response:
        print(f"Success ({response.getcode()}):", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error ({e.getcode()}):", e.read().decode())
except Exception as e:
    print("Other error:", str(e))
