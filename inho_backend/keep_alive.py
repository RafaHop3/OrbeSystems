"""
INHO – Keep-Alive Robot (Render Free Tier)
Pings /health every 14 minutes to prevent cold starts.
"""
import logging

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from core.config import settings

logger = logging.getLogger("inho.keep_alive")
_scheduler = AsyncIOScheduler()


async def _ping():
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(settings.SELF_URL)
            logger.info(f"[Keep-Alive] Ping {settings.SELF_URL} → {r.status_code}")
    except Exception as e:
        logger.warning(f"[Keep-Alive] Ping failed: {e}")


def start_keep_alive():
    if not settings.KEEP_ALIVE_ENABLED:
        logger.info("[Keep-Alive] Disabled (set KEEP_ALIVE_ENABLED=true in production)")
        return
    _scheduler.add_job(_ping, "interval", minutes=14, id="ka_ping", replace_existing=True)
    _scheduler.start()
    logger.info("[Keep-Alive] Scheduler started")


def stop_keep_alive():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
