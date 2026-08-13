"""
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
    if settings.APP_ENV == "production":
        # Producao: verificacao completa de certificado
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
    else:
        # Dev/staging: aceita cert auto-assinado do Supabase pooler
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return ctx


_ssl_ctx = _build_ssl_context()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args={"ssl": _ssl_ctx},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
