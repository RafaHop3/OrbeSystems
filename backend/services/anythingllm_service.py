import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)

class AnythingLLMService:
    """
    Serviço para gerenciar recursos e workspaces no AnythingLLM via API REST.
    """
    def __init__(self):
        self.api_url = settings.ANYTHINGLLM_API_URL.rstrip("/")
        self.api_key = settings.ANYTHINGLLM_API_KEY
        
    @property
    def headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def provision_user_workspace(self, user_id: str, email: str) -> bool:
        """
        Cria um workspace exclusivo e isolado para o usuário Premium.
        O nome do workspace segue o padrão: orbe-ws-{user_id}
        """
        if not self.api_key:
            logger.warning("[AnythingLLM] Chave de API não configurada. Pulando provisionamento de workspace.")
            return False

        workspace_name = f"orbe-ws-{user_id}"
        url = f"{self.api_url}/workspace/new"

        logger.info(f"[AnythingLLM] Solicitando criação de workspace '{workspace_name}' para {email}...")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    json={"name": workspace_name},
                    headers=self.headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    logger.info(f"[AnythingLLM] Workspace '{workspace_name}' criado com sucesso para {email}.")
                    return True
                
                # Tratar caso de já existir ou outros erros de validação
                response_data = response.json() if "application/json" in response.headers.get("content-type", "") else response.text
                logger.error(
                    f"[AnythingLLM] Falha ao criar workspace. Status: {response.status_code} | Resposta: {response_data}"
                )
            except httpx.RequestError as exc:
                logger.error(f"[AnythingLLM] Erro de rede ao conectar com AnythingLLM: {exc}")
            except Exception as e:
                logger.error(f"[AnythingLLM] Erro inesperado no provisionamento: {e}")
        
        return False


# Singleton do serviço para ser importado em toda a aplicação
anythingllm_service = AnythingLLMService()
