"""
INHO – Core Configuration
Carrega variáveis de ambiente com Pydantic-Settings.
"""
from pydantic_settings import BaseSettings
from pydantic import AnyUrl, field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ─────────────────────────────────────────────────────
    APP_NAME: str = "INHO – Gestão Financeira e Impacto Social"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"           # development | production
    DEBUG: bool = True

    # ── Security ────────────────────────────────────────────────
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database (PostgreSQL) ────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://inho_user:inho_pass@localhost:5432/inho_db"

    # ── CORS ────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]

    # ── Rate Limiting ────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10   # stricter for auth routes

    # ── Keep-Alive (Render) ──────────────────────────────────────
    SELF_URL: str = "http://localhost:8000/health"
    KEEP_ALIVE_ENABLED: bool = False       # enable only in production

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
