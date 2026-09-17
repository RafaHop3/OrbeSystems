import json, os, urllib.request

url = "https://threeui.com/source-code/brand-orbs.json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        
    for k, v in data.items():
        if isinstance(v, dict) and "content" in v:
            path = os.path.join(r"C:\Users\rafae\OrbeSystems\OrbeSystems\frontend", k)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(v["content"])
            print(f"Written: {path}")
except Exception as e:
    print("Error:", e)
