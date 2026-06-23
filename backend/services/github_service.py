from config import settings
from fastapi import HTTPException
import httpx
from typing import Optional
from models.repository import Repository


GITHUB_API_BASE = "https://api.github.com"
GITHUB_USERNAME = "theorbesystems-sketch"

# Fallback hardcoded list — used only if DB has no featured repos yet (first boot)
_FALLBACK_FEATURED: list[str] = ["Safety-Flow", "AstroWatch", "Caronice", "X1 World", "OrbeSystems"]


def _build_headers() -> dict:
    """Build request headers, including Bearer token if available."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = settings.GITHUB_TOKEN
    if token and token != "token_de_fallback_inseguro" and token != "":
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def fetch_single_repo(repo_name: str, owner: str = None) -> Optional[dict]:
    """
    Fetch a single public repo by name.
    Supports format: 'repo-name' (uses default owner) or 'owner/repo-name'
    Returns raw GitHub API dict or None if not found.
    """
    # Check if repo_name includes owner (format: owner/repo)
    if "/" in repo_name:
        parts = repo_name.split("/")
        owner = parts[0]
        clean_name = parts[1].strip().replace(" ", "-")
    else:
        # Use provided owner or default
        owner = owner or GITHUB_USERNAME
        clean_name = repo_name.strip().replace(" ", "-")
    
    url = f"{GITHUB_API_BASE}/repos/{owner}/{clean_name}"

    headers = _build_headers()
    has_auth = "Authorization" in headers
    print(f"[GitHub API] Looking up repo: {owner}/{clean_name}")
    print(f"[GitHub API] URL: {url}")
    print(f"[GitHub API] Authenticated: {has_auth}")

    transport = httpx.AsyncHTTPTransport(retries=3)
    async with httpx.AsyncClient(timeout=15.0, transport=transport) as client:
        try:
            response = await client.get(url, headers=headers)
            print(f"[GitHub API] Response status: {response.status_code}")

            if response.status_code == 404:
                print(f"[GitHub API] Repo '{clean_name}' not found (404)")
                return None

            if response.status_code == 403:
                error_data = response.json() if response.text else {}
                message = error_data.get("message", "")
                if "rate limit" in message.lower():
                    print(f"[GitHub API] Rate limit exceeded: {message}")
                    return None
                print(f"[GitHub API] Access forbidden: {message}")
                return None

            if response.status_code == 401:
                print(f"[GitHub API] Unauthorized — GITHUB_TOKEN may be expired or invalid.")
                return None

            response.raise_for_status()
            data = response.json()
            print(f"[GitHub API] Successfully fetched repo: {data.get('name')}")
            return data

        except httpx.HTTPStatusError as e:
            print(f"[GitHub API] HTTP error: {e.response.status_code} - {e.response.text[:200]}")
            return None
        except Exception as e:
            print(f"[GitHub API] Unexpected error: {str(e)}")
            return None


async def fetch_repositories() -> list[Repository]:
    """Fetch public repositories from GitHub API and sort by priority.

    Featured status is driven by the DB (via metadata_service.get_featured_repo_names).
    Falls back to the hardcoded list if the DB has no featured entries yet.
    Opens its own short-lived DB session since it is called from a cached route
    and cannot receive an injected session via FastAPI Depends.
    """
    from services.metadata_service import get_featured_repo_names
    from database import SessionLocal

    url = f"{GITHUB_API_BASE}/users/{GITHUB_USERNAME}/repos"
    params = {"per_page": 100, "sort": "updated", "type": "public"}

    transport = httpx.AsyncHTTPTransport(retries=2)
    async with httpx.AsyncClient(timeout=15.0, transport=transport) as client:
        response = await client.get(url, headers=_build_headers(), params=params)
        
        if response.status_code == 403:
            error_data = response.json() if response.text else {}
            message = error_data.get("message", "Access forbidden")
            if "rate limit" in message.lower():
                print(f"[GitHub API] Rate limit exceeded on repos list: {message}")
                # Return empty list to trigger fallback in routes
                return []
            print(f"[GitHub API] Access forbidden on repos list: {message}")
            # Return empty list to trigger fallback in routes
            return []
        
        if response.status_code == 401:
            print(f"[GitHub API] Unauthorized — GITHUB_TOKEN may be expired or invalid.")
            # Return empty list to trigger fallback in routes
            return []
        
        if response.status_code == 404:
            print(f"[GitHub API] User '{GITHUB_USERNAME}' not found (404)")
            # Return empty list to trigger fallback in routes
            return []
        
        try:
            response.raise_for_status()
        except Exception as e:
            print(f"[GitHub API] HTTP error fetching repos list: {response.status_code} — {response.text[:200]}")
            # Return empty list to trigger fallback in routes
            return []
        
        raw_repos: list[dict] = response.json()

    # Resolve featured list — own session since this may be called from a cached context
    db = SessionLocal()
    try:
        featured_from_db = get_featured_repo_names(db)
    finally:
        db.close()

    featured_names: list[str] = featured_from_db if featured_from_db else _FALLBACK_FEATURED

    repositories: list[Repository] = []
    for repo in raw_repos:
        is_featured = repo["name"] in featured_names
        repositories.append(
            Repository(
                id=repo["id"],
                name=repo["name"],
                full_name=repo["full_name"],
                description=repo.get("description"),
                html_url=repo["html_url"],
                language=repo.get("language"),
                stargazers_count=repo.get("stargazers_count", 0),
                forks_count=repo.get("forks_count", 0),
                topics=repo.get("topics", []),
                updated_at=repo.get("updated_at", ""),
                is_featured=is_featured,
            )
        )

    # Sort: featured first (in DB order), then by stars desc
    repositories.sort(
        key=lambda r: (
            0 if r.is_featured else 1,
            featured_names.index(r.name) if r.is_featured and r.name in featured_names else -r.stargazers_count,
        )
    )

    return repositories
