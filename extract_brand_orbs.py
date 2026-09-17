import json, os

with open(r"C:\Users\rafae\OrbeSystems\OrbeSystems\brand-orbs.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data.get("files", []):
    path = os.path.join(r"C:\Users\rafae\OrbeSystems\OrbeSystems\frontend", item["path"])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as out:
        out.write(item["code"])
    print(f"Extracted: {path}")
