"""
dynamodb_service.py — CRUD para histórico de conversas da IA
Tabela: orbe_ai_conversations
  PK: UserID (String)
  SK: Timestamp (ISO8601)
  TTL: expires_at (Unix epoch + 90 dias)
"""
import time
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from config import settings

logger = logging.getLogger(__name__)

# TTL de 90 dias para conformidade com LGPD / política de retenção
CONVERSATION_TTL_DAYS = 90
TABLE_NAME = "orbe_ai_conversations"


def _get_dynamodb_resource():
    """Inicializa o recurso DynamoDB (autenticação via IRSA — sem credenciais fixas)."""
    return boto3.resource(
        "dynamodb",
        region_name=settings.AWS_REGION,
        # Sem aws_access_key_id / aws_secret_access_key — usa IRSA automaticamente
    )


def _get_table():
    """Retorna a referência à tabela DynamoDB."""
    return _get_dynamodb_resource().Table(TABLE_NAME)


def _compute_expires_at() -> int:
    """Calcula o Unix timestamp de expiração (agora + 90 dias) para o TTL do DynamoDB."""
    return int(time.time()) + (CONVERSATION_TTL_DAYS * 24 * 3600)


async def save_conversation(
    user_id: str,
    prompt: str,
    ai_response: str,
    ip_address: str,
    model: str = "gemini-2.0-flash",
) -> Optional[str]:
    """
    Persiste uma conversa com a IA no DynamoDB.

    Returns:
        ID da conversa criada, ou None em caso de erro.
    """
    conversation_id = str(uuid.uuid4())
    timestamp = datetime.now(tz=timezone.utc).isoformat()

    item = {
        "UserID": user_id,
        "Timestamp": timestamp,
        "conversation_id": conversation_id,
        "ip_address": ip_address,
        "prompt": prompt,
        "ai_response": ai_response,
        "model": model,
        "expires_at": _compute_expires_at(),  # TTL do DynamoDB
    }

    try:
        table = _get_table()
        table.put_item(Item=item)
        logger.info(f"[DynamoDB] Conversa {conversation_id} salva para user_id={user_id}")
        return conversation_id
    except ClientError as e:
        logger.error(f"[DynamoDB] Falha ao salvar conversa para user_id={user_id}: {e.response['Error']['Message']}")
        return None


async def get_user_history(
    user_id: str,
    limit: int = 20,
    last_evaluated_key: Optional[dict] = None,
) -> dict:
    """
    Retorna o histórico de conversas de um usuário (paginação suportada).

    Args:
        user_id: ID do usuário (PK da tabela)
        limit: Número máximo de itens por página
        last_evaluated_key: Token de paginação do request anterior

    Returns:
        dict com 'items' e 'last_key' (None se não houver mais páginas)
    """
    try:
        table = _get_table()

        query_kwargs = {
            "KeyConditionExpression": "UserID = :uid",
            "ExpressionAttributeValues": {":uid": user_id},
            "Limit": limit,
            "ScanIndexForward": False,  # Ordem decrescente (mais recente primeiro)
            "ProjectionExpression": "Timestamp, conversation_id, prompt, ai_response, model, ip_address",
        }

        if last_evaluated_key:
            query_kwargs["ExclusiveStartKey"] = last_evaluated_key

        response = table.query(**query_kwargs)

        return {
            "items": response.get("Items", []),
            "last_key": response.get("LastEvaluatedKey"),  # None se última página
            "count": response.get("Count", 0),
        }
    except ClientError as e:
        logger.error(f"[DynamoDB] Falha ao buscar histórico para user_id={user_id}: {e.response['Error']['Message']}")
        return {"items": [], "last_key": None, "count": 0}


async def delete_user_history(user_id: str) -> bool:
    """
    Remove TODOS os registros de um usuário (direito ao esquecimento — LGPD Art. 18).

    Returns:
        True se a operação foi bem-sucedida.
    """
    try:
        table = _get_table()

        # Buscar todos os registros do usuário (sem limit para deletar tudo)
        response = table.query(
            KeyConditionExpression="UserID = :uid",
            ExpressionAttributeValues={":uid": user_id},
            ProjectionExpression="UserID, Timestamp",
        )

        items = response.get("Items", [])
        deleted_count = 0

        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(
                    Key={
                        "UserID": item["UserID"],
                        "Timestamp": item["Timestamp"],
                    }
                )
                deleted_count += 1

        logger.info(f"[DynamoDB] {deleted_count} conversas deletadas para user_id={user_id} (LGPD)")
        return True
    except ClientError as e:
        logger.error(f"[DynamoDB] Falha ao deletar histórico de user_id={user_id}: {e.response['Error']['Message']}")
        return False
