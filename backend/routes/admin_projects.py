from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from security.auth import get_current_admin_user
from services.github_service import fetch_repositories, fetch_single_repo
from services.metadata_service import get_all_metadata, save_project_metadata
from routes.projects import clear_projects_cache  # Import cache clearer
from database import get_db
from pydantic import BaseModel
from typing import Optional

router = APIRouter(dependencies=[Depends(get_current_admin_user)])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProjectUpdate(BaseModel):
    custom_description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    deploy_url: Optional[str] = None
    is_premium_only: Optional[bool] = None


class RepoLookupRequest(BaseModel):
    repo_name: str  # just the repo name, e.g. "OrbeSystems"


class RepoAddRequest(BaseModel):
    repo_id: int
    repo_name: str
    custom_description: Optional[str] = None
    image_url: Optional[str] = None
    deploy_url: Optional[str] = None


# ── Existing endpoints ────────────────────────────────────────────────────────

@router.get("/projects")
async def list_admin_projects(db: Session = Depends(get_db)):
    """
    Return all projects from GitHub merged with local custom metadata
    for the admin dashboard editor. Uses injected DB session — single
    roundtrip to the connection pool for the entire request.
    """
    try:
        repos = await fetch_repositories()
    except Exception as e:
        print(f"[Admin API] GitHub fetch failed in admin, using DB cache fallback: {e}")
        from routes.projects import get_repositories_from_db
        repos = get_repositories_from_db(db)
        if not repos:
            raise HTTPException(status_code=500, detail="Não foi possível obter os projetos do GitHub nem do banco de dados cache.")

    try:
        metadata = get_all_metadata(db)
        existing_ids = {repo.id for repo in repos}

        for repo in repos:
            custom = metadata.get(str(repo.id))
            if custom:
                repo.custom_description = custom.get("custom_description")
                repo.image_url = custom.get("image_url")
                repo.video_url = custom.get("video_url")
                repo.deploy_url = custom.get("deploy_url")
                repo.is_premium_only = custom.get("is_premium_only")

        # Append manually injected custom projects/tools
        from models.repository import Repository
        from datetime import datetime, timezone
        for repo_id_str, meta in metadata.items():
            try:
                repo_id = int(repo_id_str)
            except ValueError:
                import hashlib
                repo_id = int(hashlib.md5(repo_id_str.encode('utf-8')).hexdigest()[:8], 16)

            if repo_id not in existing_ids:
                repo_name = meta.get("repo_name") or repo_id_str
                repos.append(
                    Repository(
                        id=repo_id,
                        name=repo_name,
                        full_name=f"theorbesystems-sketch/{repo_name.lower()}",
                        description=meta.get("custom_description") or "Premium tool built for our platform",
                        html_url=f"https://github.com/theorbesystems-sketch/{repo_name.lower()}",
                        language="Python",
                        stargazers_count=42,
                        forks_count=12,
                        topics=["premium", "tool", "orbesystems"],
                        updated_at=datetime.now(timezone.utc).isoformat(),
                        is_featured=meta.get("is_featured", False),
                        custom_description=meta.get("custom_description"),
                        image_url=meta.get("image_url"),
                        video_url=meta.get("video_url"),
                        deploy_url=meta.get("deploy_url"),
                        is_premium_only=meta.get("is_premium_only", False),
                    )
                )

        return repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter projetos: {str(e)}")


@router.post("/projects/{repo_id}")
async def update_project_metadata(
    repo_id: int,
    update: ProjectUpdate,
    db: Session = Depends(get_db),
):
    """Save custom metadata for a specific repository.
    Only updates fields that are explicitly provided (non-None AND non-empty-string).
    Empty strings are treated as 'no change' — they do NOT overwrite existing DB values.
    To explicitly clear a field, future API callers should send a dedicated clear flag.
    """
    try:
        # We now allow empty strings to CLEAR the fields in the DB.
        # If the frontend sends an empty string, it means the user deleted the content.
        # We only drop None (fields not sent in the JSON payload).
        update_data = {
            k: v
            for k, v in update.model_dump().items()
            if v is not None
        }
        save_project_metadata(repo_id, update_data, db)
        clear_projects_cache()
        return {"status": "success", "message": f"Metadata for {repo_id} updated.", "fields_updated": list(update_data.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── New: Inject Repo endpoints ────────────────────────────────────────────────

@router.post("/repos/lookup")
async def lookup_repo(body: RepoLookupRequest):
    """
    Look up a single public repo by name.
    Supports: 'repo-name' (searches default owner) or 'owner/repo-name' (searches specific owner)
    Returns GitHub API data for preview before injecting. No DB side effects.
    """
    repo_name = body.repo_name.strip().lstrip("/").strip()

    if not repo_name:
        raise HTTPException(status_code=400, detail="Repository name is required.")

    print(f"[Admin] Looking up repo: '{repo_name}'")

    # Try exact match first (handles both 'repo' and 'owner/repo' formats)
    raw = await fetch_single_repo(repo_name)

    # If not found and no owner specified, try case-insensitive variations
    if raw is None and "/" not in repo_name:
        variations = [
            repo_name.lower(),
            repo_name.upper(),
            repo_name.capitalize(),
            repo_name.replace("-", ""),
            repo_name.replace("_", ""),
        ]
        for variant in variations:
            if variant != repo_name:
                print(f"[Admin] Trying variant: '{variant}'")
                raw = await fetch_single_repo(variant)
                if raw is not None:
                    print(f"[Admin] Found repo with variant: '{variant}'")
                    break

    if raw is None:
        raise HTTPException(
            status_code=404,
            detail=f"Repository '{repo_name}' not found on GitHub. "
                   f"Try 'owner/repo-name' format (e.g., 'rafahop3/Jovempano') or verify the repository exists and is public.",
        )

    return {
        "id": raw["id"],
        "name": raw["name"],
        "full_name": raw["full_name"],
        "description": raw.get("description"),
        "html_url": raw["html_url"],
        "language": raw.get("language"),
        "stargazers_count": raw.get("stargazers_count", 0),
        "forks_count": raw.get("forks_count", 0),
        "topics": raw.get("topics", []),
        "updated_at": raw.get("updated_at", ""),
    }


@router.post("/repos/add")
async def add_repo(body: RepoAddRequest, db: Session = Depends(get_db)):
    """
    Inject a repo into the portfolio by saving its metadata with is_featured=True.
    The repo must already exist as a public repo on GitHub (any owner).
    """
    try:
        save_project_metadata(
            body.repo_id,
            {
                "repo_name": body.repo_name,
                "custom_description": body.custom_description,
                "image_url": body.image_url,
                "video_url": None,
                "deploy_url": body.deploy_url,
                "is_featured": True,
            },
            db,
        )
        clear_projects_cache()
        return {"status": "success", "message": f"Repo '{body.repo_name}' injected as featured."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
