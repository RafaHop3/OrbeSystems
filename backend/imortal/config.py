"""
config.py — Configuração Central do Projeto IMORTAL
Todas as constantes configuráveis são lidas de variáveis de ambiente.
Copie .env.example para .env e ajuste os valores conforme seu ambiente.
"""
import os
import logging

# Carrega .env se python-dotenv estiver disponível (graceful fallback)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv opcional; variáveis de ambiente do sistema são suficientes

from config import settings

# ─── Modo de Operação ────────────────────────────────────────────────────────────
PRODUCTION_MODE: bool = os.getenv("PRODUCTION_MODE", "false").lower() == "true"

# ─── Servidor HTTP ────────────────────────────────────────────────────────────
PORT: int = int(os.getenv("PORT", os.getenv("IMORTAL_PORT", "8000")))
# Em produção: bind em 0.0.0.0 para aceitar conexões externas no container
HOST: str = os.getenv("IMORTAL_HOST", "0.0.0.0" if PRODUCTION_MODE else "127.0.0.1")

# CORS: em prod aceita qualquer origem; em dev só loopback
_default_origins = "*" if PRODUCTION_MODE else f"http://localhost:{PORT},http://127.0.0.1:{PORT}"
ALLOWED_ORIGINS: set = set(os.getenv("IMORTAL_ALLOWED_ORIGINS", _default_origins).split(","))

# Tamanho máximo do corpo de requisição HTTP (1 MB por padrão)
MAX_BODY_SIZE: int = int(os.getenv("IMORTAL_MAX_BODY_BYTES", str(1 * 1024 * 1024)))

# Máximo de requisições pesadas simultâneas (Z3 + Fuzzing)
MAX_CONCURRENT_PIPELINES: int = int(os.getenv("IMORTAL_MAX_CONCURRENT", "3"))

# ─── Motor de IA ────────────────────────────────────────────────────────────
# Google Gemini API (produção / cloud)
GEMINI_API_KEY: str = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = settings.GEMINI_MODEL or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Ollama local (desenvolvimento)
OLLAMA_URL: str = settings.OLLAMA_URL or os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
DEFAULT_MODEL: str = settings.IMORTAL_MODEL or os.getenv("IMORTAL_MODEL", "qwen2.5-coder:7b")
OLLAMA_TIMEOUT: float = float(os.getenv("OLLAMA_TIMEOUT", "4.0"))

# ─── Prova Formal Z3 ──────────────────────────────────────────────────────────
Z3_TIMEOUT_MS: int = settings.Z3_TIMEOUT_MS

# ─── Sandbox / Fuzzer ─────────────────────────────────────────────────────────
FUZZ_RUNS: int = settings.FUZZ_RUNS
FUZZ_LOOP_ITERATIONS: int = settings.FUZZ_LOOP_ITERATIONS

# ─── Saída de Arquivos ────────────────────────────────────────────────────────
OUTPUT_DIR: str = os.getenv("IMORTAL_OUTPUT_DIR", "output")

# ─── Logging ─────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("IMORTAL_LOG_LEVEL", "WARNING")
LOG_FILE: str = os.getenv("IMORTAL_LOG_FILE", "imortal.log")

def setup_logging() -> None:
    """Configura o sistema de logging global do IMORTAL."""
    level = getattr(logging, LOG_LEVEL.upper(), logging.WARNING)
    handlers: list = [logging.StreamHandler()]
    try:
        handlers.append(logging.FileHandler(LOG_FILE, encoding="utf-8"))
    except OSError:
        pass  # Se não conseguir criar o arquivo de log, usa só o terminal

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
        force=True,
    )

# ─── Licenciamento Assinatura ──────────────────────────────────────────────────
ORBE_PUBLIC_KEY: str = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt99bPAViCjs9WENKHhyH
8jgzWygODrxrdcBqKkaN155R6QmiajWby/1BPV//Zuz0w7A1Ka4XPOEPhhpHgwCj
t0eezJ6bOX3hXp1dMYYuXjlKNpQG7JCydkNKjMQnxMUCbRbj3RcYl29Ur1lxUK5o
7N3ywtwofJ8rERseDHlPdUZ/ksmY/Rh57YyPxADunpkACVVbM8NF+NJw9llyFqKV
aCA8rsvRPeTnpx4attdPLYGexwVQvYDtEEZxbfFX6TQh1bB1sf7LxfRJ54LQaNUJ
PDsUOBzMLAOIZTvfUyLUOhbqhe3L2s4D5eIs2Uq2P+tkFXGzv6BH7gy6TrOdk7Ui
iQIDAQAB
-----END PUBLIC KEY-----"""
LICENSE_TOKEN_FILE: str = os.getenv("IMORTAL_LICENSE_FILE", "license.token")

