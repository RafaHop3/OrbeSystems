from fastapi.testclient import TestClient
import sys
import os

# Adiciona o diretório backend ao PYTHONPATH para conseguir importar o app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from security.auth import get_current_admin_user
import io

# Mock da dependência de autenticação para focar apenas no teste de payload
app.dependency_overrides[get_current_admin_user] = lambda: "rafael_admin"

client = TestClient(app)

def test_upload_rejeita_arquivo_gigante():
    payload_gigante = io.BytesIO(b"0" * (6 * 1024 * 1024))
    
    response = client.post(
        "/api/admin/upload",
        files={"file": ("large_image.jpg", payload_gigante, "image/jpeg")}
    )
    
    if response.status_code == 413:
        print("✅ Sucesso: Arquivo gigante barrado (413 Payload Too Large).")
    else:
        print(f"❌ Falha: Arquivo passou ou gerou erro inesperado. Status: {response.status_code} - {response.text}")

def test_upload_rejeita_mime_invalido():
    payload_malicioso = io.BytesIO(b"import os\nos.system('rm -rf /')")
    
    response = client.post(
        "/api/admin/upload",
        files={"file": ("script.py", payload_malicioso, "text/x-python")}
    )
    
    if response.status_code == 415:
        print("✅ Sucesso: Formato inválido barrado (415 Unsupported Media Type).")
    else:
        print(f"❌ Falha: Formato não suportado passou. Status: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("--- Iniciando testes de estresse no Upload ---")
    test_upload_rejeita_arquivo_gigante()
    test_upload_rejeita_mime_invalido()
