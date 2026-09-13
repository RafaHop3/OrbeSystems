import urllib.request, urllib.error, json, time

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

print("Waiting for deployment to apply and 500 errors to cease...")
while True:
    try:
        res = urllib.request.urlopen(req)
        print("OK STRANGELY:", res.status)
        break
    except urllib.error.HTTPError as e:
        if e.code == 500:
            print("Still 500 Internal Server error... Waiting 5s")
            time.sleep(5)
        elif e.code == 401 or e.code == 403:
            print("SUCCESS! Endpoint returned expected Auth rejection!", e.code)
            print("HEADERS:", dict(e.headers))
            break
        elif e.code == 502 or e.code == 521:
            print("Container is restarting (502/521)... Waiting 5s")
            time.sleep(5)
        else:
            print("OTHER STATUS:", e.code)
            break
    except Exception as e:
        print("ERROR:", e)
        time.sleep(5)
