import json
import requests
import os

def extract():
    res = requests.get("https://inho-api.orbesystems.com.br/api/v1/openapi.json")
    artifact_dir = r"C:\Users\rafae\.gemini\antigravity\brain\6db035a1-fe56-4fa5-ab6e-d6b1c1f66009"
    out_path = os.path.join(artifact_dir, "openapi_contract.json")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(res.json(), f, indent=2)
        
    print("Contract generated!")

if __name__ == "__main__":
    extract()
