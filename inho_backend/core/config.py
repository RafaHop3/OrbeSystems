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
    INHO_SYSTEM_SECRET: str = ""

    # ── Database (PostgreSQL) ────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://inho_user:inho_pass@localhost:5432/inho_db"
    SCHEMA: str = "inho"

    # ── CORS ────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://inho.orbesystems.com.br",
        "https://www.orbesystems.com.br"
    ]

    # ── Rate Limiting ────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10   # stricter for auth routes

    # ── Admin Superuser Bypass ──────────────────────────────────
    ADMIN_USERNAME: str = ""
    ADMIN_PASSWORD_HASH: str = ""

    # ── Stripe & Novos Planos (05/11/2026) ──────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID_ESSENCIAL: str = ""
    STRIPE_PRICE_ID_PRO_IA: str = ""
    STRIPE_PRICE_ID_COOPERATIVA_OURO: str = ""

    # ── Keep-Alive (Render) ──────────────────────────────────────
    SELF_URL: str = "http://localhost:8000/health"
    KEEP_ALIVE_ENABLED: bool = False       # enable only in production

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


# ── Catálogo de Planos e Franquias (Novos Planos 05/11/2026) ───────────
PLAN_CATALOG = {
    "INHO_ESSENCIAL": {
        "tier": "INHO_ESSENCIAL",
        "name": "INHO Essencial (PME & Serviços)",
        "badge": "PME & SERVIÇOS",
        "monthly_price_cents": 29000,
        "annual_price_cents": 290000,
        "max_operators": 3,
        "ai_rag_enabled": False,
        "cbm_predictive_enabled": False,
        "cooperativa_module_enabled": False,
        "monthly_ai_quota": 500,
        "description": "PDV, Pedidos 1-Click, Contratos, Boletos/PIX, NFS-e, DRE Caixa/Competência, Lacre SHA-256 e Central WhatsApp básica.",
    },
    "INHO_PRO_IA": {
        "tier": "INHO_PRO_IA",
        "name": "INHO Pro + OrBrick-IA (CBM & RAG)",
        "badge": "MAIS POPULAR",
        "monthly_price_cents": 59000,
        "annual_price_cents": 590000,
        "max_operators": 8,
        "ai_rag_enabled": True,
        "cbm_predictive_enabled": True,
        "cooperativa_module_enabled": False,
        "monthly_ai_quota": 2500,
        "description": "Core completo + Alçada Dual-Control, OrBrick-IA Ativa, RAG Multi-Tenant (até 25 diretrizes/chunks PDF/DOCX), CBM Preditivo e RFM.",
    },
    "INHO_COOPERATIVA_OURO": {
        "tier": "INHO_COOPERATIVA_OURO",
        "name": "INHO Cooperativa & Enterprise (Padrão Ouro)",
        "badge": "PADRÃO EXECUTIVO OURO",
        "monthly_price_cents": 99000,
        "annual_price_cents": 990000,
        "max_operators": 25,
        "ai_rag_enabled": True,
        "cbm_predictive_enabled": True,
        "cooperativa_module_enabled": True,
        "monthly_ai_quota": 5000,
        "description": "Padrão Ouro Institucional: Módulo Cooperativismo completo (Quadro Social, Cotas-Partes, Retenções INSS/IRRF, Open Finance Sicoob/Sicredi), RAG Ilimitado, CBM Sócios VIP e Guardrail Zero-Trust.",
    },
}
