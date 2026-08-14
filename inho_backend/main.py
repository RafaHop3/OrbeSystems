"""
INHO – FastAPI Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from core.config import settings
from db.session import engine, Base
from keep_alive import start_keep_alive, stop_keep_alive
from routers import (
    auth, users, audit, contracts, sales_orders, pdv, admin, pco, businesses, billing
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger("inho")

# ── Rate Limiter ──────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])


# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # FIX: app.state em vez de global — cada worker tem seu proprio estado isolado
    app.state.db_ready = False
    logger.info("INHO API iniciando...")

    try:
        async with engine.begin() as conn:
            if settings.APP_ENV != "production":
                # Dev: cria tabelas automaticamente
                await conn.run_sync(Base.metadata.create_all)
            else:
                # Producao: apenas verifica conectividade — migrações via Alembic
                await conn.execute(text("SELECT 1"))

        app.state.db_ready = True
        logger.info("Banco de dados conectado")

    except Exception as e:
        app.state.db_ready = False
        logger.warning(
            f"PostgreSQL indisponivel na startup: {e}\n"
            "Configure DATABASE_URL no arquivo .env e reinicie o servidor."
        )

    start_keep_alive()
    yield

    logger.info("INHO API encerrando...")
    stop_keep_alive()
    await engine.dispose()


# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API de alta disponibilidade para gestão empresarial e impacto social global.",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://orbesystems.com.br",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*orbesystems.*)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter

async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    response = _rate_limit_exceeded_handler(request, exc)
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)


# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(contracts.router, prefix="/api/v1")
app.include_router(sales_orders.router, prefix="/api/v1")
app.include_router(pdv.router, prefix="/api/v1")
app.include_router(pco.router, prefix="/api/v1")
app.include_router(businesses.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])


# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check(request: Request):
    from datetime import datetime, timezone
    # FIX: usa request.app.state — funciona corretamente com multiplos workers
    return {
        "status": "operational",
        "service": "inho-api",
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
        "database": "connected" if getattr(request.app.state, "db_ready", False) else "unavailable",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["Root"])
async def root():
    return {"message": "INHO API - Gestão Empresarial e Impacto Social Global", "docs": "/docs"}


# ── AWS Lambda Handler ────────────────────────────────────────────
# Mangum translates Lambda/API-Gateway events → ASGI → FastAPI.
# Used in production (AWS Lambda). Ignored when running with uvicorn locally.
from mangum import Mangum  # noqa: E402
handler = Mangum(app)
