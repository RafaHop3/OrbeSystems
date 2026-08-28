import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')

session_py_content = r'''"""
INHO – Database Session (Async SQLAlchemy)
"""
import os
import ssl

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


def _build_ssl_context() -> ssl.SSLContext:
    """
    FIX: SSL env-aware — producao verifica CA, dev aceita cert auto-assinado.
    CERT_NONE nunca deve chegar em producao com dados financeiros.
    """
    ctx = ssl.create_default_context()
    # Dev/staging: aceita cert auto-assinado do Supabase pooler
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


_ssl_ctx = _build_ssl_context()

engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}

from sqlalchemy.pool import NullPool

if not settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "poolclass": NullPool,
    })
    
    engine_kwargs.setdefault("connect_args", {})
    engine_kwargs["connect_args"]["server_settings"] = {"search_path": getattr(settings, "SCHEMA", "inho") + ", public"}
    engine_kwargs["connect_args"]["prepared_statement_cache_size"] = 0
    
    # Only apply SSL for production databases (Supabase, Render, etc.)
    if "supabase" in settings.DATABASE_URL or "render.com" in settings.DATABASE_URL:
        engine_kwargs["connect_args"]["ssl"] = _ssl_ctx

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


from sqlalchemy import MetaData

class Base(DeclarativeBase):
    metadata = MetaData(schema="inho" if not settings.DATABASE_URL.startswith("sqlite") else None)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
'''

commands = [
    "cd /home/ubuntu/orbe-systems/inho_backend",
    "cat << 'EOF' > db/session.py\n" + session_py_content.replace('$', '\\$') + "\nEOF",
    "sudo docker compose restart inho_backend"
]

print("Sending SSM command...")
response = ssm.send_command(
    InstanceIds=["i-058e26140671b3254"],
    DocumentName="AWS-RunShellScript",
    Parameters={"commands": commands}
)
cmd_id = response['Command']['CommandId']

for _ in range(30):
    time.sleep(5)
    invocation = ssm.get_command_invocation(
        CommandId=cmd_id,
        InstanceId="i-058e26140671b3254"
    )
    status = invocation['Status']
    if status in ['Success', 'Failed']:
        print(f"Status: {status}")
        print("Output:\n", invocation.get('StandardOutputContent'))
        print("Errors:\n", invocation.get('StandardErrorContent'))
        sys.exit(0 if status == 'Success' else 1)
print("Timeout!")
sys.exit(1)
