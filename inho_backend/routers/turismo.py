"""
INHO Turismo Router (AI-First / Human-Last · Omnichannel Custo Zero · Orbe Systems).
"""
from __future__ import annotations

import json
import re
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from core.security import decrypt_secret, encrypt_secret
from db.session import get_db
from models.models import (
    AuditAction,
    AuditLog,
    Business,
    TurismoBooking,
    TurismoChannelConfig,
    TurismoChannelMessage,
    TurismoClubSubscription,
    TurismoGroup,
    TurismoGroupMember,
    TurismoMilesAccount,
    TurismoQuote,
    User,
)
from routers.billing import _get_user_business
from services.ai_agent import classify_and_respond_orbrick
from services.omnichannel_adapters import (
    evaluate_human_last_escalation,
    parse_instagram_webhook_events,
    parse_telegram_webhook_event,
    send_omnichannel_message,
)

router = APIRouter(prefix="/turismo", tags=["INHO Turismo"])

_PUBLIC_OFFERS_CACHE: Dict[str, Any] = {"ts": 0.0, "data": []}


def _sid(val: Any) -> str:
    return str(val) if val else ""


async def _biz(db: AsyncSession, user: User) -> Business:
    return await _get_user_business(db, user)


def _compute_semaphore(used: int, limit_yr: int) -> str:
    lim = max(1, limit_yr)
    ratio = used / lim
    if ratio >= 0.90:
        return "RED"
    if ratio >= 0.70:
        return "YELLOW"
    return "GREEN"


# ── Schemas ──────────────────────────────────────────────────────────────────

class QuoteCreatePayload(BaseModel):
    client_name: str
    origin: str
    destination: str
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    passengers: int = 1
    airline_program: str = "SMILES"
    cash_price_brl: float
    miles_required: int = 0
    mile_cost_per_k_brl: float = 17.5
    tax_fees_brl: float = 0.0
    is_public_offer: bool = False


class PnrImportPayload(BaseModel):
    pnr_raw_text: str
    client_name: Optional[str] = None
    cash_price_brl: float = 2800.0
    miles_required: int = 45000
    mile_cost_per_k_brl: float = 17.5
    tax_fees_brl: float = 120.0


class ProposalSelectPayload(BaseModel):
    selected_option: str  # A | B | C


class MilesAccountCreatePayload(BaseModel):
    program_name: str
    holder_name: str
    holder_document: str
    miles_balance: int = 0
    cpfs_used_year: int = 0
    cpfs_limit_year: int = 25
    notes: Optional[str] = None


class BookingCreatePayload(BaseModel):
    quote_id: Optional[str] = None
    pnr_locator: str
    passenger_name: str
    origin: str
    destination: str
    departure_at: str
    return_at: Optional[str] = None
    sale_amount_brl: float
    supplier_cost_brl: float
    iss_rate_pct: float = 5.0


class GroupCreatePayload(BaseModel):
    group_name: str
    destination: str
    departure_date: Optional[str] = None
    return_date: Optional[str] = None
    max_members: int = 30
    price_per_person_brl: float = 0.0


class GroupMemberCreatePayload(BaseModel):
    member_name: str
    document: Optional[str] = None
    room_number: Optional[str] = None
    room_type: str = "DUPLO"
    amount_paid_brl: float = 0.0
    amount_due_brl: float = 0.0


class ClubCreatePayload(BaseModel):
    member_name: str
    member_email: str
    telegram_chat_id: Optional[str] = None
    plan_price_brl: float = 49.90
    discount_pct: float = 50.0


class ClubBroadcastPayload(BaseModel):
    title: str
    message: str


class ChannelConfigPayload(BaseModel):
    whatsapp_enabled: bool = True
    instagram_enabled: bool = False
    instagram_page_id: Optional[str] = None
    instagram_access_token: Optional[str] = None
    telegram_enabled: bool = False
    telegram_bot_token: Optional[str] = None
    telegram_vip_channel_id: Optional[str] = None
    ai_first_enabled: bool = True


class OmnichannelInboundPayload(BaseModel):
    channel: str = "WHATSAPP"  # WHATSAPP | INSTAGRAM | TELEGRAM
    sender_ref: str
    sender_name: Optional[str] = "Viajante"
    message_text: str
    is_final_emission: bool = False
    financial_exception: bool = False
    simulate_ai_offline: bool = False


# ── 1. Overview KPIs ─────────────────────────────────────────────────────────

@router.get("/overview")
async def get_turismo_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    b_id = _sid(biz.id)

    quotes = (await db.execute(select(TurismoQuote).where(TurismoQuote.business_id == b_id))).scalars().all()
    miles = (await db.execute(select(TurismoMilesAccount).where(TurismoMilesAccount.business_id == b_id))).scalars().all()
    bookings = (await db.execute(select(TurismoBooking).where(TurismoBooking.business_id == b_id))).scalars().all()
    club = (await db.execute(select(TurismoClubSubscription).where(TurismoClubSubscription.business_id == b_id))).scalars().all()
    msgs = (await db.execute(select(TurismoChannelMessage).where(TurismoChannelMessage.business_id == b_id))).scalars().all()

    total_savings = round(sum(float(q.savings_brl or 0) for q in quotes if q.recommended_mode == "MILES"), 2)
    total_profit = round(sum(float(b.net_profit_brl or 0) for b in bookings), 2)
    red_cpfs = sum(1 for m in miles if m.semaphore_status == "RED")
    ai_handled = sum(1 for m in msgs if m.handled_by == "AI_FIRST")
    human_escalated = sum(1 for m in msgs if m.handled_by == "HUMAN_LAST")

    return {
        "business_name": biz.name,
        "quotes_count": len(quotes),
        "total_miles_savings_brl": total_savings,
        "bookings_count": len(bookings),
        "dre_net_profit_brl": total_profit,
        "miles_accounts_count": len(miles),
        "cpf_semaphore_red_alerts": red_cpfs,
        "club_active_members": sum(1 for c in club if c.status == "ACTIVE"),
        "ai_first_handled": ai_handled,
        "human_last_escalations": human_escalated,
    }


# ── 2. Hybrid Cash vs Miles Quoter & Proposta Viva ───────────────────────────

@router.post("/quotes")
async def create_turismo_quote(
    payload: QuoteCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    b_id = _sid(biz.id)

    total_miles_cost = round(
        ((payload.miles_required / 1000.0) * payload.mile_cost_per_k_brl) + payload.tax_fees_brl,
        2,
    )
    if payload.miles_required > 0 and total_miles_cost < payload.cash_price_brl:
        rec_mode = "MILES"
        savings = round(payload.cash_price_brl - total_miles_cost, 2)
    else:
        rec_mode = "CASH"
        savings = 0.0

    slug = f"{payload.origin.lower()}-{payload.destination.lower()}-{str(uuid.uuid4())[:6]}"
    options = [
        {
            "code": "A",
            "label": f"Econômica ({payload.airline_program} Milhas)",
            "price_brl": total_miles_cost if payload.miles_required > 0 else payload.cash_price_brl,
            "mode": "MILES" if payload.miles_required > 0 else "CASH",
            "highlights": "Melhor custo-benefício com milhas auditadas + taxa de embarque",
        },
        {
            "code": "B",
            "label": "Flexível Tarifa Pagante",
            "price_brl": round(payload.cash_price_brl, 2),
            "mode": "CASH",
            "highlights": "Remarcação facilitada + acúmulo de milhas no CPF do viajante",
        },
        {
            "code": "C",
            "label": "Executiva / VIP Club",
            "price_brl": round(payload.cash_price_brl * 1.45, 2),
            "mode": "CASH",
            "highlights": "Bagagem despachada + sala VIP + concierge prioritário",
        },
    ]

    quote = TurismoQuote(
        business_id=b_id,
        proposal_slug=slug,
        client_name=payload.client_name,
        origin=payload.origin.upper(),
        destination=payload.destination.upper(),
        departure_date=payload.departure_date,
        return_date=payload.return_date,
        passengers=payload.passengers,
        airline_program=payload.airline_program.upper(),
        cash_price_brl=payload.cash_price_brl,
        miles_required=payload.miles_required,
        mile_cost_per_k_brl=payload.mile_cost_per_k_brl,
        tax_fees_brl=payload.tax_fees_brl,
        total_miles_cost_brl=total_miles_cost,
        recommended_mode=rec_mode,
        savings_brl=savings,
        options_json=json.dumps(options, ensure_ascii=False),
        is_public_offer=payload.is_public_offer,
        status="SENT",
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    _PUBLIC_OFFERS_CACHE["ts"] = 0.0

    return {
        "id": str(quote.id),
        "proposal_slug": quote.proposal_slug,
        "recommended_mode": quote.recommended_mode,
        "total_miles_cost_brl": float(quote.total_miles_cost_brl),
        "cash_price_brl": float(quote.cash_price_brl),
        "savings_brl": float(quote.savings_brl),
        "options": options,
        "status": quote.status,
    }


@router.get("/quotes")
async def list_turismo_quotes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    res = await db.execute(
        select(TurismoQuote)
        .where(TurismoQuote.business_id == _sid(biz.id))
        .order_by(TurismoQuote.created_at.desc())
        .limit(50)
    )
    rows = res.scalars().all()
    return [
        {
            "id": str(q.id),
            "proposal_slug": q.proposal_slug,
            "client_name": q.client_name,
            "origin": q.origin,
            "destination": q.destination,
            "departure_date": q.departure_date,
            "airline_program": q.airline_program,
            "cash_price_brl": float(q.cash_price_brl),
            "total_miles_cost_brl": float(q.total_miles_cost_brl),
            "recommended_mode": q.recommended_mode,
            "savings_brl": float(q.savings_brl),
            "selected_option": q.selected_option,
            "pnr_locator": q.pnr_locator,
            "is_public_offer": bool(q.is_public_offer),
            "status": q.status,
            "options": json.loads(q.options_json or "[]"),
        }
        for q in rows
    ]


# ── 3. Smart Import PNR / PDF ────────────────────────────────────────────────

@router.post("/quotes/import-pnr")
async def import_pnr_quote(
    payload: PnrImportPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    raw = payload.pnr_raw_text or ""
    loc_match = re.search(r"\b([A-Z0-9]{6})\b", raw)
    route_match = re.search(r"\b([A-Z]{3})\s*[-/>]\s*([A-Z]{3})\b", raw)
    pax_match = re.search(r"(?:PAX|PASSAGEIRO|NOME)[:\s]+([A-ZÀ-Ÿ\s]{4,40})", raw, re.IGNORECASE)

    locator = loc_match.group(1) if loc_match else f"PNR{str(uuid.uuid4())[:3].upper()}"
    origin = route_match.group(1) if route_match else "GRU"
    dest = route_match.group(2) if route_match else "LIS"
    client = payload.client_name or (pax_match.group(1).strip().title() if pax_match else "Passageiro PNR")

    total_miles_cost = round(((payload.miles_required / 1000.0) * payload.mile_cost_per_k_brl) + payload.tax_fees_brl, 2)
    rec = "MILES" if total_miles_cost < payload.cash_price_brl else "CASH"
    savings = round(max(0.0, payload.cash_price_brl - total_miles_cost), 2) if rec == "MILES" else 0.0
    slug = f"pnr-{locator.lower()}-{str(uuid.uuid4())[:5]}"

    quote = TurismoQuote(
        business_id=_sid(biz.id),
        proposal_slug=slug,
        client_name=client,
        origin=origin,
        destination=dest,
        airline_program="SMILES",
        cash_price_brl=payload.cash_price_brl,
        miles_required=payload.miles_required,
        mile_cost_per_k_brl=payload.mile_cost_per_k_brl,
        tax_fees_brl=payload.tax_fees_brl,
        total_miles_cost_brl=total_miles_cost,
        recommended_mode=rec,
        savings_brl=savings,
        pnr_locator=locator,
        pnr_raw_text=raw[:2000],
        options_json=json.dumps([
            {"code": "A", "label": "Emissão Milhas", "price_brl": total_miles_cost, "mode": "MILES"},
            {"code": "B", "label": "Tarifa Pagante", "price_brl": payload.cash_price_brl, "mode": "CASH"},
        ], ensure_ascii=False),
        status="SENT",
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return {
        "id": str(quote.id),
        "pnr_locator": locator,
        "origin": origin,
        "destination": dest,
        "client_name": client,
        "proposal_slug": slug,
        "recommended_mode": rec,
        "savings_brl": savings,
    }


# ── 4. Public Proposta Viva & Cached Public Offers ───────────────────────────

@router.get("/public/proposta/{slug}")
async def get_public_proposta(slug: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(TurismoQuote).where(TurismoQuote.proposal_slug == slug))
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Proposta não encontrada.")
    return {
        "proposal_slug": q.proposal_slug,
        "client_name": q.client_name,
        "origin": q.origin,
        "destination": q.destination,
        "departure_date": q.departure_date,
        "return_date": q.return_date,
        "passengers": q.passengers,
        "recommended_mode": q.recommended_mode,
        "savings_brl": float(q.savings_brl),
        "options": json.loads(q.options_json or "[]"),
        "selected_option": q.selected_option,
        "status": q.status,
    }


@router.post("/public/proposta/{slug}/select")
async def select_public_proposta_option(
    slug: str,
    payload: ProposalSelectPayload,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(TurismoQuote).where(TurismoQuote.proposal_slug == slug))
    q = res.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Proposta não encontrada.")
    choice = payload.selected_option.strip().upper()
    if choice not in ("A", "B", "C"):
        raise HTTPException(status_code=400, detail="Opção inválida (use A, B ou C).")
    q.selected_option = choice
    q.status = "APPROVED"
    q.approved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"proposal_slug": q.proposal_slug, "selected_option": choice, "status": q.status}


@router.get("/public/offers")
async def get_public_offers_widget(db: AsyncSession = Depends(get_db)):
    now_ts = time.time()
    if now_ts - float(_PUBLIC_OFFERS_CACHE.get("ts", 0.0)) < 60.0 and _PUBLIC_OFFERS_CACHE.get("data"):
        return {"cached": True, "offers": _PUBLIC_OFFERS_CACHE["data"]}
    res = await db.execute(
        select(TurismoQuote)
        .where(TurismoQuote.is_public_offer.is_(True))
        .order_by(TurismoQuote.created_at.desc())
        .limit(12)
    )
    offers = [
        {
            "proposal_slug": q.proposal_slug,
            "origin": q.origin,
            "destination": q.destination,
            "departure_date": q.departure_date,
            "airline_program": q.airline_program,
            "price_from_brl": float(q.total_miles_cost_brl if q.recommended_mode == "MILES" else q.cash_price_brl),
            "savings_brl": float(q.savings_brl),
        }
        for q in res.scalars().all()
    ]
    _PUBLIC_OFFERS_CACHE["ts"] = now_ts
    _PUBLIC_OFFERS_CACHE["data"] = offers
    return {"cached": False, "offers": offers}


# ── 5. Miles Vault & CPF Semaphore (Zero Passwords) ──────────────────────────

@router.get("/miles")
async def list_miles_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    res = await db.execute(
        select(TurismoMilesAccount)
        .where(TurismoMilesAccount.business_id == _sid(biz.id))
        .order_by(TurismoMilesAccount.created_at.desc())
    )
    return [
        {
            "id": str(m.id),
            "program_name": m.program_name,
            "holder_name": m.holder_name,
            "holder_document_masked": m.holder_document_masked,
            "miles_balance": int(m.miles_balance),
            "cpfs_used_year": int(m.cpfs_used_year),
            "cpfs_limit_year": int(m.cpfs_limit_year),
            "semaphore_status": m.semaphore_status,
            "notes": m.notes,
        }
        for m in res.scalars().all()
    ]


@router.post("/miles")
async def create_miles_account(
    payload: MilesAccountCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    digits = re.sub(r"\D", "", payload.holder_document or "")
    masked = f"***.***.{digits[6:9]}-**" if len(digits) == 11 else "***"
    sem = _compute_semaphore(payload.cpfs_used_year, payload.cpfs_limit_year)
    acc = TurismoMilesAccount(
        business_id=_sid(biz.id),
        program_name=payload.program_name.upper(),
        holder_name=payload.holder_name,
        holder_document_masked=masked,
        miles_balance=payload.miles_balance,
        cpfs_used_year=payload.cpfs_used_year,
        cpfs_limit_year=payload.cpfs_limit_year,
        semaphore_status=sem,
        notes=payload.notes,
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return {"id": str(acc.id), "semaphore_status": acc.semaphore_status, "holder_document_masked": masked}


@router.patch("/miles/{account_id}/use-cpf")
async def increment_miles_cpf(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    res = await db.execute(
        select(TurismoMilesAccount).where(
            TurismoMilesAccount.id == account_id,
            TurismoMilesAccount.business_id == _sid(biz.id),
        )
    )
    acc = res.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Conta de milhas não encontrada.")
    if acc.cpfs_used_year >= acc.cpfs_limit_year:
        raise HTTPException(status_code=400, detail="Limite anual de CPFs atingido nesta conta.")
    acc.cpfs_used_year += 1
    acc.semaphore_status = _compute_semaphore(acc.cpfs_used_year, acc.cpfs_limit_year)
    await db.commit()
    return {"id": str(acc.id), "cpfs_used_year": acc.cpfs_used_year, "semaphore_status": acc.semaphore_status}


# ── 6. Bookings, Agency DRE (Intermediation vs Payout/ISS) & Boarding Radar ──

@router.post("/bookings")
async def create_booking(
    payload: BookingCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    fee = round(max(0.0, payload.sale_amount_brl - payload.supplier_cost_brl), 2)
    iss_tax = round(fee * (payload.iss_rate_pct / 100.0), 2)
    net_profit = round(fee - iss_tax, 2)
    dep_dt = datetime.fromisoformat(payload.departure_at.replace("Z", "+00:00"))
    ret_dt = datetime.fromisoformat(payload.return_at.replace("Z", "+00:00")) if payload.return_at else None

    bk = TurismoBooking(
        business_id=_sid(biz.id),
        quote_id=payload.quote_id,
        pnr_locator=payload.pnr_locator.upper(),
        passenger_name=payload.passenger_name,
        origin=payload.origin.upper(),
        destination=payload.destination.upper(),
        departure_at=dep_dt,
        return_at=ret_dt,
        sale_amount_brl=payload.sale_amount_brl,
        supplier_cost_brl=payload.supplier_cost_brl,
        agency_fee_brl=fee,
        iss_rate_pct=payload.iss_rate_pct,
        iss_tax_brl=iss_tax,
        net_profit_brl=net_profit,
        status="CONFIRMED",
    )
    db.add(bk)
    await db.commit()
    await db.refresh(bk)
    return {
        "id": str(bk.id),
        "pnr_locator": bk.pnr_locator,
        "agency_fee_brl": float(bk.agency_fee_brl),
        "iss_tax_brl": float(bk.iss_tax_brl),
        "net_profit_brl": float(bk.net_profit_brl),
    }


@router.get("/dre")
async def get_agency_dre(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    rows = (
        await db.execute(select(TurismoBooking).where(TurismoBooking.business_id == _sid(biz.id)))
    ).scalars().all()
    gross_sales = round(sum(float(b.sale_amount_brl) for b in rows), 2)
    supplier_payout = round(sum(float(b.supplier_cost_brl) for b in rows), 2)
    intermediation_rev = round(sum(float(b.agency_fee_brl) for b in rows), 2)
    iss_total = round(sum(float(b.iss_tax_brl) for b in rows), 2)
    net_profit = round(sum(float(b.net_profit_brl) for b in rows), 2)
    return {
        "bookings_count": len(rows),
        "gross_sales_brl": gross_sales,
        "supplier_payout_brl": supplier_payout,
        "intermediation_revenue_brl": intermediation_rev,
        "iss_tax_total_brl": iss_total,
        "net_profit_brl": net_profit,
    }


@router.post("/boarding-radar/run")
async def run_boarding_radar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    now = datetime.now(timezone.utc)
    rows = (
        await db.execute(select(TurismoBooking).where(TurismoBooking.business_id == _sid(biz.id)))
    ).scalars().all()
    dispatches = []
    for bk in rows:
        dep = bk.departure_at
        if dep.tzinfo is None:
            dep = dep.replace(tzinfo=timezone.utc)
        days_diff = (dep.date() - now.date()).days
        if days_diff == 7 and not bk.boarding_d7_sent:
            bk.boarding_d7_sent = True
            dispatches.append({"booking_id": str(bk.id), "stage": "D-7", "pnr": bk.pnr_locator})
        elif days_diff == 2 and not bk.boarding_d2_sent:
            bk.boarding_d2_sent = True
            dispatches.append({"booking_id": str(bk.id), "stage": "D-2", "pnr": bk.pnr_locator})
        elif days_diff == 0 and not bk.boarding_d0_sent:
            bk.boarding_d0_sent = True
            dispatches.append({"booking_id": str(bk.id), "stage": "D0", "pnr": bk.pnr_locator})
        elif days_diff == -2 and not bk.boarding_d2_post_sent:
            bk.boarding_d2_post_sent = True
            dispatches.append({"booking_id": str(bk.id), "stage": "D+2", "pnr": bk.pnr_locator})
    await db.commit()
    return {"processed": len(rows), "dispatches": dispatches}


# ── 7. Groups & Rooming List ─────────────────────────────────────────────────

@router.get("/groups")
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    rows = (
        await db.execute(
            select(TurismoGroup).where(TurismoGroup.business_id == _sid(biz.id)).order_by(TurismoGroup.created_at.desc())
        )
    ).scalars().all()
    return [
        {
            "id": str(g.id),
            "group_name": g.group_name,
            "destination": g.destination,
            "departure_date": g.departure_date,
            "max_members": g.max_members,
            "price_per_person_brl": float(g.price_per_person_brl),
            "status": g.status,
        }
        for g in rows
    ]


@router.post("/groups")
async def create_group(
    payload: GroupCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    grp = TurismoGroup(
        business_id=_sid(biz.id),
        group_name=payload.group_name,
        destination=payload.destination,
        departure_date=payload.departure_date,
        return_date=payload.return_date,
        max_members=payload.max_members,
        price_per_person_brl=payload.price_per_person_brl,
    )
    db.add(grp)
    await db.commit()
    await db.refresh(grp)
    return {"id": str(grp.id), "group_name": grp.group_name, "status": grp.status}


@router.get("/groups/{group_id}/members")
async def list_group_members(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    rows = (
        await db.execute(
            select(TurismoGroupMember).where(
                TurismoGroupMember.group_id == group_id,
                TurismoGroupMember.business_id == _sid(biz.id),
            )
        )
    ).scalars().all()
    return [
        {
            "id": str(m.id),
            "member_name": m.member_name,
            "room_number": m.room_number,
            "room_type": m.room_type,
            "amount_paid_brl": float(m.amount_paid_brl),
            "amount_due_brl": float(m.amount_due_brl),
            "payment_status": m.payment_status,
        }
        for m in rows
    ]


@router.post("/groups/{group_id}/members")
async def add_group_member(
    group_id: str,
    payload: GroupMemberCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    b_id = _sid(biz.id)
    grp = (
        await db.execute(select(TurismoGroup).where(TurismoGroup.id == group_id, TurismoGroup.business_id == b_id))
    ).scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    p_status = "PAID" if payload.amount_due_brl <= 0 or payload.amount_paid_brl >= payload.amount_due_brl else "PENDING"
    mem = TurismoGroupMember(
        business_id=b_id,
        group_id=group_id,
        member_name=payload.member_name,
        document_masked="***" if payload.document else None,
        room_number=payload.room_number,
        room_type=payload.room_type,
        amount_paid_brl=payload.amount_paid_brl,
        amount_due_brl=payload.amount_due_brl,
        payment_status=p_status,
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    return {"id": str(mem.id), "member_name": mem.member_name, "payment_status": mem.payment_status}


# ── 8. INHO Club VIP & Telegram Broadcast ────────────────────────────────────

@router.get("/club")
async def list_club_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    rows = (
        await db.execute(select(TurismoClubSubscription).where(TurismoClubSubscription.business_id == _sid(biz.id)))
    ).scalars().all()
    return [
        {
            "id": str(c.id),
            "member_name": c.member_name,
            "member_email": c.member_email,
            "telegram_chat_id": c.telegram_chat_id,
            "plan_price_brl": float(c.plan_price_brl),
            "discount_pct": float(c.discount_pct),
            "status": c.status,
        }
        for c in rows
    ]


@router.post("/club")
async def create_club_member(
    payload: ClubCreatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    sub = TurismoClubSubscription(
        business_id=_sid(biz.id),
        member_name=payload.member_name,
        member_email=payload.member_email,
        telegram_chat_id=payload.telegram_chat_id,
        plan_price_brl=payload.plan_price_brl,
        discount_pct=payload.discount_pct,
        status="ACTIVE",
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return {"id": str(sub.id), "status": sub.status, "discount_pct": float(sub.discount_pct)}


@router.post("/club/broadcast")
async def broadcast_club_vip(
    payload: ClubBroadcastPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    b_id = _sid(biz.id)
    cfg = (await db.execute(select(TurismoChannelConfig).where(TurismoChannelConfig.business_id == b_id))).scalar_one_or_none()
    bot_tok = decrypt_secret(cfg.encrypted_telegram_bot_token) if cfg and cfg.encrypted_telegram_bot_token else ""
    subs = (
        await db.execute(
            select(TurismoClubSubscription).where(
                TurismoClubSubscription.business_id == b_id,
                TurismoClubSubscription.status == "ACTIVE",
            )
        )
    ).scalars().all()
    sent = 0
    for s in subs:
        if s.telegram_chat_id:
            await send_omnichannel_message(
                channel="TELEGRAM",
                recipient=s.telegram_chat_id,
                text=f"🔥 *{payload.title}*\n{payload.message}",
                telegram_bot_token=bot_tok,
            )
            sent += 1
    return {"active_members": len(subs), "telegram_dispatches": sent}


# ── 9. Omnichannel Custo Zero (WhatsApp / Instagram / Telegram) + AI-First ───

@router.get("/channels")
async def get_channel_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    cfg = (
        await db.execute(select(TurismoChannelConfig).where(TurismoChannelConfig.business_id == _sid(biz.id)))
    ).scalar_one_or_none()
    return {
        "whatsapp_enabled": bool(cfg.whatsapp_enabled) if cfg else True,
        "instagram_enabled": bool(cfg.instagram_enabled) if cfg else False,
        "instagram_page_id": cfg.instagram_page_id if cfg else None,
        "has_instagram_token": bool(cfg and cfg.encrypted_instagram_token),
        "telegram_enabled": bool(cfg.telegram_enabled) if cfg else False,
        "has_telegram_token": bool(cfg and cfg.encrypted_telegram_bot_token),
        "telegram_vip_channel_id": cfg.telegram_vip_channel_id if cfg else None,
        "ai_first_enabled": bool(cfg.ai_first_enabled) if cfg else True,
    }


@router.post("/channels")
async def save_channel_config(
    payload: ChannelConfigPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    b_id = _sid(biz.id)
    cfg = (await db.execute(select(TurismoChannelConfig).where(TurismoChannelConfig.business_id == b_id))).scalar_one_or_none()
    if not cfg:
        cfg = TurismoChannelConfig(business_id=b_id)
        db.add(cfg)
    cfg.whatsapp_enabled = payload.whatsapp_enabled
    cfg.instagram_enabled = payload.instagram_enabled
    cfg.instagram_page_id = payload.instagram_page_id
    if payload.instagram_access_token:
        cfg.encrypted_instagram_token = encrypt_secret(payload.instagram_access_token)
    cfg.telegram_enabled = payload.telegram_enabled
    if payload.telegram_bot_token:
        cfg.encrypted_telegram_bot_token = encrypt_secret(payload.telegram_bot_token)
    cfg.telegram_vip_channel_id = payload.telegram_vip_channel_id
    cfg.ai_first_enabled = payload.ai_first_enabled
    await db.commit()
    return {"status": "saved", "ai_first_enabled": cfg.ai_first_enabled}


@router.post("/omnichannel/inbound")
async def process_turismo_omnichannel_inbound(
    payload: OmnichannelInboundPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _biz(db, current_user)
    b_id = _sid(biz.id)
    ch = payload.channel.upper()
    ai_out = await classify_and_respond_orbrick(
        business_id=b_id,
        business_name=biz.name,
        contact_id=None,
        contact_name=payload.sender_name or "Viajante",
        incoming_message=payload.message_text,
        simulate_ai_offline=payload.simulate_ai_offline,
    )
    esc = evaluate_human_last_escalation(
        message=payload.message_text,
        intent=ai_out.get("intent", ""),
        intent_confidence=float(ai_out.get("intent_confidence", 0.9)),
        sentiment=str(ai_out.get("sentiment", "NEUTRAL")),
        is_final_emission=payload.is_final_emission,
        financial_exception=payload.financial_exception,
    )
    handled_by = "HUMAN_LAST" if esc["escalate"] else "AI_FIRST"
    reply = (
        f"*{biz.name}>Turismo-IA>*\n\n{esc['reason']} Um consultor especializado já recebeu seu histórico."
        if esc["escalate"]
        else ai_out["reply_text"]
    )

    db.add(TurismoChannelMessage(
        business_id=b_id, channel=ch, sender_ref=payload.sender_ref,
        direction="INBOUND", message_text=payload.message_text,
        handled_by=handled_by, escalation_trigger=esc["trigger"],
    ))
    db.add(TurismoChannelMessage(
        business_id=b_id, channel=ch, sender_ref=payload.sender_ref,
        direction="OUTBOUND", message_text=reply,
        handled_by=handled_by, escalation_trigger=esc["trigger"],
    ))
    db.add(AuditLog(
        business_id=b_id, user_id=_sid(current_user.id), user_name=current_user.full_name,
        user_role=str(getattr(current_user, "role", "operator")),
        action=AuditAction.UPDATE, entity="TURISMO_OMNICHANNEL", entity_id=b_id,
        detail=f"ch={ch} handled_by={handled_by} trigger={esc['trigger']}",
    ))
    await db.commit()
    delivery = await send_omnichannel_message(channel=ch, recipient=payload.sender_ref, text=reply)
    return {
        "channel": ch,
        "handled_by": handled_by,
        "escalation_trigger": esc["trigger"],
        "reply_text": reply,
        "delivery": delivery,
    }


@router.post("/webhooks/instagram")
async def instagram_official_webhook(payload: Dict[str, Any]):
    events = parse_instagram_webhook_events(payload)
    return {"received": len(events), "events": events}


@router.post("/webhooks/telegram")
async def telegram_official_webhook(payload: Dict[str, Any]):
    ev = parse_telegram_webhook_event(payload)
    return {"received": 1 if ev else 0, "event": ev}
