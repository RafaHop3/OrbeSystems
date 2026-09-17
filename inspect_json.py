import json

with open(r"C:\Users\rafae\OrbeSystems\OrbeSystems\brand-orbs.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    print(item["path"])
