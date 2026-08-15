"""
inho_backend/keep_alive.py — Orbe Systems Standard Keep-Alive Module
════════════════════════════════════════════════════════
Prevents Render free-tier sleep by pinging /health every 14 minutes.

ORBE SYSTEMS STANDARD PATTERN:
  - All Orbe Systems backends deployed on Render (free tier) MUST include
    this module and register it via the FastAPI lifespan context.
  - The /health endpoint MUST exist in main.py before this module is used.
  - Ping interval: 14 minutes (Render sleeps after 15 min of inactivity).
  - Uses APScheduler (AsyncIOScheduler) — non-blocking, async-safe.
  - VERCEL/SERVERLESS: Keep-alive is automatically disabled in serverless
    environments (Vercel, AWS Lambda) where background threads cannot persist.
"""

import logging
import os

logger = logging.getLogger("keep_alive")

# ── Config ────────────────────────────────────────────────────────────────────
SELF_URL = os.getenv("KEEP_ALIVE_URL", "https://inho.orbesystems.com.br/api/health")
PING_INTERVAL_MINUTES = int(os.getenv("KEEP_ALIVE_INTERVAL", "14"))

# ── Serverless guard ──────────────────────────────────────────────────────────
_IS_SERVERLESS = bool(
    os.environ.get("VERCEL") or
    os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or
    os.environ.get("VERCEL_ENV")
)

# ── Lazy scheduler reference ──────────────────────────────────────────────────
_scheduler = None


async def _ping() -> None:
    """Ping the /health endpoint to prevent Render from sleeping the service."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(SELF_URL)
            if response.status_code == 200:
                logger.info(
                    f"[KeepAlive] ✅ Ping OK → {SELF_URL} | status={response.status_code}"
                )
            else:
                logger.warning(
                    f"[KeepAlive] ⚠️  Unexpected status → {response.status_code}"
                )
    except Exception as exc:
        logger.error(f"[KeepAlive] ❌ Ping failed → {exc}")


def start_keep_alive() -> None:
    """Register the periodic ping job and start the scheduler."""
    global _scheduler

    if _IS_SERVERLESS:
        logger.info("[KeepAlive] 🚫 Serverless environment detected — keep-alive scheduler disabled.")
        return

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            _ping,
            trigger="interval",
            minutes=PING_INTERVAL_MINUTES,
            id="keep_alive_ping",
            replace_existing=True,
        )
        _scheduler.start()
        logger.info(
            f"[KeepAlive] 🤖 Robot active — pinging every {PING_INTERVAL_MINUTES} min → {SELF_URL}"
        )
    except Exception as e:
        logger.warning(f"[KeepAlive] Failed to start scheduler: {e}")


def stop_keep_alive() -> None:
    """Gracefully shut down the scheduler on app teardown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[KeepAlive] 🛑 Scheduler stopped.")
