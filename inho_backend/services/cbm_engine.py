"""
INHO – Motor Preditivo CBM (Consumer Behavior Management)
Análise RFM (Recência, Frequência, Valor Monetário), Clusterização de Sazonalidade,
Scoring Preditivo de Risco de Churn e Conformidade LGPD (Opt-Out & Direito ao Esquecimento).
Isolamento estrito Multi-Tenant por business_id.
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import (
    BillingInvoice,
    BillingStatus,
    CBMCustomerProfile,
    ContactCategory,
    Contract,
    CRMContact,
    OmnichannelLog,
    SalesOrder,
    SalesOrderStatus,
)
from services.ai_agent import encrypt_conversation_metadata

logger = logging.getLogger("inho.cbm_engine")


def _norm_uuid(val: Any) -> Any:
    if not val:
        return val
    is_sqlite = os.environ.get("DATABASE_URL", "").startswith("sqlite")
    if is_sqlite:
        return str(val)
    if isinstance(val, str):
        try:
            return UUID(val)
        except ValueError:
            return val
    return val


def _ensure_utc(dt: Optional[datetime]) -> datetime:
    if not dt:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def calculate_rfm_and_churn(
    *,
    last_activity_date: Optional[datetime],
    tx_count_180d: int,
    monetary_total: float,
    overdue_count: int,
    overdue_amount: float,
    contact_created_at: Optional[datetime],
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Calcula o modelo RFM e o Score Preditivo de Risco de Churn (0 a 100):
    - Recência (dias desde a última movimentação ou cadastro)
    - Frequência (score 0..100 baseado em pedidos/faturas nos últimos 180 dias)
    - Valor Monetário (total transacionado pelo cliente/cooperado)
    - Penalidade por inadimplência recorrente (faturas vencidas)
    """
    now_utc = now or datetime.now(timezone.utc)
    ref_date = _ensure_utc(last_activity_date or contact_created_at or now_utc)
    recency_days = max(0, (now_utc - ref_date).days)

    # Frequency Score (0 a 100): 6+ transações em 180d = 100
    frequency_score = min(100.0, round((tx_count_180d / 6.0) * 100.0, 2))

    # Cálculo de Risco de Churn (0 a 100)
    # 1. Peso da inatividade (recência): até 45 pontos
    recency_risk = min(45.0, (recency_days / 90.0) * 45.0)
    # 2. Peso da baixa frequência: até 25 pontos
    if tx_count_180d == 0:
        freq_risk = 22.0 if recency_days > 15 else 10.0
    else:
        freq_risk = max(0.0, 25.0 - (frequency_score * 0.25))
    # 3. Peso de inadimplência / atraso (overdue): até 35 pontos
    overdue_risk = min(35.0, overdue_count * 16.0 + (5.0 if overdue_amount > 500 else 0.0))

    raw_churn = round(min(100.0, max(2.0, recency_risk + freq_risk + overdue_risk)), 2)

    if raw_churn >= 75.0:
        risk_level = "CRITICAL"
    elif raw_churn >= 50.0:
        risk_level = "HIGH"
    elif raw_churn >= 25.0:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Clusterização de Sazonalidade / Hábito de Consumo
    if overdue_count > 0 and raw_churn >= 60.0:
        cluster = "INADIMPLENCIA_CRITICA"
    elif recency_days > 60:
        cluster = "INATIVO_HIBERNANDO"
    elif monetary_total >= 5000.0 and frequency_score >= 50.0:
        cluster = "VIP_ALTO_VALOR"
    elif tx_count_180d >= 3:
        cluster = "RECORRENTE_MENSAL"
    elif monetary_total > 0:
        cluster = "SAZONAL_SAFRA_OU_PROJETO"
    else:
        cluster = "NOVO_CADASTRO"

    # Previsão da próxima compra/integralização
    avg_cycle_days = max(15, int(180 / max(1, tx_count_180d))) if tx_count_180d > 0 else 30
    predicted_next = ref_date + timedelta(days=avg_cycle_days)
    if predicted_next < now_utc:
        predicted_next = now_utc + timedelta(days=7)

    # Recomendação de Retenção IA Orbe Systems
    if risk_level == "CRITICAL":
        recommended_offer = (
            "Acionar campanha preventiva prioritária via OrBrick WhatsApp: "
            "Oferecer renegociação assistida sem multa ou revisão de plano/cota com especialista."
        )
    elif risk_level == "HIGH":
        recommended_offer = (
            "Disparar gatilho 'Sentimos sua falta' multicanal (WhatsApp + E-mail) "
            "com condição especial de fidelidade ou parcelamento flexível."
        )
    elif risk_level == "MEDIUM":
        recommended_offer = (
            "Enviar lembrete consultivo de ciclo sazonal e benefícios ativos da cooperativa/empresa."
        )
    else:
        recommended_offer = (
            "Cliente saudável e engajado. Elegível para campanha de upsell, nova cota-parte ou indicação."
        )

    return {
        "rfm_recency_days": recency_days,
        "rfm_frequency_score": frequency_score,
        "rfm_monetary_total": round(float(monetary_total), 2),
        "churn_risk_score": raw_churn,
        "churn_risk_level": risk_level,
        "seasonality_cluster": cluster,
        "predicted_next_purchase_date": predicted_next,
        "ai_recommended_offer": recommended_offer,
    }


async def refresh_cbm_profiles_for_business(
    db: AsyncSession,
    business_id: Any,
) -> List[Dict[str, Any]]:
    """
    Recalcula e persiste os perfis comportamentais (cbm_customer_profiles)
    de todos os clientes e cooperados (CUSTOMER / PARTNER) do business_id atual.
    Garante isolamento Multi-Tenant absoluto.
    """
    b_id = _norm_uuid(business_id)
    now_utc = datetime.now(timezone.utc)
    cutoff_180d = now_utc - timedelta(days=180)

    # 1. Buscar contatos elegíveis (CUSTOMER e PARTNER) do tenant
    contacts_res = await db.execute(
        select(CRMContact).where(
            CRMContact.business_id == b_id,
            CRMContact.category.in_([ContactCategory.CUSTOMER, ContactCategory.PARTNER]),
        )
    )
    contacts = contacts_res.scalars().all()

    # 2. Buscar faturas do tenant
    inv_res = await db.execute(
        select(BillingInvoice).where(BillingInvoice.business_id == b_id)
    )
    invoices = inv_res.scalars().all()

    # 3. Buscar pedidos de venda faturados/confirmados do tenant
    so_res = await db.execute(
        select(SalesOrder).where(
            SalesOrder.business_id == b_id,
            SalesOrder.status.in_([SalesOrderStatus.CONFIRMED, SalesOrderStatus.INVOICED]),
        )
    )
    sales_orders = so_res.scalars().all()

    # 4. Buscar contratos ativos do tenant
    ct_res = await db.execute(
        select(Contract).where(Contract.business_id == b_id)
    )
    contracts = ct_res.scalars().all()

    # 5. Buscar perfis CBM já existentes no tenant
    existing_res = await db.execute(
        select(CBMCustomerProfile).where(CBMCustomerProfile.business_id == b_id)
    )
    existing_by_contact = {str(p.contact_id): p for p in existing_res.scalars().all()}

    enriched_profiles: List[Dict[str, Any]] = []

    for c in contacts:
        c_id_str = str(c.id)
        c_doc_clean = "".join(ch for ch in (c.document or "") if ch.isdigit())
        c_name_lower = (c.name or "").strip().lower()

        # Agregar faturas associadas ao contato (por crm_contact_id, documento ou nome exato no mesmo tenant)
        c_invoices = [
            inv for inv in invoices
            if str(inv.crm_contact_id or "") == c_id_str
            or (c_doc_clean and "".join(ch for ch in (inv.customer_doc or "") if ch.isdigit()) == c_doc_clean)
            or (c_name_lower and (inv.customer_name or "").strip().lower() == c_name_lower)
        ]

        c_orders = [
            so for so in sales_orders
            if (c_doc_clean and "".join(ch for ch in (so.customer_doc or "") if ch.isdigit()) == c_doc_clean)
            or (c_name_lower and (so.customer_name or "").strip().lower() == c_name_lower)
        ]

        c_contracts = [
            ct for ct in contracts
            if (c_doc_clean and "".join(ch for ch in (ct.contact_doc or "") if ch.isdigit()) == c_doc_clean)
            or (c_name_lower and (ct.contact_name or "").strip().lower() == c_name_lower)
        ]

        monetary_total = 0.0
        tx_count_180d = 0
        overdue_count = 0
        overdue_amount = 0.0
        last_dt: Optional[datetime] = _ensure_utc(c.created_at)

        for inv in c_invoices:
            inv_dt = _ensure_utc(inv.updated_at or inv.created_at)
            amt = float(inv.amount or 0.0)
            if inv.status == BillingStatus.PAID:
                monetary_total += amt
                if inv_dt >= cutoff_180d:
                    tx_count_180d += 1
                if not last_dt or inv_dt > last_dt:
                    last_dt = inv_dt
            elif inv.status == BillingStatus.OVERDUE or (
                inv.status == BillingStatus.PENDING and _ensure_utc(inv.due_date) < now_utc
            ):
                overdue_count += 1
                overdue_amount += amt

        for so in c_orders:
            so_dt = _ensure_utc(so.issue_date or so.created_at)
            monetary_total += float(so.amount or 0.0)
            if so_dt >= cutoff_180d:
                tx_count_180d += 1
            if not last_dt or so_dt > last_dt:
                last_dt = so_dt

        for ct in c_contracts:
            ct_dt = _ensure_utc(ct.start_date or ct.created_at)
            monetary_total += float(ct.total_value or 0.0)
            if ct_dt >= cutoff_180d:
                tx_count_180d += 1
            if not last_dt or ct_dt > last_dt:
                last_dt = ct_dt

        metrics = calculate_rfm_and_churn(
            last_activity_date=last_dt,
            tx_count_180d=tx_count_180d,
            monetary_total=monetary_total,
            overdue_count=overdue_count,
            overdue_amount=overdue_amount,
            contact_created_at=c.created_at,
            now=now_utc,
        )

        encrypted_note = encrypt_conversation_metadata(
            json.dumps({
                "contact_uuid": c_id_str,
                "overdue_count": overdue_count,
                "tx_count_180d": tx_count_180d,
                "computed_at": now_utc.isoformat(),
            })
        )

        profile = existing_by_contact.get(c_id_str)
        opt_in_val = bool(getattr(c, "opt_in_marketing", True))
        if profile:
            profile.rfm_recency_days = metrics["rfm_recency_days"]
            profile.rfm_frequency_score = metrics["rfm_frequency_score"]
            profile.rfm_monetary_total = metrics["rfm_monetary_total"]
            profile.churn_risk_score = metrics["churn_risk_score"]
            profile.churn_risk_level = metrics["churn_risk_level"]
            profile.seasonality_cluster = metrics["seasonality_cluster"]
            profile.ai_recommended_offer = metrics["ai_recommended_offer"]
            profile.encrypted_behavioral_notes = encrypted_note
            profile.predicted_next_purchase_date = metrics["predicted_next_purchase_date"]
            profile.opt_in_campaigns = bool(profile.opt_in_campaigns and opt_in_val)
            profile.updated_at = now_utc
        else:
            profile = CBMCustomerProfile(
                business_id=b_id,
                contact_id=_norm_uuid(c.id),
                rfm_recency_days=metrics["rfm_recency_days"],
                rfm_frequency_score=metrics["rfm_frequency_score"],
                rfm_monetary_total=metrics["rfm_monetary_total"],
                churn_risk_score=metrics["churn_risk_score"],
                churn_risk_level=metrics["churn_risk_level"],
                seasonality_cluster=metrics["seasonality_cluster"],
                ai_recommended_offer=metrics["ai_recommended_offer"],
                encrypted_behavioral_notes=encrypted_note,
                predicted_next_purchase_date=metrics["predicted_next_purchase_date"],
                opt_in_campaigns=opt_in_val,
                updated_at=now_utc,
            )
            db.add(profile)
            existing_by_contact[c_id_str] = profile

        enriched_profiles.append({
            "profile": profile,
            "contact": c,
            "overdue_count": overdue_count,
            "overdue_amount": round(overdue_amount, 2),
        })

    await db.commit()

    results = []
    for item in enriched_profiles:
        p: CBMCustomerProfile = item["profile"]
        c: CRMContact = item["contact"]
        results.append({
            "id": str(p.id),
            "business_id": str(p.business_id),
            "contact_id": str(p.contact_id),
            "contact_name": c.name,
            "contact_phone": c.phone,
            "contact_email": c.email,
            "contact_category": c.category.value if hasattr(c.category, "value") else str(c.category),
            "ai_attendance_enabled": bool(getattr(c, "ai_attendance_enabled", True)),
            "ai_handoff_until": c.ai_handoff_until.isoformat() if getattr(c, "ai_handoff_until", None) else None,
            "rfm_recency_days": int(p.rfm_recency_days or 0),
            "rfm_frequency_score": float(p.rfm_frequency_score or 0.0),
            "rfm_monetary_total": float(p.rfm_monetary_total or 0.0),
            "churn_risk_score": float(p.churn_risk_score or 0.0),
            "churn_risk_level": str(p.churn_risk_level or "LOW"),
            "seasonality_cluster": p.seasonality_cluster or "RECORRENTE_MENSAL",
            "ai_recommended_offer": p.ai_recommended_offer,
            "predicted_next_purchase_date": (
                p.predicted_next_purchase_date.isoformat() if p.predicted_next_purchase_date else None
            ),
            "opt_in_campaigns": bool(p.opt_in_campaigns),
            "overdue_count": item["overdue_count"],
            "overdue_amount": item["overdue_amount"],
            "updated_at": (p.updated_at or now_utc).isoformat(),
        })

    results.sort(key=lambda x: x["churn_risk_score"], reverse=True)
    return results


async def anonymize_or_purge_cbm_profile(
    db: AsyncSession,
    business_id: Any,
    contact_id: Any,
) -> Dict[str, Any]:
    """
    Direito ao Esquecimento e Opt-Out Estrito (Art. 18 da LGPD — Ghost Engine Principle):
    1. Desativa opt_in_marketing no CRMContact.
    2. Expurga o perfil comportamental em cbm_customer_profiles daquele contato no tenant.
    3. Anonimiza transcrições de conversas em omnichannel_logs vinculadas ao contato.
    """
    b_id = _norm_uuid(business_id)
    c_id = _norm_uuid(contact_id)

    contact_res = await db.execute(
        select(CRMContact).where(
            CRMContact.id == c_id,
            CRMContact.business_id == b_id,
        )
    )
    contact = contact_res.scalar_one_or_none()
    if not contact:
        return {"found": False}

    contact.opt_in_marketing = False
    contact.ai_attendance_enabled = False

    # Expurgar perfil preditivo CBM
    del_res = await db.execute(
        delete(CBMCustomerProfile).where(
            CBMCustomerProfile.business_id == b_id,
            CBMCustomerProfile.contact_id == c_id,
        )
    )
    purged_profiles = del_res.rowcount or 0

    # Anonimizar logs de chat vinculados ao contato ou número de telefone no tenant
    phone_digits = "".join(ch for ch in (contact.phone or "") if ch.isdigit())
    logs_res = await db.execute(
        select(OmnichannelLog).where(OmnichannelLog.business_id == b_id)
    )
    anonymized_logs = 0
    for log in logs_res.scalars().all():
        match_contact = str(log.contact_id or "") == str(c_id)
        match_phone = bool(phone_digits and len(phone_digits) >= 8 and phone_digits[-8:] in (log.recipient or ""))
        if match_contact or match_phone:
            log.recipient = "[ANONIMIZADO_LGPD_ART18]"
            log.message_content = "[CONTEUDO_EXPURGADO_DIREITO_AO_ESQUECIMENTO_LGPD]"
            anonymized_logs += 1

    await db.commit()
    return {
        "found": True,
        "contact_id": str(contact.id),
        "business_id": str(business_id),
        "opt_in_marketing": False,
        "purged_cbm_profiles": purged_profiles,
        "anonymized_omnichannel_logs": anonymized_logs,
        "status": "LGPD_ART18_PURGED",
    }
