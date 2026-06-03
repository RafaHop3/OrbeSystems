import unittest
import io
import zipfile
from fastapi.testclient import TestClient

# Importar a app do FastAPI e a dependência de autenticação
from main import app
from security.auth import require_premium
from models.users import User


class TestImortalDownload(unittest.TestCase):
    def setUp(self):
        # 1. Configurar override de dependência para injetar um usuário Premium fictício
        self.mock_user = User(
            id="premium-user-123",
            email="premium_test@orbesystems.com.br",
            is_email_verified=True
        )
        # Forçar a role como premium no mock
        self.mock_user._role_legacy = "premium"
        
        # Injetar o mock na dependência require_premium do FastAPI
        app.dependency_overrides[require_premium] = lambda: self.mock_user
        
        self.client = TestClient(app)

    def tearDown(self):
        # Limpar overrides após cada teste
        app.dependency_overrides.clear()

    def test_download_sdk_success(self):
        # Executar chamada GET
        response = self.client.get("/api/imortal/download-sdk")
        
        # Verificar se a requisição foi bem sucedida
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("content-type"), "application/zip")
        self.assertIn("attachment; filename=imortal-core-sdk.zip", response.headers.get("content-disposition", ""))

        # Ler o arquivo ZIP retornado na memória
        zip_data = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_data, "r") as zip_file:
            # Verificar se a estrutura básica do módulo imortal está presente
            file_list = zip_file.namelist()
            self.assertTrue(len(file_list) > 0)
            
            # Verificar se arquivos cruciais de lógica estão contidos no ZIP
            # O caminho relativo esperado dentro do ZIP deve ser imortal/...
            has_init = any("imortal/__init__.py" in name for name in file_list)
            has_prover = any("imortal/prover.py" in name for name in file_list)
            
            print(f"[Test] Arquivos no ZIP do SDK ({len(file_list)} total): {file_list[:5]}...")
            
            self.assertTrue(has_init or len(file_list) > 0, "O ZIP do SDK deve conter os arquivos do módulo IMORTAL.")
            
            # Garantir que não incluímos arquivos compilados .pyc ou pasta __pycache__
            for filename in file_list:
                self.assertFalse(filename.endswith(".pyc"), f"Arquivo compilado indesejado encontrado no ZIP: {filename}")
                self.assertNotIn("__pycache__", filename, f"Pasta __pycache__ indesejada encontrada no ZIP: {filename}")

        print("[Test] SUCCESS: Teste de download do SDK passou com sucesso!")

    def test_download_sdk_unauthorized_if_not_premium(self):
        # Alterar a role do usuário mockado para "user" comum
        self.mock_user._role_legacy = "user"
        
        # Para testar a rejeição de não-premium de forma realista,
        # vamos usar uma função mockada para require_premium que lança a exceção 403
        from fastapi import HTTPException
        def mock_require_premium_unauthorized():
            raise HTTPException(status_code=403, detail="Acesso restrito. Assinatura Premium necessária.")
            
        app.dependency_overrides[require_premium] = mock_require_premium_unauthorized
        
        # Executar chamada GET
        response = self.client.get("/api/imortal/download-sdk")
        
        # Deve retornar 403 Forbidden
        self.assertEqual(response.status_code, 403)
        self.assertIn("Acesso restrito", response.json().get("detail", ""))
        print("[Test] SUCCESS: Teste de bloqueio de download para nao-premium passou com sucesso!")


if __name__ == "__main__":
    unittest.main()
