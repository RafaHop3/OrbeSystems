"""
OrBrick-IA Read-Only Tools (Onda 2 - Manual 35).

All 8 tools are strictly read-only and locked to `(business_id, contact_id)`
at the database query level (tenant isolation + contact isolation).
No tool here can mutate invoices, contacts, or financial records.
"""
from __future__ import annotations

import re
import uuid as _uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import (
    AIKnowledgeChunk,
    BillingInvoice,
    BillingStatus,
    Business,
    CBMCustomerProfile,
    Cooperado,
    CRMContact,
)


def _safe_uuid(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    try:
        return str(_uuid.UUID(str(val).strip()))
    except Exception:
        return None


def _mask_doc(doc: Optional[str]) -> str:
    digits = re.sub(r"\D", "", doc or "")
    if len(digits) == 11:
        return f"***.***.{digits[6:9]}-**"
    if len(digits) == 14:
        return f"**.***.***/{digits[8:12]}-**"
    return "***" if doc else ""


def _phone_last8(phone: Optional[str]) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-8:] if len(digits) >= 8 else ""


async def get_open_invoices(
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
    phone_digits: str = "",
    limit: int = 5,
) -> Dict[str, Any]:
    """Tool 1: List open (PENDING / OVERDUE) invoices strictly for (business_id, contact_id)."""
    b_uuid = _safe_uuid(business_id)
    c_uuid = _safe_uuid(contact_id)
    if not b_uuid:
        return {"tool": "get_open_invoices", "invoices": [], "total_open": 0.0}

    stmt = select(BillingInvoice).where(
        BillingInvoice.business_id == b_uuid,
        BillingInvoice.status.in_([BillingStatus.PENDING, BillingStatus.OVERDUE]),
    )
    last8 = _phone_last8(phone_digits)
    filters = []
    if c_uuid:
        filters.append(BillingInvoice.crm_contact_id == c_uuid)
    if last8:
        filters.append(BillingInvoice.customer_phone.ilike(f"%{last8}%"))
    if not filters:
        return {"tool": "get_open_invoices", "invoices": [], "total_open": 0.0}

    res = await db.execute(
        stmt.where(or_(*filters)).order_by(BillingInvoice.due_date.asc()).limit(limit)
    )
    rows = res.scalars().all()
    invoices = [
        {
            "id": str(inv.id),
            "amount": float(inv.amount or 0),
            "due_date": inv.due_date.isoformat() if inv.due_date else "",
            "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            "description": (inv.description or "")[:140],
            "has_pix": bool(inv.pix_code),
        }
        for inv in rows
    ]
    return {
        "tool": "get_open_invoices",
        "count": len(invoices),
        "total_open": round(sum(i["amount"] for i in invoices), 2),
        "invoices": invoices,
    }


async def get_pix_second_via(
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
    phone_digits: str = "",
    invoice_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Tool 2: Fetch PIX Copia e Cola & QR URL for the contact's earliest open invoice."""
    b_uuid = _safe_uuid(business_id)
    c_uuid = _safe_uuid(contact_id)
    if not b_uuid:
        return {"tool": "get_pix_second_via", "found": False}

    stmt = select(BillingInvoice).where(
        BillingInvoice.business_id == b_uuid,
        BillingInvoice.status.in_([BillingStatus.PENDING, BillingStatus.OVERDUE]),
    )
    inv_uuid = _safe_uuid(invoice_id)
    if inv_uuid:
        stmt = stmt.where(BillingInvoice.id == inv_uuid)

    last8 = _phone_last8(phone_digits)
    filters = []
    if c_uuid:
        filters.append(BillingInvoice.crm_contact_id == c_uuid)
    if last8:
        filters.append(BillingInvoice.customer_phone.ilike(f"%{last8}%"))
    if not filters:
        return {"tool": "get_pix_second_via", "found": False}

    res = await db.execute(
        stmt.where(or_(*filters)).order_by(BillingInvoice.due_date.asc()).limit(1)
    )
    inv = res.scalar_one_or_none()
    if not inv:
        return {"tool": "get_pix_second_via", "found": False}

    return {
        "tool": "get_pix_second_via",
        "found": True,
        "invoice_id": str(inv.id),
        "amount": float(inv.amount or 0),
        "due_date": inv.due_date.isoformat() if inv.due_date else "",
        "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
        "pix_code": inv.pix_code or "",
        "pix_qr_url": inv.pix_qr_url or "",
    }


async def get_contact_summary(
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Tool 3: Return safe contact summary without leaking raw CPF/CNPJ."""
    b_uuid = _safe_uuid(business_id)
    c_uuid = _safe_uuid(contact_id)
    if not b_uuid or not c_uuid:
        return {"tool": "get_contact_summary", "found": False}

    res = await db.execute(
        select(CRMContact).where(
            CRMContact.id == c_uuid,
            CRMContact.business_id == b_uuid,
        )
    )
    contact = res.scalar_one_or_none()
    if not contact:
        return {"tool": "get_contact_summary", "found": False}

    return {
        "tool": "get_contact_summary",
        "found": True,
        "contact_id": str(contact.id),
        "name": contact.name,
        "category": contact.category.value if hasattr(contact.category, "value") else str(contact.category),
        "document_masked": _mask_doc(contact.document),
        "city": contact.city or "",
        "state": contact.state or "",
        "is_active": bool(contact.is_active),
        "ai_attendance_enabled": bool(contact.ai_attendance_enabled),
        "opt_in_marketing": bool(contact.opt_in_marketing),
    }


async def get_cbm_churn_profile(
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Tool 4: Fetch CBM RFM & churn score strictly for (business_id, contact_id)."""
    b_uuid = _safe_uuid(business_id)
    c_uuid = _safe_uuid(contact_id)
    if not b_uuid or not c_uuid:
        return {"tool": "get_cbm_churn_profile", "found": False, "churn_risk_level": "LOW"}

    res = await db.execute(
        select(CBMCustomerProfile).where(
            CBMCustomerProfile.business_id == b_uuid,
            CBMCustomerProfile.contact_id == c_uuid,
        )
    )
    prof = res.scalar_one_or_none()
    if not prof:
        return {"tool": "get_cbm_churn_profile", "found": False, "churn_risk_level": "LOW"}

    return {
        "tool": "get_cbm_churn_profile",
        "found": True,
        "churn_risk_level": prof.churn_risk_level or "LOW",
        "churn_risk_score": float(getattr(prof, "churn_risk_score", 0.0) or 0.0),
        "seasonality_cluster": getattr(prof, "seasonality_cluster", "") or "",
        "recency_days": int(getattr(prof, "rfm_recency_days", 0) or 0),
        "frequency_score": float(getattr(prof, "rfm_frequency_score", 0.0) or 0.0),
        "monetary_total": float(getattr(prof, "rfm_monetary_total", 0.0) or 0.0),
        "ai_recommended_offer": getattr(prof, "ai_recommended_offer", "") or "",
    }


async def get_cooperado_status(
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
    phone_digits: str = "",
) -> Dict[str, Any]:
    """Tool 5: Lookup Cooperado membership status scoped to business_id + contact."""
    b_uuid = _safe_uuid(business_id)
    c_uuid = _safe_uuid(contact_id)
    if not b_uuid:
        return {"tool": "get_cooperado_status", "found": False}

    doc_match: Optional[str] = None
    last8 = _phone_last8(phone_digits)
    if c_uuid:
        c_res = await db.execute(
            select(CRMContact).where(
                CRMContact.id == c_uuid,
                CRMContact.business_id == b_uuid,
            )
        )
        c_obj = c_res.scalar_one_or_none()
        if c_obj:
            doc_match = c_obj.document
            if not last8:
                last8 = _phone_last8(c_obj.phone)

    filters = []
    if doc_match:
        filters.append(Cooperado.document == doc_match)
    if last8:
        filters.append(Cooperado.phone.ilike(f"%{last8}%"))
        filters.append(Cooperado.phones_json.ilike(f"%{last8}%"))
    if not filters:
        return {"tool": "get_cooperado_status", "found": False}

    res = await db.execute(
        select(Cooperado).where(
            Cooperado.business_id == b_uuid,
            or_(*filters),
        ).limit(1)
    )
    coop = res.scalar_one_or_none()
    if not coop:
        return {"tool": "get_cooperado_status", "found": False}

    return {
        "tool": "get_cooperado_status",
        "found": True,
        "cooperado_id": str(coop.id),
        "name": coop.name,
        "status": coop.status.value if hasattr(coop.status, "value") else str(coop.status),
        "document_masked": _mask_doc(coop.document),
    }


async def search_tenant_rag(
    db: AsyncSession,
    business_id: str,
    query: str,
    top_k: int = 5,
) -> Dict[str, Any]:
    """Tool 6: Hybrid RRF (pgvector cosine + lexical) RAG search strictly within business_id."""
    from services.ai_agent import rank_tenant_rag_hybrid_rrf

    b_uuid = _safe_uuid(business_id)
    if not b_uuid or not (query or "").strip():
        return {"tool": "search_tenant_rag", "chunks": []}

    res = await db.execute(
        select(AIKnowledgeChunk)
        .where(
            AIKnowledgeChunk.business_id == b_uuid,
            AIKnowledgeChunk.is_active == True,  # noqa: E712
        )
        .order_by(AIKnowledgeChunk.updated_at.desc())
        .limit(60)
    )
    rows = res.scalars().all()
    raw_chunks = [
        {
            "id": str(ch.id),
            "title": ch.title,
            "category": ch.category,
            "content": ch.content,
            "keywords": ch.keywords or "",
        }
        for ch in rows
    ]
    ranked = rank_tenant_rag_hybrid_rrf(query, raw_chunks, top_k=top_k)
    return {
        "tool": "search_tenant_rag",
        "count": len(ranked),
        "chunks": [
            {
                "id": r.get("id", ""),
                "title": r.get("title", ""),
                "category": r.get("category", ""),
                "content": r.get("content", ""),
                "rrf_score": r.get("rrf_score", 0.0),
            }
            for r in ranked
        ],
    }


async def check_business_hours(
    db: AsyncSession,
    business_id: str,
) -> Dict[str, Any]:
    """Tool 7: Check whether the tenant is within standard BRT operating hours."""
    b_uuid = _safe_uuid(business_id)
    biz_name = "Instituição"
    plan_tier = "INHO_ESSENCIAL"
    if b_uuid:
        res = await db.execute(select(Business).where(Business.id == b_uuid))
        biz = res.scalar_one_or_none()
        if biz:
            biz_name = biz.name
            plan_tier = getattr(biz, "plan_tier", plan_tier) or plan_tier

    brt_tz = timezone(timedelta(hours=-3))
    now_brt = datetime.now(brt_tz)
    is_weekday = now_brt.weekday() < 5
    is_open = is_weekday and (8 <= now_brt.hour < 18)
    return {
        "tool": "check_business_hours",
        "business_name": biz_name,
        "plan_tier": plan_tier,
        "current_brt": now_brt.strftime("%Y-%m-%d %H:%M BRT"),
        "is_open": is_open,
        "schedule_summary": "Segunda a Sexta, 08:00 às 18:00 (BRT)",
    }


async def get_recent_payments_status(
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
    phone_digits: str = "",
    limit: int = 5,
) -> Dict[str, Any]:
    """Tool 8: Inspect recent billing/payment statuses strictly for (business_id, contact_id)."""
    b_uuid = _safe_uuid(business_id)
    c_uuid = _safe_uuid(contact_id)
    if not b_uuid:
        return {"tool": "get_recent_payments_status", "payments": []}

    stmt = select(BillingInvoice).where(BillingInvoice.business_id == b_uuid)
    last8 = _phone_last8(phone_digits)
    filters = []
    if c_uuid:
        filters.append(BillingInvoice.crm_contact_id == c_uuid)
    if last8:
        filters.append(BillingInvoice.customer_phone.ilike(f"%{last8}%"))
    if not filters:
        return {"tool": "get_recent_payments_status", "payments": []}

    res = await db.execute(
        stmt.where(or_(*filters)).order_by(BillingInvoice.updated_at.desc()).limit(limit)
    )
    rows = res.scalars().all()
    return {
        "tool": "get_recent_payments_status",
        "count": len(rows),
        "payments": [
            {
                "id": str(inv.id),
                "amount": float(inv.amount or 0),
                "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
                "due_date": inv.due_date.isoformat() if inv.due_date else "",
                "payment_method": (
                    inv.payment_method.value
                    if hasattr(inv.payment_method, "value")
                    else str(inv.payment_method)
                ),
            }
            for inv in rows
        ],
    }


READONLY_TOOL_REGISTRY = {
    "get_open_invoices": get_open_invoices,
    "get_pix_second_via": get_pix_second_via,
    "get_contact_summary": get_contact_summary,
    "get_cbm_churn_profile": get_cbm_churn_profile,
    "get_cooperado_status": get_cooperado_status,
    "search_tenant_rag": search_tenant_rag,
    "check_business_hours": check_business_hours,
    "get_recent_payments_status": get_recent_payments_status,
}


async def execute_readonly_tool(
    tool_name: str,
    db: AsyncSession,
    business_id: str,
    contact_id: Optional[str] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Dispatch one of the 8 read-only tools safely."""
    fn = READONLY_TOOL_REGISTRY.get(tool_name)
    if not fn:
        return {"error": f"Unknown read-only tool: {tool_name}"}
    if tool_name == "search_tenant_rag":
        return await fn(db=db, business_id=business_id, query=kwargs.get("query", ""), top_k=kwargs.get("top_k", 5))
    if tool_name == "check_business_hours":
        return await fn(db=db, business_id=business_id)
    if tool_name in ("get_contact_summary", "get_cbm_churn_profile"):
        return await fn(db=db, business_id=business_id, contact_id=contact_id)
    return await fn(
        db=db,
        business_id=business_id,
        contact_id=contact_id,
        phone_digits=kwargs.get("phone_digits", ""),
    )
