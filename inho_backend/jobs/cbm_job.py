"""
INHO – Job Preditivo Diário do Módulo CBM (Consumer Behavior Management)
Executa o recálculo de RFM, clusterização de sazonalidade e scoring de risco de churn
para todas as empresas/cooperativas ativas de forma isolada por business_id.
"""
import logging
from sqlalchemy import select

from db.session import AsyncSessionLocal
from models.models import Business
from services.cbm_engine import refresh_cbm_profiles_for_business

logger = logging.getLogger("cbm_job")


async def run_daily_cbm_analytics_job() -> dict:
    """
    Varre todos os tenants (businesses) e atualiza a matriz comportamental
    cbm_customer_profiles de forma isolada.
    """
    processed_businesses = 0
    total_profiles_updated = 0

    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(select(Business))
            businesses = res.scalars().all()
            for biz in businesses:
                profiles = await refresh_cbm_profiles_for_business(db, biz.id)
                processed_businesses += 1
                total_profiles_updated += len(profiles)
        except Exception as exc:
            logger.error(f"[CBM-Job] Erro ao processar matriz comportamental: {exc}")

    return {
        "processed_businesses": processed_businesses,
        "total_profiles_updated": total_profiles_updated,
    }


# Alias compatível com APScheduler (keep_alive.py) e scripts de operação
run_daily_cbm_job = run_daily_cbm_analytics_job
