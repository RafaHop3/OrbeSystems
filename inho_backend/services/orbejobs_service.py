"""
OrbeJobs — Serviço de Living CV (JSON Resume) & Matching Preditivo IMORTAL (Phase 3)
Gerencia:
1. Schema JSON Resume (Living CV) com experiências, cursos, certificados e habilidades.
2. Atualização rápida via PDF (extração de texto e hash SHA-256) e comandos WhatsApp (OrBrick).
3. Ranqueamento pré-filtrado via pgvector (compute_text_embedding / prefilter_pgvector_candidates).
4. Adaptação de currículo e cover letter via IMORTALPredictiveCascadeRouter (Gemini/Groq/Ollama/Local).
"""
import hashlib
import io
import json
import re
import zlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from services.ai_agent import (
    compute_text_embedding,
    cosine_similarity,
    imortal_cascade_router,
    sanitize_pii_text,
)

VALID_KANBAN_STAGES = (
    "DISCOVERED",
    "TAILORED",
    "READY_TO_SEND",
    "SENT",
    "INTERVIEW",
    "REJECTED",
    "ARCHIVED",
)

_PDF_LITERAL_STR_RE = re.compile(rb"\(([^()\\]*(?:\\.[^()\\]*)*)\)")
_PDF_STREAM_RE = re.compile(rb"stream\r?\n(.*?)\r?\nendstream", re.DOTALL)


def default_json_resume(full_name: str = "", email: str = "", headline: str = "") -> Dict[str, Any]:
    """Retorna estrutura padrão JSON Resume v1.0 para o Living CV."""
    return {
        "basics": {
            "name": full_name or "Profissional Orbe",
            "label": headline or "Engenheiro de Software / Arquitetura de Sistemas",
            "email": email or "",
            "summary": "",
        },
        "work": [],
        "education": [],
        "certificates": [],
        "skills": [],
        "languages": [{"language": "Português", "fluency": "Nativo"}],
    }


def normalize_json_resume(raw: Any, fallback_name: str = "", fallback_email: str = "") -> Dict[str, Any]:
    """Garante integridade estrutural do documento JSON Resume."""
    base = default_json_resume(fallback_name, fallback_email)
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            raw = {}
    if not isinstance(raw, dict):
        return base

    basics = raw.get("basics") if isinstance(raw.get("basics"), dict) else {}
    base["basics"].update({k: v for k, v in basics.items() if v is not None})
    for key in ("work", "education", "certificates", "skills", "languages"):
        val = raw.get(key)
        if isinstance(val, list):
            base[key] = val
    return base


def build_living_cv_search_text(resume: Dict[str, Any], headline: Optional[str] = None) -> str:
    """Concatena campos relevantes do Living CV para geração do vetor pgvector."""
    basics = resume.get("basics") or {}
    parts: List[str] = [
        str(headline or basics.get("label") or ""),
        str(basics.get("summary") or ""),
    ]
    for w in (resume.get("work") or []):
        if isinstance(w, dict):
            parts.append(f"{w.get('position', '')} {w.get('name', '')} {w.get('summary', '')}")
    for c in (resume.get("certificates") or []):
        if isinstance(c, dict):
            parts.append(f"{c.get('name', '')} {c.get('issuer', '')}")
    for s in (resume.get("skills") or []):
        if isinstance(s, dict):
            kws = " ".join(str(k) for k in (s.get("keywords") or []))
            parts.append(f"{s.get('name', '')} {kws}")
        elif isinstance(s, str):
            parts.append(s)
    return " ".join(p.strip() for p in parts if p and p.strip())


def compute_living_cv_embedding(resume: Dict[str, Any], headline: Optional[str] = None) -> List[float]:
    return compute_text_embedding(build_living_cv_search_text(resume, headline))


def score_cv_vs_job(
    cv_embedding: List[float],
    cv_text: str,
    job_title: str,
    job_description: str,
    job_embedding: Optional[List[float]] = None,
) -> float:
    """Calcula aderência [0.0, 1.0] entre Living CV e vaga (pgvector cosseno + sobreposição técnica)."""
    job_full = f"{job_title} {job_description}".strip()
    j_vec = job_embedding or compute_text_embedding(job_full)
    vec_score = cosine_similarity(cv_embedding, j_vec)

    cv_words = set(re.findall(r"[a-z0-9]{3,}", (cv_text or "").lower()))
    job_words = set(re.findall(r"[a-z0-9]{3,}", job_full.lower()))
    overlap = len(cv_words.intersection(job_words)) / max(1, min(len(job_words), 25))
    return round(min(1.0, (0.65 * vec_score) + (0.35 * overlap)), 4)


def extract_pdf_text_bytes(pdf_bytes: bytes) -> Tuple[str, str]:
    """
    Extrai texto de bytes PDF de forma resiliente (usa pypdf se disponível, com fallback
    para streams FlateDecode/literais nativos em Python puro) e retorna (texto, sha256).
    """
    sha = hashlib.sha256(pdf_bytes or b"").hexdigest()
    if not pdf_bytes:
        return "", sha

    try:
        import pypdf  # type: ignore

        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        extracted = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        if extracted:
            return extracted, sha
    except Exception:
        pass

    chunks: List[str] = []
    for match in _PDF_STREAM_RE.findall(pdf_bytes):
        raw_stream = match
        try:
            raw_stream = zlib.decompress(match)
        except Exception:
            pass
        for lit in _PDF_LITERAL_STR_RE.findall(raw_stream):
            decoded = lit.decode("latin-1", errors="ignore").replace("\\(", "(").replace("\\)", ")")
            if decoded.strip():
                chunks.append(decoded.strip())

    if not chunks:
        for lit in _PDF_LITERAL_STR_RE.findall(pdf_bytes):
            decoded = lit.decode("latin-1", errors="ignore")
            if len(decoded.strip()) > 2:
                chunks.append(decoded.strip())

    if not chunks:
        ascii_fallback = re.sub(r"[^\x20-\x7EÀ-ÿ\n]+", " ", pdf_bytes.decode("latin-1", errors="ignore"))
        return re.sub(r"\s+", " ", ascii_fallback).strip()[:6000], sha

    return re.sub(r"\s+", " ", " ".join(chunks)).strip()[:12000], sha


def apply_whatsapp_living_cv_command(resume: Dict[str, Any], message: str) -> Tuple[Dict[str, Any], List[str]]:
    """
    Interpreta comandos incrementais via WhatsApp para atualizar o Living CV:
      - "+XP Cargo na Empresa | Resumo"
      - "+Curso Nome do Curso @ Instituição"
      - "+Skill Python, FastAPI, pgvector"
    """
    updated = normalize_json_resume(resume)
    actions: List[str] = []
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for raw_line in (message or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        low = line.lower()
        if low.startswith("+xp") or low.startswith("xp:"):
            payload = re.sub(r"^(\+xp|xp:)\s*", "", line, flags=re.IGNORECASE).strip()
            parts = [p.strip() for p in payload.split("|", 1)]
            header = parts[0]
            summary = parts[1] if len(parts) > 1 else payload
            company = "Experiência Profissional"
            role = header
            if " na " in header.lower():
                idx = header.lower().index(" na ")
                role = header[:idx].strip()
                company = header[idx + 4:].strip()
            elif " @ " in header:
                role, company = [x.strip() for x in header.split(" @ ", 1)]
            updated["work"].insert(0, {
                "name": company,
                "position": role,
                "startDate": now_date,
                "summary": summary,
            })
            actions.append(f"XP adicionada: {role} ({company})")

        elif low.startswith("+curso") or low.startswith("curso:") or low.startswith("+cert"):
            payload = re.sub(r"^(\+curso|curso:|\+cert)\s*", "", line, flags=re.IGNORECASE).strip()
            issuer = "Formação Contínua"
            course_name = payload
            if " @ " in payload:
                course_name, issuer = [x.strip() for x in payload.split(" @ ", 1)]
            elif " - " in payload:
                course_name, issuer = [x.strip() for x in payload.split(" - ", 1)]
            updated["certificates"].insert(0, {
                "name": course_name,
                "issuer": issuer,
                "date": now_date,
            })
            actions.append(f"Curso/Certificação adicionado: {course_name}")

        elif low.startswith("+skill") or low.startswith("skill:") or low.startswith("+skills"):
            payload = re.sub(r"^(\+skills?|skills?:)\s*", "", line, flags=re.IGNORECASE).strip()
            tokens = [t.strip() for t in re.split(r"[,;]+", payload) if t.strip()]
            if tokens:
                updated["skills"].append({"name": "Competências Técnicas", "keywords": tokens})
                actions.append(f"Skills adicionadas: {', '.join(tokens)}")

    if not actions and (message or "").strip():
        summary_prev = (updated["basics"].get("summary") or "").strip()
        addition = sanitize_pii_text(message.strip())[:500]
        updated["basics"]["summary"] = f"{summary_prev}\n{addition}".strip() if summary_prev else addition
        actions.append("Resumo profissional atualizado via texto livre")

    return updated, actions


def merge_pdf_text_into_resume(resume: Dict[str, Any], pdf_text: str) -> Dict[str, Any]:
    """Incorpora texto extraído de PDF no Living CV preservando estrutura JSON Resume."""
    updated = normalize_json_resume(resume)
    clean_text = sanitize_pii_text(pdf_text or "")
    if not clean_text:
        return updated

    if not updated["basics"].get("summary"):
        updated["basics"]["summary"] = clean_text[:600]

    extracted_skills = re.findall(
        r"\b(Python|FastAPI|TypeScript|React|Next\.?js|PostgreSQL|pgvector|Docker|Kubernetes|AWS|Z3|Playwright|SQL)\b",
        clean_text,
        flags=re.IGNORECASE,
    )
    if extracted_skills:
        uniq = sorted({s.strip() for s in extracted_skills})
        existing_kws = {
            str(k).lower()
            for sk in updated["skills"]
            if isinstance(sk, dict)
            for k in (sk.get("keywords") or [])
        }
        new_kws = [s for s in uniq if s.lower() not in existing_kws]
        if new_kws:
            updated["skills"].append({"name": "Extraído via PDF", "keywords": new_kws})
    return updated


async def tailor_application_with_imortal(
    *,
    resume: Dict[str, Any],
    job_title: str,
    company_name: str,
    job_description: str,
    simulate_offline: bool = False,
) -> Dict[str, Any]:
    """
    Usa o IMORTALPredictiveCascadeRouter para gerar cover letter adaptada à vaga
    e selecionar os destaques relevantes do Living CV com custo mínimo de tokens.
    """
    basics = resume.get("basics") or {}
    candidate_name = basics.get("name") or "Candidato(a)"
    skills_list: List[str] = []
    for sk in (resume.get("skills") or []):
        if isinstance(sk, dict):
            skills_list.extend(str(k) for k in (sk.get("keywords") or []))
            if sk.get("name"):
                skills_list.append(str(sk["name"]))
    top_skills = ", ".join(dict.fromkeys(skills_list))[:250] or "Engenharia de Software e Arquitetura Cloud"

    fallback_letter = (
        f"Prezados recrutadores da {company_name},\n\n"
        f"Apresento minha candidatura para a posição de {job_title}. "
        f"Minha experiência recente concentra-se em {top_skills}, alinhada diretamente às "
        f"entregas descritas para esta oportunidade.\n\n"
        f"Atenciosamente,\n{candidate_name}"
    )

    prompt = (
        f"Gere uma carta de apresentação concisa (máximo 140 palavras) em português para a vaga "
        f"'{job_title}' na empresa '{company_name}'.\n"
        f"Candidato: {candidate_name}\n"
        f"Habilidades principais: {top_skills}\n"
        f"Resumo: {str(basics.get('summary') or '')[:350]}"
    )

    cascade_res = await imortal_cascade_router.generate(
        task_type="orbejobs_tailor",
        prompt=prompt,
        context_items=[{"title": job_title, "description_text": job_description}],
        fallback_text=fallback_letter,
        simulate_offline=simulate_offline,
    )

    tailored_cv = {
        "basics": basics,
        "highlighted_skills": list(dict.fromkeys(skills_list))[:12],
        "recent_work": (resume.get("work") or [])[:3],
        "certificates": (resume.get("certificates") or [])[:5],
        "tailored_for_job": f"{company_name} — {job_title}",
    }

    return {
        "cover_letter": cascade_res["reply"],
        "tailored_resume": tailored_cv,
        "ai_provider": cascade_res["provider"],
        "cache_hit": cascade_res["cache_hit"],
        "pgvector_score": cascade_res["top_pgvector_score"],
    }
