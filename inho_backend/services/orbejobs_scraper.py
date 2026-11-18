"""
OrbeJobs — Motor de Varredura Híbrido (Phase 2)
Conectores para APIs públicas de ATS (Greenhouse, Lever, feeds RSS/Atom) e Playwright (Zero-VPS via GitHub Actions).
Garante canonicalização de URL e hash SHA-256 determinístico para deduplicação (user_id, job_url_hash).
"""
import hashlib
import html
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx

logger = logging.getLogger("inho.orbejobs.scraper")

_TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gh_src", "lever-source", "lever-origin", "ref", "source", "fbclid", "gclid",
}

_KNOWN_TECH_KEYWORDS = [
    "python", "fastapi", "django", "typescript", "javascript", "react", "nextjs", "next.js",
    "node", "nodejs", "postgresql", "postgres", "pgvector", "supabase", "neon", "docker",
    "kubernetes", "aws", "gcp", "terraform", "rust", "go", "golang", "java", "playwright",
    "ai", "llm", "rag", "ml", "sql", "linux", "security", "cybersecurity", "devops",
]

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_ITEM_RE = re.compile(r"<(?:item|entry)\b[^>]*>(.*?)</(?:item|entry)>", re.IGNORECASE | re.DOTALL)


def canonicalize_job_url(raw_url: str) -> str:
    """Normaliza a URL da vaga removendo parâmetros de rastreio e fragmentos."""
    raw = (raw_url or "").strip()
    if not raw:
        return ""
    try:
        parsed = urlparse(raw)
        clean_query = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=False)
            if k.lower() not in _TRACKING_PARAMS
        ]
        clean_path = parsed.path.rstrip("/") or "/"
        return urlunparse((
            (parsed.scheme or "https").lower(),
            parsed.netloc.lower(),
            clean_path,
            "",
            urlencode(sorted(clean_query)),
            "",
        ))
    except Exception:
        return raw.lower()


def compute_job_url_hash(raw_url: str) -> str:
    """Gera hash SHA-256 canônico da URL da vaga para deduplicação."""
    canonical = canonicalize_job_url(raw_url)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def strip_html_tags(raw_html: str) -> str:
    """Remove marcação HTML/CDATA e normaliza espaços."""
    if not raw_html:
        return ""
    text = raw_html.replace("<![CDATA[", "").replace("]]>", "")
    text = html.unescape(text)
    text = _HTML_TAG_RE.sub(" ", text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def extract_skills_from_text(text: str) -> List[str]:
    """Extrai tags técnicas relevantes de descrições de vagas."""
    lower = f" {(text or '').lower()} "
    found: List[str] = []
    for kw in _KNOWN_TECH_KEYWORDS:
        pattern = r"(?<![a-z0-9])" + re.escape(kw) + r"(?![a-z0-9])"
        if re.search(pattern, lower):
            found.append(kw)
    return found[:15]


def _extract_contact_email(text: str) -> Optional[str]:
    match = _EMAIL_RE.search(text or "")
    return match.group(0).lower() if match else None


def _extract_xml_tag(block: str, tag_name: str) -> str:
    m = re.search(
        rf"<{tag_name}\b[^>]*>(.*?)</{tag_name}>",
        block,
        re.IGNORECASE | re.DOTALL,
    )
    return strip_html_tags(m.group(1)) if m else ""


def _extract_atom_link(block: str) -> str:
    m = re.search(r'<link\b[^>]*href=["\']([^"\']+)["\']', block, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return _extract_xml_tag(block, "link")


def parse_rss_or_atom_xml(
    xml_text: str,
    *,
    source_label: str = "rss",
    limit: int = 30,
) -> List[Dict[str, Any]]:
    """
    Parser seguro (sem avaliação de DTD/entidades externas XML) para feeds RSS 2.0 e Atom.
    """
    results: List[Dict[str, Any]] = []
    for block in _ITEM_RE.findall(xml_text or ""):
        title = _extract_xml_tag(block, "title")
        link = _extract_atom_link(block)
        description = (
            _extract_xml_tag(block, "description")
            or _extract_xml_tag(block, "summary")
            or _extract_xml_tag(block, "content")
        )
        company = (
            _extract_xml_tag(block, "company")
            or _extract_xml_tag(block, "dc:creator")
            or _extract_xml_tag(block, "author")
            or source_label
        )
        if not title or not link:
            continue
        desc_clean = description[:4000]
        results.append({
            "source_ats": "rss",
            "company_name": company[:200],
            "title": title[:255],
            "location": _extract_xml_tag(block, "location") or "Remote / Global",
            "remote_type": "remote" if "remote" in f"{title} {desc_clean}".lower() else "hybrid",
            "job_url": canonicalize_job_url(link),
            "job_url_hash": compute_job_url_hash(link),
            "recipient_email": _extract_contact_email(desc_clean),
            "description_text": desc_clean,
            "skills_tags": extract_skills_from_text(f"{title} {desc_clean}"),
            "published_at": datetime.now(timezone.utc),
        })
        if len(results) >= limit:
            break
    return results


async def fetch_greenhouse_jobs(
    board_token: str,
    *,
    limit: int = 30,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """Conector público da API JSON de vagas do Greenhouse Boards."""
    token = (board_token or "").strip().lower()
    if not token:
        return []
    url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=10.0)
    try:
        resp = await http_client.get(url)
        if resp.status_code != 200:
            logger.warning(f"[OrbeJobs-Greenhouse] {token} retornou HTTP {resp.status_code}")
            return []
        data = resp.json()
        jobs = data.get("jobs") or []
        out: List[Dict[str, Any]] = []
        for item in jobs[:limit]:
            abs_url = str(item.get("absolute_url") or "").strip()
            title = str(item.get("title") or "").strip()
            if not abs_url or not title:
                continue
            loc = ((item.get("location") or {}).get("name")) or "Remote / Global"
            desc = strip_html_tags(str(item.get("content") or ""))[:4000]
            out.append({
                "source_ats": "greenhouse",
                "company_name": token.replace("-", " ").title()[:200],
                "title": title[:255],
                "location": str(loc)[:200],
                "remote_type": "remote" if "remote" in f"{title} {loc}".lower() else "hybrid",
                "job_url": canonicalize_job_url(abs_url),
                "job_url_hash": compute_job_url_hash(abs_url),
                "recipient_email": _extract_contact_email(desc),
                "description_text": desc,
                "skills_tags": extract_skills_from_text(f"{title} {desc}"),
                "published_at": datetime.now(timezone.utc),
            })
        return out
    except Exception as exc:
        logger.warning(f"[OrbeJobs-Greenhouse] Falha ao consultar {token}: {exc}")
        return []
    finally:
        if owns_client:
            await http_client.aclose()


async def fetch_lever_jobs(
    company_slug: str,
    *,
    limit: int = 30,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """Conector público da API JSON de vagas do Lever Postings."""
    slug = (company_slug or "").strip().lower()
    if not slug:
        return []
    url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=10.0)
    try:
        resp = await http_client.get(url)
        if resp.status_code != 200:
            logger.warning(f"[OrbeJobs-Lever] {slug} retornou HTTP {resp.status_code}")
            return []
        jobs = resp.json()
        if not isinstance(jobs, list):
            return []
        out: List[Dict[str, Any]] = []
        for item in jobs[:limit]:
            hosted_url = str(item.get("hostedUrl") or item.get("applyUrl") or "").strip()
            title = str(item.get("text") or "").strip()
            if not hosted_url or not title:
                continue
            cats = item.get("categories") or {}
            loc = str(cats.get("location") or "Remote / Global")
            desc = strip_html_tags(str(item.get("descriptionPlain") or item.get("description") or ""))[:4000]
            out.append({
                "source_ats": "lever",
                "company_name": slug.replace("-", " ").title()[:200],
                "title": title[:255],
                "location": loc[:200],
                "remote_type": str(item.get("workplaceType") or ("remote" if "remote" in loc.lower() else "hybrid")),
                "job_url": canonicalize_job_url(hosted_url),
                "job_url_hash": compute_job_url_hash(hosted_url),
                "recipient_email": _extract_contact_email(desc),
                "description_text": desc,
                "skills_tags": extract_skills_from_text(f"{title} {desc}"),
                "published_at": datetime.now(timezone.utc),
            })
        return out
    except Exception as exc:
        logger.warning(f"[OrbeJobs-Lever] Falha ao consultar {slug}: {exc}")
        return []
    finally:
        if owns_client:
            await http_client.aclose()


async def fetch_rss_jobs(
    feed_url: str,
    *,
    source_label: str = "rss",
    limit: int = 30,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """Conector genérico para feeds RSS/Atom públicos de vagas."""
    url = (feed_url or "").strip()
    if not url:
        return []
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=10.0)
    try:
        resp = await http_client.get(url)
        if resp.status_code != 200:
            logger.warning(f"[OrbeJobs-RSS] {url} retornou HTTP {resp.status_code}")
            return []
        return parse_rss_or_atom_xml(resp.text, source_label=source_label, limit=limit)
    except Exception as exc:
        logger.warning(f"[OrbeJobs-RSS] Falha ao consultar {url}: {exc}")
        return []
    finally:
        if owns_client:
            await http_client.aclose()


async def fetch_playwright_board_jobs(
    board_url: str,
    *,
    company_name: str = "Career Board",
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Fallback headless Playwright para páginas SPA (executado no GitHub Actions sem custo de VPS).
    Retorna lista vazia se Playwright/Chromium não estiverem disponíveis no container da API.
    """
    url = (board_url or "").strip()
    if not url:
        return []
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.info("[OrbeJobs-Playwright] Playwright não instalado neste ambiente; ignorando fallback SPA.")
        return []

    out: List[Dict[str, Any]] = []
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            anchors = await page.eval_on_selector_all(
                "a[href]",
                """els => els.map(e => ({
                    text: (e.innerText || '').trim(),
                    href: e.href || ''
                }))""",
            )
            await browser.close()

        for item in anchors:
            title = _WHITESPACE_RE.sub(" ", str(item.get("text") or "")).strip()
            href = str(item.get("href") or "").strip()
            if not title or len(title) < 6 or not href.startswith("http"):
                continue
            low = f"{title} {href}".lower()
            if not any(k in low for k in ("job", "career", "vaga", "engineer", "developer", "security", "architect", "position")):
                continue
            out.append({
                "source_ats": "playwright",
                "company_name": company_name[:200],
                "title": title[:255],
                "location": "Remote / Web",
                "remote_type": "remote" if "remote" in low else "hybrid",
                "job_url": canonicalize_job_url(href),
                "job_url_hash": compute_job_url_hash(href),
                "recipient_email": None,
                "description_text": title,
                "skills_tags": extract_skills_from_text(title),
                "published_at": datetime.now(timezone.utc),
            })
            if len(out) >= limit:
                break
    except Exception as exc:
        logger.warning(f"[OrbeJobs-Playwright] Falha ao coletar {url}: {exc}")
    return out


async def run_hybrid_scrape(
    *,
    greenhouse_boards: Optional[List[str]] = None,
    lever_companies: Optional[List[str]] = None,
    rss_feeds: Optional[List[str]] = None,
    playwright_urls: Optional[List[str]] = None,
    limit_per_source: int = 20,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """
    Executa varredura híbrida consolidada e deduplica resultados por job_url_hash.
    """
    collected: List[Dict[str, Any]] = []
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=12.0)

    try:
        for board in (greenhouse_boards or []):
            collected.extend(await fetch_greenhouse_jobs(board, limit=limit_per_source, client=http_client))
        for company in (lever_companies or []):
            collected.extend(await fetch_lever_jobs(company, limit=limit_per_source, client=http_client))
        for feed in (rss_feeds or []):
            collected.extend(await fetch_rss_jobs(feed, limit=limit_per_source, client=http_client))
        for pw_url in (playwright_urls or []):
            collected.extend(await fetch_playwright_board_jobs(pw_url, limit=limit_per_source))
    finally:
        if owns_client:
            await http_client.aclose()

    deduped: Dict[str, Dict[str, Any]] = {}
    for job in collected:
        j_hash = job.get("job_url_hash") or compute_job_url_hash(job.get("job_url", ""))
        if j_hash and j_hash not in deduped:
            job["job_url_hash"] = j_hash
            deduped[j_hash] = job
    return list(deduped.values())
