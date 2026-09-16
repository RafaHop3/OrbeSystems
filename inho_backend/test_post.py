from fastapi.testclient import TestClient
from main import app
import json
import traceback

with TestClient(app) as client:
    try:
        payload = {
            "name": "Empresa API Live",
            "document": "55555555000199",
        }
        res = client.post("/api/v1/crm/cooperados/", json=payload, headers={"Authorization": "Bearer dev-bypass"})
        with open("post_err.txt", "w") as f:
            f.write(f"Status: {res.status_code}\nBody: {res.text}")
    except Exception as e:
        with open("post_err.txt", "w") as f:
            traceback.print_exc(file=f)
