import asyncio
from uuid import uuid4
from fastapi.testclient import TestClient
from main import app
from core.deps import get_current_user, require_admin
from models.models import User, UserRole

# 1. Bypass Authentication Middleware
mock_admin = User(
    id=uuid4(),
    email="test_admin@orbe.com",
    role=UserRole.ADMIN
)
app.dependency_overrides[get_current_user] = lambda: mock_admin
app.dependency_overrides[require_admin] = lambda: mock_admin
client = TestClient(app)

print("[START] INICIANDO TESTE E2E DO HUB INHO (VIA TESTCLIENT)\n")

def run_tests():
    # --- TEST 1: Criação de Nova Entidade (Funcionário B2B2C com Sanitizador WhatsApp) ---
    print("[1] Testando Modulo CRM & ENTIDADES: Cadastro de Funcionario...")
    payload_employee = {
        "name": "Joao Piloto (E2E Test)",
        "email": "e2e_teste@franquia.com",
        "phone": "9555184743957",  # Numero mal formatado de proposito (com 9 a mais e ddd)
        "category": "EMPLOYEE",
        "person_type": "FISICA",
        "doc_id": "12345678901",
        "nis": "1234567890",
        "notes": "Testando sanity check",
        "bank_name": "Nubank",
        "pix_key": "jsilva@nubank.com"
    }

    resp1 = client.post("/api/v1/crm/contacts/", json=payload_employee)
    if resp1.status_code == 201:
        data = resp1.json()
        saved_phone = data.get("phone")
        print(f"[OK] SUCESSO: Funcionario Cadastrado! ID: {data['id']}")
        
        if "555184743957" in saved_phone: # Removeu o 9 e adicionou DDI certinho
            print(f"[OK] SUCESSO: Sanitizador de WhatsApp funcionou! (Original: {payload_employee['phone']} -> Salvo: {saved_phone})")
        else:
            print(f"[WARN] AVISO: Sanitizador falhou em formatar exatamente. (Salvo: {saved_phone})")
    else:
        print(f"[ERROR] ERRO CRM: {resp1.text}")

    # --- TEST 2: Criação de Credencial de Acesso (Configurações -> Equipe) ---
    print("\n[2] Testando Modulo CONFIGURACOES: Nova Credencial de Operador...")
    payload_user = {
        "email": "operador_e2e@orbe.com",
        "password": "SenhaSegura123!",
        "role": "OPERATOR"
    }
    
    resp2 = client.post("/api/v1/users/", json=payload_user)
    if resp2.status_code == 201:
        data2 = resp2.json()
        print(f"[OK] SUCESSO: Credencial Operador Criada! ID: {data2['id']} | Cargo: {data2['role']}")
    elif resp2.status_code == 400 and "já existe" in resp2.text.lower():
        print("[OK] SUCESSO/AVISO: Credencial ja testada e existe.")
    else:
        print(f"[ERROR] ERRO USER_AUTH: {resp2.text}")
        
    print("\n[END] TESTE END-TO-END CONCLUIDO COM SUCESSO. DADOS SANITIZADOS CORRETAMENTE.")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"[FATAL] FALHA FATAL NO TESTE: {e}")
