from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GITHUB_TOKEN: str = "token_de_fallback_inseguro"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,https://orbesystems.com.br,https://www.orbesystems.com.br"
    
    # Critical credentials — NO defaults. Pydantic raises ValidationError on startup
    # if these are missing from .env / environment, preventing insecure boot.
    SECRET_KEY: str
    ADMIN_PASSWORD_HASH: str
    ADMIN_USERNAME: str = "rafael_admin"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Cloudinary Uplink (Permanent Storage)
    CLOUDINARY_URL: str = ""
    CLOUDINARY_CLOUD_NAME: str = "doxx9wyvw"
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── Stripe Payment Gateway ─────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""           # sk_live_... or sk_test_...
    STRIPE_WEBHOOK_SECRET: str = ""       # whsec_...
    STRIPE_PREMIUM_PRICE_ID: str = ""     # price_... (ID do produto Premium)

    def validate_stripe_config(self) -> None:
        """Valida se as configurações do Stripe estão presentes."""
        if self.STRIPE_SECRET_KEY and not self.STRIPE_SECRET_KEY.startswith("sk_"):
            raise ValueError("STRIPE_SECRET_KEY deve começar com 'sk_'")
        if self.STRIPE_WEBHOOK_SECRET and not self.STRIPE_WEBHOOK_SECRET.startswith("whsec_"):
            raise ValueError("STRIPE_WEBHOOK_SECRET deve começar com 'whsec_'")
        if self.STRIPE_PREMIUM_PRICE_ID and not self.STRIPE_PREMIUM_PRICE_ID.startswith("price_"):
            raise ValueError("STRIPE_PREMIUM_PRICE_ID deve começar com 'price_'")

    def validate_all(self) -> None:
        """Valida todas as configurações críticas no startup."""
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY é obrigatório")
        if not self.ADMIN_PASSWORD_HASH:
            raise ValueError("ADMIN_PASSWORD_HASH é obrigatório")
        
        # Validar Stripe se configurado
        if self.STRIPE_SECRET_KEY or self.STRIPE_WEBHOOK_SECRET or self.STRIPE_PREMIUM_PRICE_ID:
            self.validate_stripe_config()

    # ── Frontend URL (used in Stripe redirect URLs) ────────────────────────────
    FRONTEND_URL: str = "https://orbesystems.com.br".rstrip("/")

    # Persistence
    DATABASE_URL: str = "sqlite:///./data/projects.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
