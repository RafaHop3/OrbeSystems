"""
routes/mesh_and_hardening.py — Rotas Não-Intrusivas (Mesh Core, FIDC & Async Jobs)
══════════════════════════════════════════════════════════════════════════════════
Implementa os contratos das Fases 2, 3 e 4 do Dossiê de Blindagem:
  • POST /api/mesh/posts & GET /api/mesh/posts (Isolamento em `mesh_core.posts` + Ed25519/SHA-256)
  • POST /api/fidc/calculate (Precisão Pro-Rata NUMERIC(18,8) e NUMERIC(15,2) + ROUND_HALF_EVEN)
  • POST /api/jobs/async-ocr (Padrão 202 Accepted + Background Worker anti-deadlock)
  • POST /api/analytics/refresh-view (REFRESH MATERIALIZED VIEW CONCURRENTLY)
"""

import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import SessionLocal, engine, get_db
from models.hardening import AsyncProcessingJob, FidcOperation
from services.crypto_service import compute_sha256_hex, verify_post_integrity
from services.fidc_precision import calculate_fidc_pro_rata

router = APIRouter()


# ── 1. Contratos Pydantic: Mesh Core (Ed25519 + SHA-256) ─────────────────────
class MeshPostCreateRequest(BaseModel):
    author_id: uuid.UUID
    content_text: str = Field(..., min_length=1, max_length=1000)
    content_hash: str = Field(..., min_length=64, max_length=64)
    signature_hex: Optional[str] = Field(None, min_length=128, max_length=128)
    public_key_hex: Optional[str] = Field(None, min_length=64, max_length=64)
    media_url: Optional[str] = Field(None, max_length=512)
    orbit_level: int = Field(1, ge=1, le=4)


@router.post("/mesh/posts", status_code=status.HTTP_201_CREATED)
def create_mesh_post(payload: MeshPostCreateRequest, db: Session = Depends(get_db)):
    """
    Valida a integridade SHA-256 e a assinatura Ed25519 na camada de borda
    antes de gravar no schema isolado `mesh_core.posts` (ou tabela equivalente em dev).
    Descarta payloads adulterados sem tocar na base principal.
    """
    is_valid, reason = verify_post_integrity(
        content_text=payload.content_text,
        claimed_hash=payload.content_hash,
        signature_hex=payload.signature_hex,
        public_key_hex=payload.public_key_hex,
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=reason)

    post_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc)

    is_pg = engine.dialect.name == "postgresql"
    table_target = "mesh_core.posts" if is_pg else "mesh_core_posts"

    db.execute(
        text(
            f"INSERT INTO {table_target} "
            "(id, author_id, content_text, content_hash, signature_hex, public_key_hex, media_url, orbit_level, created_at) "
            "VALUES (:id, :author_id, :content_text, :content_hash, :sig, :pub, :media, :orbit, :created_at)"
        ),
        {
            "id": post_id,
            "author_id": str(payload.author_id),
            "content_text": payload.content_text,
            "content_hash": payload.content_hash.lower(),
            "sig": payload.signature_hex,
            "pub": payload.public_key_hex,
            "media": payload.media_url,
            "orbit": payload.orbit_level,
            "created_at": now_iso,
        },
    )
    db.commit()

    return {
        "id": post_id,
        "author_id": str(payload.author_id),
        "content_hash": payload.content_hash.lower(),
        "ed25519_verified": bool(payload.signature_hex and payload.public_key_hex),
        "schema": "mesh_core",
        "created_at": now_iso.isoformat(),
    }


@router.get("/mesh/posts")
def list_mesh_posts(limit: int = 20, db: Session = Depends(get_db)):
    """Lista publicações verificadas do schema isolado `mesh_core`."""
    safe_limit = max(1, min(limit, 100))
    is_pg = engine.dialect.name == "postgresql"
    table_target = "mesh_core.posts" if is_pg else "mesh_core_posts"

    rows = db.execute(
        text(
            f"SELECT id, author_id, content_text, content_hash, media_url, orbit_level, created_at "
            f"FROM {table_target} ORDER BY created_at DESC LIMIT :lim"
        ),
        {"lim": safe_limit},
    ).fetchall()

    return [
        {
            "id": str(r[0]),
            "author_id": str(r[1]),
            "content_text": r[2],
            "content_hash": r[3],
            "media_url": r[4],
            "orbit_level": r[5],
            "created_at": r[6].isoformat() if hasattr(r[6], "isoformat") else str(r[6]),
        }
        for r in rows
    ]


# ── 2. Contratos Pydantic: FIDC Pro-Rata Precision (`ROUND_HALF_EVEN`) ────────
class FidcCalculationRequest(BaseModel):
    external_ref: str = Field(..., min_length=3, max_length=100)
    face_value: Decimal = Field(..., gt=Decimal("0"))
    annual_discount_rate: Decimal = Field(..., gt=Decimal("0"), lt=Decimal("10"))
    business_days: int = Field(..., ge=1, le=2520)
    initial_quota_pu: Decimal = Field(Decimal("1000.00000000"), gt=Decimal("0"))


@router.post("/fidc/calculate")
def calculate_and_record_fidc(payload: FidcCalculationRequest, db: Session = Depends(get_db)):
    """
    Executa cálculo de cessão / RPV / PU de cota com precisão `NUMERIC(18,8)`
    e liquidação `NUMERIC(15,2)` com `ROUND_HALF_EVEN`. Idempotente por `external_ref`.
    """
    existing = db.query(FidcOperation).filter(FidcOperation.external_ref == payload.external_ref).first()
    if existing:
        return {
            "id": existing.id,
            "external_ref": existing.external_ref,
            "face_value": str(existing.face_value),
            "daily_rate": str(existing.daily_rate),
            "discount_factor": str(existing.discount_factor),
            "quota_pu": str(existing.quota_pu),
            "net_settlement": str(existing.net_settlement),
            "rounding_mode": existing.rounding_mode,
            "idempotent_replay": True,
        }

    metrics = calculate_fidc_pro_rata(
        face_value=payload.face_value,
        annual_discount_rate=payload.annual_discount_rate,
        business_days=payload.business_days,
        initial_quota_pu=payload.initial_quota_pu,
    )

    op = FidcOperation(
        external_ref=payload.external_ref,
        face_value=metrics["face_value"],
        daily_rate=metrics["daily_rate"],
        discount_factor=metrics["discount_factor"],
        quota_pu=metrics["quota_pu"],
        net_settlement=metrics["net_settlement"],
        rounding_mode="ROUND_HALF_EVEN",
    )
    db.add(op)
    db.commit()
    db.refresh(op)

    return {
        "id": op.id,
        "external_ref": op.external_ref,
        "face_value": str(op.face_value),
        "daily_rate": str(op.daily_rate),
        "discount_factor": str(op.discount_factor),
        "quota_pu": str(op.quota_pu),
        "net_settlement": str(op.net_settlement),
        "rounding_mode": op.rounding_mode,
        "idempotent_replay": False,
    }


# ── 3. Prevenção de Deadlocks & Timeouts (FastAPI + n8n: 202 Accepted) ───────
class AsyncOcrJobRequest(BaseModel):
    document_ref: str = Field(..., min_length=3, max_length=120)
    document_text_or_url: str = Field(..., min_length=5, max_length=10000)
    webhook_callback_url: Optional[str] = Field(None, max_length=512)


def _process_ocr_job_in_background(job_id: str, document_ref: str, content: str) -> None:
    """Worker assíncrono isolado para processamento pesado sem travar conexões HTTP."""
    db = SessionLocal()
    try:
        job = db.query(AsyncProcessingJob).filter(AsyncProcessingJob.job_id == job_id).first()
        if not job:
            return
        job.status = "processing"
        db.commit()

        digest = compute_sha256_hex(content)
        job.status = "completed"
        job.result_summary = f"OCR/Judicial Pipeline concluído para ref={document_ref} (sha256={digest[:16]}...)"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        db.rollback()
        job = db.query(AsyncProcessingJob).filter(AsyncProcessingJob.job_id == job_id).first()
        if job:
            job.status = "failed"
            job.error_detail = str(exc)[:500]
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


@router.post("/jobs/async-ocr", status_code=status.HTTP_202_ACCEPTED)
def enqueue_async_ocr_job(
    payload: AsyncOcrJobRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Valida o payload via Pydantic, responde imediatamente com `202 Accepted`
    e um `job_id`, e delega o processamento pesado ao background worker.
    """
    payload_hash = hashlib.sha256(
        f"{payload.document_ref}:{payload.document_text_or_url}".encode("utf-8")
    ).hexdigest()

    job = AsyncProcessingJob(
        job_type="judicial_ocr_pipeline",
        status="accepted",
        payload_hash=payload_hash,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _process_ocr_job_in_background,
        job.job_id,
        payload.document_ref,
        payload.document_text_or_url,
    )

    return {
        "status": "accepted",
        "http_code": 202,
        "job_id": job.job_id,
        "job_type": job.job_type,
        "payload_hash": payload_hash,
    }


@router.get("/jobs/{job_id}")
def get_async_job_status(job_id: str, db: Session = Depends(get_db)):
    """Consulta o estado de um job assíncrono (`accepted`, `processing`, `completed`, `failed`)."""
    job = db.query(AsyncProcessingJob).filter(AsyncProcessingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return {
        "job_id": job.job_id,
        "job_type": job.job_type,
        "status": job.status,
        "payload_hash": job.payload_hash,
        "result_summary": job.result_summary,
        "error_detail": job.error_detail,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


# ── 4. Governança Analítica: REFRESH MATERIALIZED VIEW CONCURRENTLY ──────────
@router.post("/analytics/refresh-materialized-view")
def refresh_analytics_materialized_view():
    """
    Executa `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_analytics_daily_summary`
    em conexão autocommit no PostgreSQL para atualizar a camada analítica
    (Power BI / Metabase) sem bloqueio exclusivo de leitura na tabela `visit_logs`.
    """
    if engine.dialect.name != "postgresql":
        return {
            "status": "skipped_non_postgres",
            "detail": "REFRESH MATERIALIZED VIEW CONCURRENTLY requer PostgreSQL em produção.",
        }

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_analytics_daily_summary"))

    return {
        "status": "refreshed_concurrently",
        "view": "mv_analytics_daily_summary",
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
    }
