"""
OrbeJobs — Router FastAPI (Phases 1 a 5)
Módulo completo de Carreira Inteligente Zero-Key + IMORTAL Predictive Cascade Router:
- Living CV (JSON Resume + PDF upload + WhatsApp updates)
- Motor de varredura híbrido (Greenhouse, Lever, RSS, Playwright)
- Esteira Kanban de candidaturas com UniqueConstraint(user_id, job_url_hash)
- Cofre OAuth2 (gmail.send) MultiFernet AES-256 + Validação DNS MX + Jitter + Teto 10-15/dia + Kill-Switch
- Trilha de Auditoria e Anonimização LGPD (Art. 18)
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import (
    AuditAction,
    AuditLog,
    LivingCVProfile,
    OrbeJobApplication,
    OrbeJobListing,
    OrbeJobOAuthVault,
    OrbeJobSendLog,
    OrbeJobSendQueue,
    User,
)
from routers.billing import _get_user_business
from services.ai_agent import (
    compute_text_embedding,
    prefilter_pgvector_candidates,
)
from services.orbejobs_mailer import (
    MAX_DAILY_SEND_HARD_CAP,
    build_gmail_oauth_url,
    clamp_daily_limit,
    compute_random_jitter_seconds,
    count_daily_sent_emails,
    dispatch_queue_item,
    save_oauth_vault_tokens,
    validate_email_mx_records,
)
from services.orbejobs_scraper import (
    canonicalize_job_url,
    compute_job_url_hash,
    extract_skills_from_text,
    run_hybrid_scrape,
)
from services.orbejobs_service import (
    VALID_KANBAN_STAGES,
    apply_whatsapp_living_cv_command,
    build_living_cv_search_text,
    compute_living_cv_embedding,
    default_json_resume,
    extract_pdf_text_bytes,
    merge_pdf_text_into_resume,
    normalize_json_resume,
    score_cv_vs_job,
    tailor_application_with_imortal,
)

router = APIRouter(prefix="/api/v1/orbejobs", tags=["OrbeJobs — Zero-Key + IMORTAL"])


# ── Pydantic Schemas ─────────────────────────────────────────────────

class LivingCVUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    target_roles: Optional[List[str]] = None
    json_resume: Optional[Dict[str, Any]] = None
    human_in_the_loop: Optional[bool] = None
    daily_send_limit: Optional[int] = Field(default=None, ge=1, le=MAX_DAILY_SEND_HARD_CAP)


class WhatsAppLivingCVRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=2000)
    phone: Optional[str] = None


class ManualJobInput(BaseModel):
    source_ats: str = "manual"
    company_name: str
    title: str
    job_url: str
    location: Optional[str] = "Remote"
    remote_type: Optional[str] = "remote"
    recipient_email: Optional[str] = None
    description_text: str = ""
    skills_tags: Optional[List[str]] = None


class ScrapeRequest(BaseModel):
    greenhouse_boards: List[str] = Field(default_factory=list)
    lever_companies: List[str] = Field(default_factory=list)
    rss_feeds: List[str] = Field(default_factory=list)
    playwright_urls: List[str] = Field(default_factory=list)
    manual_jobs: List[ManualJobInput] = Field(default_factory=list)
    limit_per_source: int = Field(default=20, ge=1, le=100)
    auto_create_kanban: bool = True


class ApplicationCreateRequest(BaseModel):
    job_id: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    job_url: Optional[str] = None
    recipient_email: Optional[str] = None
    description_text: Optional[str] = ""
    stage: str = "DISCOVERED"
    skip_duplicates: bool = False


class ApplicationStagePatchRequest(BaseModel):
    stage: Optional[str] = None
    approved_by_human: Optional[bool] = None
    recipient_email: Optional[str] = None


class TailorApplicationRequest(BaseModel):
    simulate_offline: bool = False


class OAuthVaultSaveRequest(BaseModel):
    account_email: str
    access_token: str = Field(..., min_length=8)
    refresh_token: Optional[str] = None
    scopes: str = "https://www.googleapis.com/auth/gmail.send"
    expires_in_seconds: Optional[int] = 3600


class MXCheckRequest(BaseModel):
    email: str


class EnqueueSendRequest(BaseModel):
    application_id: str
    recipient_email: Optional[str] = None
    subject: Optional[str] = None
    body_text: Optional[str] = None
    auto_dispatch: bool = False


class KillSwitchRequest(BaseModel):
    active: bool
    reason: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────

async def _ensure_living_cv(
    db: AsyncSession,
    business_id: str,
    user: User,
) -> LivingCVProfile:
    uid = str(user.id)
    profile = (
        await db.execute(
            select(LivingCVProfile).where(
                LivingCVProfile.business_id == business_id,
                LivingCVProfile.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if profile:
        return profile

    base_resume = default_json_resume(user.full_name, user.email)
    vec = compute_living_cv_embedding(base_resume)
    profile = LivingCVProfile(
        id=str(uuid.uuid4()),
        business_id=business_id,
        user_id=uid,
        full_name=user.full_name or "Profissional Orbe",
        headline=base_resume["basics"]["label"],
        target_roles=json.dumps(["Backend Engineer", "Fullstack Engineer", "Security Engineer"]),
        json_resume=json.dumps(base_resume, ensure_ascii=False),
        embedding_json=json.dumps(vec),
        human_in_the_loop=True,
        daily_send_limit=12,
        kill_switch_active=False,
    )
    db.add(profile)
    await db.flush()
    return profile


def _serialize_profile(profile: LivingCVProfile) -> Dict[str, Any]:
    resume = normalize_json_resume(profile.json_resume, profile.full_name)
    try:
        roles = json.loads(profile.target_roles or "[]")
    except Exception:
        roles = []
    return {
        "id": str(profile.id),
        "business_id": str(profile.business_id),
        "user_id": str(profile.user_id),
        "full_name": profile.full_name,
        "headline": profile.headline,
        "target_roles": roles,
        "json_resume": resume,
        "human_in_the_loop": bool(profile.human_in_the_loop),
        "daily_send_limit": clamp_daily_limit(profile.daily_send_limit),
        "kill_switch_active": bool(profile.kill_switch_active),
        "whatsapp_source_phone": profile.whatsapp_source_phone,
        "last_pdf_sha256": profile.last_pdf_sha256,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def _serialize_application(app_obj: OrbeJobApplication) -> Dict[str, Any]:
    tailored_cv = None
    if app_obj.tailored_resume_json:
        try:
            tailored_cv = json.loads(app_obj.tailored_resume_json)
        except Exception:
            tailored_cv = None
    return {
        "id": str(app_obj.id),
        "business_id": str(app_obj.business_id),
        "user_id": str(app_obj.user_id),
        "job_id": str(app_obj.job_id) if app_obj.job_id else None,
        "job_url_hash": app_obj.job_url_hash,
        "company_name": app_obj.company_name,
        "job_title": app_obj.job_title,
        "job_url": app_obj.job_url,
        "recipient_email": app_obj.recipient_email,
        "stage": app_obj.stage,
        "match_score": float(app_obj.match_score or 0.0),
        "tailored_cover_letter": app_obj.tailored_cover_letter,
        "tailored_resume": tailored_cv,
        "ai_provider_used": app_obj.ai_provider_used,
        "requires_approval": bool(app_obj.requires_approval),
        "approved_by_human": bool(app_obj.approved_by_human),
        "approved_at": app_obj.approved_at.isoformat() if app_obj.approved_at else None,
        "applied_at": app_obj.applied_at.isoformat() if app_obj.applied_at else None,
        "created_at": app_obj.created_at.isoformat() if app_obj.created_at else None,
        "updated_at": app_obj.updated_at.isoformat() if app_obj.updated_at else None,
    }


# ── Dashboard & Living CV ────────────────────────────────────────────

@router.get("/dashboard")
async def get_orbejobs_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)

    profile = await _ensure_living_cv(db, b_id, current_user)
    sent_today = await count_daily_sent_emails(db, business_id=b_id, user_id=uid)

    apps = (
        await db.execute(
            select(OrbeJobApplication)
            .where(OrbeJobApplication.business_id == b_id, OrbeJobApplication.user_id == uid)
            .order_by(OrbeJobApplication.updated_at.desc())
        )
    ).scalars().all()

    listings_count = len(
        (
            await db.execute(
                select(OrbeJobListing.id).where(OrbeJobListing.business_id == b_id)
            )
        ).scalars().all()
    )

    queue_items = (
        await db.execute(
            select(OrbeJobSendQueue)
            .where(OrbeJobSendQueue.business_id == b_id, OrbeJobSendQueue.user_id == uid)
            .order_by(OrbeJobSendQueue.created_at.desc())
            .limit(30)
        )
    ).scalars().all()

    vault = (
        await db.execute(
            select(OrbeJobOAuthVault).where(
                OrbeJobOAuthVault.business_id == b_id,
                OrbeJobOAuthVault.user_id == uid,
                OrbeJobOAuthVault.provider == "gmail",
            )
        )
    ).scalar_one_or_none()

    stage_counts: Dict[str, int] = {st: 0 for st in VALID_KANBAN_STAGES}
    for a in apps:
        stage_counts[a.stage] = stage_counts.get(a.stage, 0) + 1

    await db.commit()
    return {
        "business_id": b_id,
        "profile": _serialize_profile(profile),
        "daily_quota": {
            "sent_today": sent_today,
            "daily_send_limit": clamp_daily_limit(profile.daily_send_limit),
            "hard_cap": MAX_DAILY_SEND_HARD_CAP,
            "remaining_today": max(0, clamp_daily_limit(profile.daily_send_limit) - sent_today),
        },
        "oauth_vault": {
            "connected": bool(vault and vault.is_active),
            "provider": "gmail",
            "account_email": vault.account_email if vault else None,
            "scopes": vault.scopes if vault else None,
            "cipher_algorithm": "MultiFernet AES-256",
        },
        "listings_count": listings_count,
        "stage_counts": stage_counts,
        "applications": [_serialize_application(a) for a in apps],
        "queue": [
            {
                "id": str(q.id),
                "application_id": str(q.application_id),
                "recipient_email": q.recipient_email,
                "subject": q.subject,
                "mx_valid": bool(q.mx_valid),
                "status": q.status,
                "jitter_seconds": float(q.jitter_seconds or 0.0),
                "error_message": q.error_message,
                "sent_at": q.sent_at.isoformat() if q.sent_at else None,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in queue_items
        ],
    }


@router.get("/living-cv")
async def get_living_cv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    profile = await _ensure_living_cv(db, str(business.id), current_user)
    await db.commit()
    return _serialize_profile(profile)


@router.put("/living-cv")
async def update_living_cv(
    payload: LivingCVUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip()
    if payload.headline is not None:
        profile.headline = payload.headline.strip()
    if payload.target_roles is not None:
        profile.target_roles = json.dumps(payload.target_roles, ensure_ascii=False)
    if payload.human_in_the_loop is not None:
        profile.human_in_the_loop = bool(payload.human_in_the_loop)
    if payload.daily_send_limit is not None:
        profile.daily_send_limit = clamp_daily_limit(payload.daily_send_limit)

    resume = normalize_json_resume(
        payload.json_resume if payload.json_resume is not None else profile.json_resume,
        profile.full_name,
        current_user.email,
    )
    if payload.headline is not None:
        resume["basics"]["label"] = profile.headline
    profile.json_resume = json.dumps(resume, ensure_ascii=False)
    profile.embedding_json = json.dumps(compute_living_cv_embedding(resume, profile.headline))

    db.add(AuditLog(
        business_id=b_id,
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action=AuditAction.UPDATE,
        entity="ORBEJOBS_LIVING_CV",
        entity_id=str(profile.id),
        detail="Living CV JSON Resume atualizado.",
    ))
    await db.commit()
    await db.refresh(profile)
    return _serialize_profile(profile)


@router.post("/living-cv/whatsapp-update")
async def update_living_cv_via_whatsapp(
    payload: WhatsAppLivingCVRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    current_resume = normalize_json_resume(profile.json_resume, profile.full_name, current_user.email)
    updated_resume, actions = apply_whatsapp_living_cv_command(current_resume, payload.message)
    profile.json_resume = json.dumps(updated_resume, ensure_ascii=False)
    profile.embedding_json = json.dumps(compute_living_cv_embedding(updated_resume, profile.headline))
    if payload.phone:
        profile.whatsapp_source_phone = payload.phone.strip()

    db.add(AuditLog(
        business_id=b_id,
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action=AuditAction.UPDATE,
        entity="ORBEJOBS_WHATSAPP_CV",
        entity_id=str(profile.id),
        detail=f"Atualização Living CV via WhatsApp: {'; '.join(actions)}",
    ))
    await db.commit()
    await db.refresh(profile)
    return {"actions": actions, "profile": _serialize_profile(profile)}


@router.post("/living-cv/upload-pdf")
async def upload_living_cv_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    raw_bytes = await file.read()
    if len(raw_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF excede o limite máximo de 5MB.")

    extracted_text, pdf_sha = extract_pdf_text_bytes(raw_bytes)
    current_resume = normalize_json_resume(profile.json_resume, profile.full_name, current_user.email)
    updated_resume = merge_pdf_text_into_resume(current_resume, extracted_text)

    profile.json_resume = json.dumps(updated_resume, ensure_ascii=False)
    profile.embedding_json = json.dumps(compute_living_cv_embedding(updated_resume, profile.headline))
    profile.last_pdf_sha256 = pdf_sha

    db.add(AuditLog(
        business_id=b_id,
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action=AuditAction.UPDATE,
        entity="ORBEJOBS_PDF_CV",
        entity_id=str(profile.id),
        detail=f"PDF '{file.filename}' processado (sha256={pdf_sha[:16]}).",
    ))
    await db.commit()
    await db.refresh(profile)
    return {
        "filename": file.filename,
        "pdf_sha256": pdf_sha,
        "extracted_chars": len(extracted_text),
        "profile": _serialize_profile(profile),
    }


# ── Scraper Híbrido & Listagem pgvector ──────────────────────────────

@router.post("/scrape")
async def trigger_orbejobs_scrape(
    payload: ScrapeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    cv_resume = normalize_json_resume(profile.json_resume, profile.full_name)
    cv_text = build_living_cv_search_text(cv_resume, profile.headline)
    cv_vec = compute_living_cv_embedding(cv_resume, profile.headline)

    scraped = await run_hybrid_scrape(
        greenhouse_boards=payload.greenhouse_boards,
        lever_companies=payload.lever_companies,
        rss_feeds=payload.rss_feeds,
        playwright_urls=payload.playwright_urls,
        limit_per_source=payload.limit_per_source,
    )

    for mj in payload.manual_jobs:
        canon = canonicalize_job_url(mj.job_url)
        j_hash = compute_job_url_hash(canon)
        scraped.append({
            "source_ats": mj.source_ats,
            "company_name": mj.company_name,
            "title": mj.title,
            "location": mj.location,
            "remote_type": mj.remote_type,
            "job_url": canon,
            "job_url_hash": j_hash,
            "recipient_email": mj.recipient_email,
            "description_text": mj.description_text,
            "skills_tags": mj.skills_tags or extract_skills_from_text(f"{mj.title} {mj.description_text}"),
            "published_at": datetime.now(timezone.utc),
        })

    existing_hashes = set(
        (
            await db.execute(
                select(OrbeJobListing.job_url_hash).where(OrbeJobListing.business_id == b_id)
            )
        ).scalars().all()
    )
    existing_app_hashes = set(
        (
            await db.execute(
                select(OrbeJobApplication.job_url_hash).where(OrbeJobApplication.user_id == uid)
            )
        ).scalars().all()
    )

    inserted_listings = 0
    created_apps = 0
    for item in scraped:
        j_hash = item["job_url_hash"]
        desc_full = f"{item['title']} {item.get('description_text', '')}"
        j_vec = compute_text_embedding(desc_full)

        listing_id: Optional[str] = None
        if j_hash not in existing_hashes:
            listing = OrbeJobListing(
                id=str(uuid.uuid4()),
                business_id=b_id,
                source_ats=item["source_ats"],
                company_name=item["company_name"],
                title=item["title"],
                location=item.get("location"),
                remote_type=item.get("remote_type"),
                job_url=item["job_url"],
                job_url_hash=j_hash,
                recipient_email=item.get("recipient_email"),
                description_text=item.get("description_text", ""),
                skills_tags=json.dumps(item.get("skills_tags") or []),
                embedding_json=json.dumps(j_vec),
                published_at=item.get("published_at"),
            )
            db.add(listing)
            await db.flush()
            existing_hashes.add(j_hash)
            listing_id = str(listing.id)
            inserted_listings += 1

        if payload.auto_create_kanban and j_hash not in existing_app_hashes:
            m_score = score_cv_vs_job(cv_vec, cv_text, item["title"], item.get("description_text", ""), j_vec)
            app_row = OrbeJobApplication(
                id=str(uuid.uuid4()),
                business_id=b_id,
                user_id=uid,
                job_id=listing_id,
                job_url_hash=j_hash,
                company_name=item["company_name"],
                job_title=item["title"],
                job_url=item["job_url"],
                recipient_email=item.get("recipient_email"),
                stage="DISCOVERED",
                match_score=m_score,
                requires_approval=bool(profile.human_in_the_loop),
            )
            db.add(app_row)
            existing_app_hashes.add(j_hash)
            created_apps += 1

    await db.commit()
    return {
        "scraped_total": len(scraped),
        "inserted_listings": inserted_listings,
        "created_kanban_cards": created_apps,
    }


@router.get("/listings")
async def list_orbejobs_listings(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    profile = await _ensure_living_cv(db, b_id, current_user)
    cv_resume = normalize_json_resume(profile.json_resume, profile.full_name)
    cv_query = build_living_cv_search_text(cv_resume, profile.headline)

    rows = (
        await db.execute(
            select(OrbeJobListing)
            .where(OrbeJobListing.business_id == b_id)
            .order_by(OrbeJobListing.created_at.desc())
            .limit(100)
        )
    ).scalars().all()

    raw_items = [
        {
            "id": str(r.id),
            "source_ats": r.source_ats,
            "company_name": r.company_name,
            "title": r.title,
            "location": r.location,
            "remote_type": r.remote_type,
            "job_url": r.job_url,
            "job_url_hash": r.job_url_hash,
            "recipient_email": r.recipient_email,
            "description_text": r.description_text,
            "skills_tags": json.loads(r.skills_tags or "[]"),
            "embedding_json": r.embedding_json,
        }
        for r in rows
    ]
    ranked = prefilter_pgvector_candidates(cv_query, raw_items, top_k=limit, min_score=0.0)
    for item in ranked:
        item.pop("embedding_json", None)
    return ranked


# ── Kanban de Candidaturas & IA IMORTAL ──────────────────────────────

@router.get("/applications")
async def list_applications(
    stage: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    query = select(OrbeJobApplication).where(
        OrbeJobApplication.business_id == str(business.id),
        OrbeJobApplication.user_id == str(current_user.id),
    )
    if stage:
        query = query.where(OrbeJobApplication.stage == stage.upper())
    rows = (await db.execute(query.order_by(OrbeJobApplication.updated_at.desc()))).scalars().all()
    return [_serialize_application(r) for r in rows]


@router.post("/applications", status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    stage = payload.stage.upper()
    if stage not in VALID_KANBAN_STAGES:
        raise HTTPException(status_code=400, detail=f"Stage inválido. Valores aceitos: {VALID_KANBAN_STAGES}")

    listing = None
    if payload.job_id:
        listing = (
            await db.execute(
                select(OrbeJobListing).where(
                    OrbeJobListing.id == payload.job_id,
                    OrbeJobListing.business_id == b_id,
                )
            )
        ).scalar_one_or_none()
        if not listing:
            raise HTTPException(status_code=404, detail="Vaga não encontrada.")

    job_url = canonicalize_job_url(listing.job_url if listing else (payload.job_url or ""))
    company_name = listing.company_name if listing else (payload.company_name or "")
    job_title = listing.title if listing else (payload.job_title or "")
    if not job_url or not company_name or not job_title:
        raise HTTPException(status_code=400, detail="Informe job_id ou company_name, job_title e job_url.")

    j_hash = compute_job_url_hash(job_url)
    existing = (
        await db.execute(
            select(OrbeJobApplication).where(
                OrbeJobApplication.user_id == uid,
                OrbeJobApplication.job_url_hash == j_hash,
            )
        )
    ).scalar_one_or_none()
    if existing:
        if payload.skip_duplicates:
            return _serialize_application(existing)
        raise HTTPException(status_code=409, detail="Candidatura duplicada para este usuário e URL de vaga.")

    cv_resume = normalize_json_resume(profile.json_resume, profile.full_name)
    cv_text = build_living_cv_search_text(cv_resume, profile.headline)
    cv_vec = compute_living_cv_embedding(cv_resume, profile.headline)
    desc = listing.description_text if listing else (payload.description_text or "")
    m_score = score_cv_vs_job(cv_vec, cv_text, job_title, desc)

    app_obj = OrbeJobApplication(
        id=str(uuid.uuid4()),
        business_id=b_id,
        user_id=uid,
        job_id=str(listing.id) if listing else None,
        job_url_hash=j_hash,
        company_name=company_name[:200],
        job_title=job_title[:255],
        job_url=job_url[:1000],
        recipient_email=payload.recipient_email or (listing.recipient_email if listing else None),
        stage=stage,
        match_score=m_score,
        requires_approval=bool(profile.human_in_the_loop),
    )
    db.add(app_obj)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Candidatura já registrada (UniqueConstraint user_id + job_url_hash).")
    await db.refresh(app_obj)
    return _serialize_application(app_obj)


@router.patch("/applications/{app_id}/stage")
async def update_application_stage(
    app_id: str,
    payload: ApplicationStagePatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    app_obj = (
        await db.execute(
            select(OrbeJobApplication).where(
                OrbeJobApplication.id == app_id,
                OrbeJobApplication.business_id == str(business.id),
                OrbeJobApplication.user_id == str(current_user.id),
            )
        )
    ).scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Candidatura não encontrada.")

    if payload.stage is not None:
        st = payload.stage.upper()
        if st not in VALID_KANBAN_STAGES:
            raise HTTPException(status_code=400, detail=f"Stage inválido. Valores aceitos: {VALID_KANBAN_STAGES}")
        app_obj.stage = st

    if payload.approved_by_human is not None:
        app_obj.approved_by_human = bool(payload.approved_by_human)
        app_obj.approved_at = datetime.now(timezone.utc) if payload.approved_by_human else None

    if payload.recipient_email is not None:
        app_obj.recipient_email = payload.recipient_email.strip().lower()

    db.add(AuditLog(
        business_id=str(business.id),
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action=AuditAction.UPDATE,
        entity="ORBEJOBS_KANBAN",
        entity_id=str(app_obj.id),
        detail=f"stage={app_obj.stage}; approved_by_human={app_obj.approved_by_human}",
    ))
    await db.commit()
    await db.refresh(app_obj)
    return _serialize_application(app_obj)


@router.post("/applications/{app_id}/tailor")
async def tailor_application(
    app_id: str,
    payload: TailorApplicationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    app_obj = (
        await db.execute(
            select(OrbeJobApplication).where(
                OrbeJobApplication.id == app_id,
                OrbeJobApplication.business_id == b_id,
                OrbeJobApplication.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Candidatura não encontrada.")

    desc = ""
    if app_obj.job_id:
        listing = (
            await db.execute(select(OrbeJobListing).where(OrbeJobListing.id == app_obj.job_id))
        ).scalar_one_or_none()
        if listing:
            desc = listing.description_text or ""

    resume = normalize_json_resume(profile.json_resume, profile.full_name, current_user.email)
    tailored = await tailor_application_with_imortal(
        resume=resume,
        job_title=app_obj.job_title,
        company_name=app_obj.company_name,
        job_description=desc or app_obj.job_title,
        simulate_offline=payload.simulate_offline,
    )

    app_obj.tailored_cover_letter = tailored["cover_letter"]
    app_obj.tailored_resume_json = json.dumps(tailored["tailored_resume"], ensure_ascii=False)
    app_obj.ai_provider_used = tailored["ai_provider"]
    if app_obj.stage == "DISCOVERED":
        app_obj.stage = "TAILORED"

    await db.commit()
    await db.refresh(app_obj)
    return {
        "application": _serialize_application(app_obj),
        "ai_provider": tailored["ai_provider"],
        "cache_hit": tailored["cache_hit"],
        "pgvector_score": tailored["pgvector_score"],
    }


# ── Gmail OAuth2 Vault, DNS MX, Fila, Kill-Switch & LGPD ─────────────

@router.get("/oauth/gmail/url")
async def get_gmail_oauth_url(
    redirect_uri: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    state_token = hashlib.sha256(f"{business.id}:{current_user.id}".encode("utf-8")).hexdigest()[:24]
    return build_gmail_oauth_url(state_token=state_token, redirect_uri=redirect_uri)


@router.post("/oauth/gmail/vault")
async def save_gmail_oauth_vault(
    payload: OAuthVaultSaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)

    vault = await save_oauth_vault_tokens(
        db,
        business_id=b_id,
        user_id=uid,
        account_email=payload.account_email,
        access_token=payload.access_token,
        refresh_token=payload.refresh_token,
        scopes=payload.scopes,
        expires_in_seconds=payload.expires_in_seconds,
    )
    db.add(AuditLog(
        business_id=b_id,
        user_id=uid,
        user_name=current_user.full_name,
        action=AuditAction.UPDATE,
        entity="ORBEJOBS_OAUTH_VAULT",
        entity_id=str(vault.id),
        detail=f"Token OAuth2 (gmail.send) armazenado em cofre MultiFernet AES-256 para {vault.account_email}.",
    ))
    await db.commit()
    return {
        "connected": True,
        "provider": vault.provider,
        "account_email": vault.account_email,
        "scopes": vault.scopes,
        "cipher_algorithm": "MultiFernet AES-256",
    }


@router.post("/dns-mx/check")
async def check_dns_mx(
    payload: MXCheckRequest,
    current_user: User = Depends(get_current_user),
):
    ok, hosts, err = validate_email_mx_records(payload.email)
    return {"email": payload.email.strip().lower(), "mx_valid": ok, "mx_hosts": hosts, "error": err}


@router.post("/queue/enqueue")
async def enqueue_orbejobs_email(
    payload: EnqueueSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    if profile.kill_switch_active:
        raise HTTPException(status_code=423, detail="Kill-Switch OrbeJobs ativo: novos enfileiramentos bloqueados.")

    app_obj = (
        await db.execute(
            select(OrbeJobApplication).where(
                OrbeJobApplication.id == payload.application_id,
                OrbeJobApplication.business_id == b_id,
                OrbeJobApplication.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Candidatura não encontrada.")

    recipient = (payload.recipient_email or app_obj.recipient_email or "").strip().lower()
    if not recipient:
        raise HTTPException(status_code=400, detail="E-mail destinatário obrigatório para enfileirar envio.")

    mx_ok, mx_hosts, mx_err = validate_email_mx_records(recipient)
    if not mx_ok:
        raise HTTPException(status_code=422, detail=mx_err or "Domínio sem registro DNS MX válido.")

    jitter = compute_random_jitter_seconds()
    subject = (payload.subject or f"Candidatura: {app_obj.job_title} — {profile.full_name}").strip()[:300]
    body_text = (payload.body_text or app_obj.tailored_cover_letter or "").strip()
    if not body_text:
        raise HTTPException(status_code=400, detail="Gere a carta de apresentação (IA IMORTAL) ou informe body_text.")

    needs_approval = bool(profile.human_in_the_loop and not app_obj.approved_by_human)
    q_item = OrbeJobSendQueue(
        id=str(uuid.uuid4()),
        business_id=b_id,
        user_id=uid,
        application_id=str(app_obj.id),
        recipient_email=recipient,
        subject=subject,
        body_text=body_text,
        mx_valid=mx_ok,
        mx_records_json=json.dumps(mx_hosts),
        status="PENDING_APPROVAL" if needs_approval else "QUEUED",
        jitter_seconds=jitter,
    )
    db.add(q_item)
    app_obj.recipient_email = recipient
    app_obj.stage = "READY_TO_SEND"
    await db.flush()

    dispatch_res = None
    if payload.auto_dispatch and not needs_approval:
        vault = (
            await db.execute(
                select(OrbeJobOAuthVault).where(
                    OrbeJobOAuthVault.business_id == b_id,
                    OrbeJobOAuthVault.user_id == uid,
                    OrbeJobOAuthVault.provider == "gmail",
                )
            )
        ).scalar_one_or_none()
        dispatch_res = await dispatch_queue_item(
            db,
            queue_item=q_item,
            profile=profile,
            vault=vault,
            mx_resolver_fn=lambda _dom: mx_hosts,
        )

    await db.commit()
    return {
        "queue_id": str(q_item.id),
        "status": q_item.status,
        "mx_valid": mx_ok,
        "mx_hosts": mx_hosts,
        "jitter_seconds": jitter,
        "requires_human_approval": needs_approval,
        "dispatch": dispatch_res,
    }


@router.post("/queue/{queue_id}/dispatch")
async def dispatch_orbejobs_queue_item(
    queue_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    q_item = (
        await db.execute(
            select(OrbeJobSendQueue).where(
                OrbeJobSendQueue.id == queue_id,
                OrbeJobSendQueue.business_id == b_id,
                OrbeJobSendQueue.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if not q_item:
        raise HTTPException(status_code=404, detail="Item de fila não encontrado.")

    vault = (
        await db.execute(
            select(OrbeJobOAuthVault).where(
                OrbeJobOAuthVault.business_id == b_id,
                OrbeJobOAuthVault.user_id == uid,
                OrbeJobOAuthVault.provider == "gmail",
            )
        )
    ).scalar_one_or_none()

    res = await dispatch_queue_item(db, queue_item=q_item, profile=profile, vault=vault)
    await db.commit()
    return res


@router.post("/kill-switch")
async def toggle_orbejobs_kill_switch(
    payload: KillSwitchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)
    profile = await _ensure_living_cv(db, b_id, current_user)

    profile.kill_switch_active = bool(payload.active)
    db.add(AuditLog(
        business_id=b_id,
        user_id=uid,
        user_name=current_user.full_name,
        action=AuditAction.UPDATE,
        entity="ORBEJOBS_KILL_SWITCH",
        entity_id=str(profile.id),
        detail=f"kill_switch_active={profile.kill_switch_active}; reason={payload.reason or 'manual'}",
    ))
    await db.commit()
    return {
        "kill_switch_active": bool(profile.kill_switch_active),
        "reason": payload.reason or ("Ativado pelo usuário" if profile.kill_switch_active else "Reativado pelo usuário"),
    }


@router.get("/lgpd/audit")
async def get_orbejobs_lgpd_audit(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)

    send_logs = (
        await db.execute(
            select(OrbeJobSendLog)
            .where(OrbeJobSendLog.business_id == b_id, OrbeJobSendLog.user_id == uid)
            .order_by(OrbeJobSendLog.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()

    audit_events = (
        await db.execute(
            select(AuditLog)
            .where(
                AuditLog.business_id == b_id,
                AuditLog.entity.like("ORBEJOBS_%"),
            )
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
        )
    ).scalars().all()

    return {
        "send_logs": [
            {
                "id": str(lg.id),
                "recipient_email": lg.recipient_email,
                "gmail_message_id": lg.gmail_message_id,
                "mx_host": lg.mx_host,
                "status": lg.status,
                "latency_ms": lg.latency_ms,
                "lgpd_audit_hash": lg.lgpd_audit_hash,
                "detail": lg.detail,
                "created_at": lg.created_at.isoformat() if lg.created_at else None,
            }
            for lg in send_logs
        ],
        "audit_events": [
            {
                "id": str(ev.id),
                "entity": ev.entity,
                "action": ev.action.value if hasattr(ev.action, "value") else str(ev.action),
                "detail": ev.detail,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
            }
            for ev in audit_events
        ],
    }


@router.delete("/lgpd/purge")
async def purge_orbejobs_lgpd_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Direito ao Esquecimento LGPD (Art. 18): anonimiza Living CV, remove tokens OAuth2
    e apaga destinatários sensíveis mantendo apenas hashes imutáveis de auditoria.
    """
    business = await _get_user_business(db, current_user)
    b_id = str(business.id)
    uid = str(current_user.id)

    profile = (
        await db.execute(
            select(LivingCVProfile).where(
                LivingCVProfile.business_id == b_id,
                LivingCVProfile.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if profile:
        profile.full_name = "[ANONIMIZADO LGPD]"
        profile.headline = None
        profile.target_roles = "[]"
        profile.json_resume = json.dumps(default_json_resume("[ANONIMIZADO LGPD]", ""))
        profile.embedding_json = None
        profile.whatsapp_source_phone = None
        profile.last_pdf_sha256 = None
        profile.kill_switch_active = True

    vault = (
        await db.execute(
            select(OrbeJobOAuthVault).where(
                OrbeJobOAuthVault.business_id == b_id,
                OrbeJobOAuthVault.user_id == uid,
            )
        )
    ).scalar_one_or_none()
    if vault:
        await db.delete(vault)

    send_logs = (
        await db.execute(
            select(OrbeJobSendLog).where(
                OrbeJobSendLog.business_id == b_id,
                OrbeJobSendLog.user_id == uid,
            )
        )
    ).scalars().all()
    for lg in send_logs:
        lg.recipient_email = "[REDACTED_LGPD]"

    db.add(AuditLog(
        business_id=b_id,
        user_id=uid,
        user_name="[ANONIMIZADO LGPD]",
        action=AuditAction.DELETE,
        entity="ORBEJOBS_LGPD_PURGE",
        entity_id=str(profile.id) if profile else None,
        detail="Titular exerceu Direito ao Esquecimento LGPD Art. 18 no OrbeJobs.",
    ))
    await db.commit()
    return {"status": "purged", "lgpd_art_18": True}
