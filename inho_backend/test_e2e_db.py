import sys
import os
from fastapi.testclient import TestClient

# Adicionando o PATH para importar módulos do backend
sys.path.append(os.path.join(os.path.dirname(__file__)))

from main import app
from dependencies import get_current_user
from models.models import User

# Mocking the dependency to bypass JWT 401
def mock_get_current_user():
    return User(id="mock-user-123", email="bot@test.com", tenant_id="tenant-123", role="ADMIN")
app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

# Executando um POST no endpoint protegido
payload = {
    "name": "Cliente de Teste Consistency DB",
    "email": "test@aws.com",
    "category": "CUSTOMER",
    "phone": "5551984743957",  # Numero problemático (Maldito Nono Dígito)
    "person_type": "PESSOA_JURIDICA",
    "municipal_registration": "123456",
    "address": "Rua do Teste B2B2C",
    "is_active": True
}

# Realizar o POST (A rota está prefixada como /api/v1 no app.include_router)
response = client.post("/api/v1/crm/contacts/", json=payload)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")

# Checando o formato do Telefone persistido:
if response.status_code == 200:
    res_data = response.json()
    if res_data.get('phone') == '555184743957':
        print("\n✅ SUCESSO E2E: O Sanitizador de WhatsApp decapitou o Nono Dígito com sucesso (12 digitos)! O Bot do Zap poderá enviar!")
    else:
        print(f"\n❌ FALHA B2B: O número não foi sanitizado corretamente. Recebido: {res_data.get('phone')}")
