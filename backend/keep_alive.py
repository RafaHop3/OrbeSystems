"""
keep_alive.py — Orbe Systems Standard Keep-Alive Module
════════════════════════════════════════════════════════
Prevents Render free-tier sleep by pinging /health every 14 minutes.

ORBE SYSTEMS STANDARD PATTERN:
  - All Orbe Systems backends deployed on Render (free tier) MUST include
    this module and register it via the FastAPI lifespan context.
  - The /health endpoint MUST exist in main.py before this module is used.
  - Ping interval: 14 minutes (Render sleeps after 15 min of inactivity).
  - Uses APScheduler (AsyncIOScheduler) — non-blocking, async-safe.

Usage in main.py:
  from contextlib import asynccontextmanager
  from keep_alive import start_keep_alive, stop_keep_alive

  @asynccontextmanager
  async def lifespan(app: FastAPI):
      start_keep_alive()
      yield
      stop_keep_alive()

  app = FastAPI(..., lifespan=lifespan)
"""

import httpx
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger("keep_alive")

# ── Config ────────────────────────────────────────────────────────────────────
import os
SELF_URL = os.getenv("KEEP_ALIVE_URL", "https://orbe-systems-api.onrender.com/health")
PING_INTERVAL_MINUTES = int(os.getenv("KEEP_ALIVE_INTERVAL", "14"))

# ── Scheduler instance ────────────────────────────────────────────────────────
_scheduler = AsyncIOScheduler()


async def _ping() -> None:
    """Ping the /health endpoint to prevent Render from sleeping the service."""
    try:
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


def stop_keep_alive() -> None:
    """Gracefully shut down the scheduler on app teardown."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[KeepAlive] 🛑 Scheduler stopped.")
