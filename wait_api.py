import time, urllib.request
print("Waiting for AWS docker start...")
for i in range(15):
    try:
        req = urllib.request.urlopen("https://api.orbesystems.com.br/health", timeout=5)
        print("API IS ONLINE! Status:", req.getcode())
        break
    except Exception as e:
        print(f"Waiting... ({i}/15)", e)
        time.sleep(10)
