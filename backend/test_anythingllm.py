import asyncio
import unittest
from unittest.mock import AsyncMock, patch
import httpx

# Configurar logs para exibição no console durante o teste
import logging
logging.basicConfig(level=logging.INFO)

# Importar o serviço do AnythingLLM
from services.anythingllm_service import anythingllm_service
from config import settings


class TestAnythingLLMService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Garantir que temos chaves nos settings de teste
        self.original_url = settings.ANYTHINGLLM_API_URL
        self.original_key = settings.ANYTHINGLLM_API_KEY
        
        settings.ANYTHINGLLM_API_URL = "http://localhost:3001/api/v1"
        settings.ANYTHINGLLM_API_KEY = "test_secret_key"
        
        # Reinicializar o serviço com as configurações injetadas
        anythingllm_service.api_url = settings.ANYTHINGLLM_API_URL
        anythingllm_service.api_key = settings.ANYTHINGLLM_API_KEY

    def tearDown(self):
        settings.ANYTHINGLLM_API_URL = self.original_url
        settings.ANYTHINGLLM_API_KEY = self.original_key
        anythingllm_service.api_url = self.original_url.rstrip("/")
        anythingllm_service.api_key = self.original_key

    @patch("httpx.AsyncClient.post")
    async def test_provision_workspace_success(self, mock_post):
        # Configurar mock para simular sucesso (200 OK)
        mock_response = httpx.Response(
            status_code=200,
            json={"status": "success", "workspace": {"name": "orbe-ws-user123"}}
        )
        mock_post.return_value = mock_response

        # Executar a chamada
        result = await anythingllm_service.provision_user_workspace("user123", "user@example.com")

        # Verificar se retornou sucesso
        self.assertTrue(result)

        # Verificar argumentos da chamada HTTP
        mock_post.assert_called_once_with(
            "http://localhost:3001/api/v1/workspace/new",
            json={"name": "orbe-ws-user123"},
            headers={
                "Authorization": "Bearer test_secret_key",
                "Content-Type": "application/json"
            },
            timeout=10.0
        )

    @patch("httpx.AsyncClient.post")
    async def test_provision_workspace_failure(self, mock_post):
        # Configurar mock para simular erro da API (ex: 400 Bad Request)
        mock_response = httpx.Response(
            status_code=400,
            json={"message": "Workspace already exists"}
        )
        # Modificar os headers da resposta do mock para incluir o content-type correto
        mock_response.headers["content-type"] = "application/json"
        mock_post.return_value = mock_response

        # Executar a chamada
        result = await anythingllm_service.provision_user_workspace("user123", "user@example.com")

        # Deve retornar False em caso de erro da API
        self.assertFalse(result)

    @patch("httpx.AsyncClient.post")
    async def test_provision_workspace_network_error(self, mock_post):
        # Configurar mock para lançar uma exceção de rede
        mock_post.side_effect = httpx.RequestError("Connection refused")

        # Executar a chamada
        result = await anythingllm_service.provision_user_workspace("user123", "user@example.com")

        # Deve tratar a exceção e retornar False sem crashar
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
