from fastapi import APIRouter, Depends, HTTPException
from services.github_service import fetch_repositories, fetch_single_repo
from services.metadata_service import get_all_metadata
from models.repository import Repository
from database import SessionLocal
from security.auth import get_current_user_optional
from models.users import User
from utils.logger import project_logger
from datetime import datetime, timedelta, timezone
import asyncio

router = APIRouter()

# Constants
ROLE_USER = "user"
ROLE_PREMIUM = "premium"

# Simple in-memory cache by user with size limit
_projects_cache = {}
_cache_timestamps = {}
CACHE_TTL = timedelta(minutes=5)
MAX_CACHE_SIZE = 100  # Limit cache to 100 entries

def clear_projects_cache():
    """Clear the projects cache manually (used by admin routes)."""
    _projects_cache.clear()
    _cache_timestamps.clear()
    project_logger.info("Projects cache manually cleared.")


def get_hardcoded_fallback_repositories() -> list[Repository]:
    """Returns a list of fallback repositories if both GitHub API and database are unavailable."""
    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()
    return [
        Repository(
            id=101,
            name="Safety-Flow",
            full_name="theorbesystems-sketch/Safety-Flow",
            description="Fluxo e controle de segurança digital em tempo real.",
            html_url="https://github.com/theorbesystems-sketch/Safety-Flow",
            language="TypeScript",
            stargazers_count=45,
            forks_count=8,
            topics=["security", "cyber", "real-time"],
            updated_at=now_str,
            is_featured=True,
        ),
        Repository(
            id=102,
            name="AstroWatch",
            full_name="theorbesystems-sketch/AstroWatch",
            description="Monitoramento de satélites e detecção de detritos espaciais.",
            html_url="https://github.com/theorbesystems-sketch/AstroWatch",
            language="Python",
            stargazers_count=38,
            forks_count=5,
            topics=["space", "astronomy", "monitoring"],
            updated_at=now_str,
            is_featured=True,
        ),
        Repository(
            id=103,
            name="Caronice",
            full_name="theorbesystems-sketch/Caronice",
            description="Plataforma inteligente de caronas solidárias corporativas.",
            html_url="https://github.com/theorbesystems-sketch/Caronice",
            language="Kotlin",
            stargazers_count=29,
            forks_count=12,
            topics=["mobility", "corporate", "ridesharing"],
            updated_at=now_str,
            is_featured=True,
        ),
        Repository(
            id=104,
            name="X1 World",
            full_name="theorbesystems-sketch/x1-world",
            description="Arena de e-sports com contratos inteligentes e pontuação em blockchain.",
            html_url="https://github.com/theorbesystems-sketch/x1-world",
            language="TypeScript",
            stargazers_count=64,
            forks_count=18,
            topics=["blockchain", "e-sports", "gaming"],
            updated_at=now_str,
            is_featured=True,
        ),
        Repository(
            id=105,
            name="OrbeSystems",
            full_name="theorbesystems-sketch/OrbeSystems",
            description="Portal oficial e ecossistema de segurança cibernética.",
            html_url="https://github.com/theorbesystems-sketch/OrbeSystems",
            language="TypeScript",
            stargazers_count=120,
            forks_count=35,
            topics=["portal", "cyber-security", "nextjs"],
            updated_at=now_str,
            is_featured=True,
        )
    ]


def get_repositories_from_db(db) -> list[Repository]:
    """Load repositories from the github_repositories table."""
    from models.repository_db import RepositoryDB
    try:
        db_repos = db.query(RepositoryDB).all()
        repos = []
        for r in db_repos:
            repos.append(
                Repository(
                    id=r.id,
                    name=r.name,
                    full_name=r.full_name,
                    description=r.description,
                    custom_description=r.custom_description,
                    image_url=r.image_url,
                    video_url=r.video_url,
                    deploy_url=r.deploy_url,
                    html_url=r.html_url,
                    language=r.language,
                    stargazers_count=r.stargazers_count or 0,
                    forks_count=r.forks_count or 0,
                    topics=r.topics or [],
                    updated_at=r.updated_at or "",
                    is_featured=r.is_featured or False,
                    is_premium_only=r.is_premium_only or False
                )
            )
        return repos
    except Exception as e:
        project_logger.error(f"Failed to query RepositoryDB: {e}")
        return []


def sync_repositories_to_db(db, repos: list[Repository]):
    """Sync/upsert repositories into the github_repositories table."""
    from models.repository_db import RepositoryDB
    try:
        for repo in repos:
            db_repo = db.query(RepositoryDB).filter(RepositoryDB.id == repo.id).first()
            if db_repo:
                db_repo.name = repo.name
                db_repo.full_name = repo.full_name
                db_repo.description = repo.description
                db_repo.custom_description = repo.custom_description
                db_repo.image_url = repo.image_url
                db_repo.video_url = repo.video_url
                db_repo.deploy_url = repo.deploy_url
                db_repo.html_url = repo.html_url
                db_repo.language = repo.language
                db_repo.stargazers_count = repo.stargazers_count
                db_repo.forks_count = repo.forks_count
                db_repo.topics = repo.topics
                db_repo.updated_at = repo.updated_at
                db_repo.is_featured = repo.is_featured
                db_repo.is_premium_only = repo.is_premium_only
            else:
                db_repo = RepositoryDB(
                    id=repo.id,
                    name=repo.name,
                    full_name=repo.full_name,
                    description=repo.description,
                    custom_description=repo.custom_description,
                    image_url=repo.image_url,
                    video_url=repo.video_url,
                    deploy_url=repo.deploy_url,
                    html_url=repo.html_url,
                    language=repo.language,
                    stargazers_count=repo.stargazers_count,
                    forks_count=repo.forks_count,
                    topics=repo.topics,
                    updated_at=repo.updated_at,
                    is_featured=repo.is_featured,
                    is_premium_only=repo.is_premium_only
                )
                db.add(db_repo)
        db.commit()
        project_logger.info(f"Successfully synced {len(repos)} repositories to RepositoryDB.")
    except Exception as e:
        db.rollback()
        project_logger.error(f"Failed to sync repositories to RepositoryDB: {e}")


@router.get("/projects", response_model=list[Repository])
async def get_projects(current_user: User | None = Depends(get_current_user_optional)):
    """
    Return all public GitHub repositories for theorbesystems-sketch.
    Featured repositories appear first. Merges with local metadata overrides.
    Also includes manually injected repos from the database.

    Premium-only repositories are only shown to premium users.
    """
    # Determine cache key based on user role
    user_id = current_user.id if current_user else "anonymous"
    is_premium = current_user and current_user.role == ROLE_PREMIUM
    cache_key = f"{user_id}_{is_premium}"

    # Check cache
    now = datetime.now(timezone.utc)
    if cache_key in _projects_cache:
        cache_time = _cache_timestamps.get(cache_key)
        if cache_time and (now - cache_time) < CACHE_TTL:
            project_logger.info(f"Cache hit for user {user_id}")
            return _projects_cache[cache_key]

    db = SessionLocal()
    try:
        repos = []
        fetch_success = False

        try:
            # 1. Fetch from GitHub
            repos = await fetch_repositories()
            fetch_success = True
        except Exception as github_exc:
            project_logger.error(f"GitHub API fetch failed: {github_exc}. Falling back to database cache.")

        metadata = get_all_metadata(db)
        existing_ids = {repo.id for repo in repos}

        if fetch_success:
            # 2. Merge metadata overrides with fetched repos
            for repo in repos:
                custom = metadata.get(str(repo.id))
                if custom:
                    repo.custom_description = custom.get("custom_description")
                    repo.image_url = custom.get("image_url")
                    repo.video_url = custom.get("video_url")
                    repo.deploy_url = custom.get("deploy_url")
                    repo.is_premium_only = custom.get("is_premium_only")

            # 3. Add manually injected premium/custom repos
            for repo_id_str, meta in metadata.items():
                try:
                    repo_id = int(repo_id_str)
                except ValueError:
                    import hashlib
                    repo_id = int(hashlib.md5(repo_id_str.encode('utf-8')).hexdigest()[:8], 16)

                if repo_id not in existing_ids and meta.get("is_featured"):
                    repo_name = meta.get("repo_name")
                    if repo_name:
                        github_data = None
                        try:
                            project_logger.info(f"Fetching injected repo: {repo_name}")
                            github_data = await fetch_single_repo(repo_name)
                        except Exception as e:
                            project_logger.error(f"Failed to fetch injected repo {repo_name} from GitHub: {e}")

                        if github_data:
                            repos.append(
                                Repository(
                                    id=github_data["id"],
                                    name=github_data["name"],
                                    full_name=github_data["full_name"],
                                    description=github_data.get("description"),
                                    html_url=github_data["html_url"],
                                    language=github_data.get("language"),
                                    stargazers_count=github_data.get("stargazers_count", 0),
                                    forks_count=github_data.get("forks_count", 0),
                                    topics=github_data.get("topics", []),
                                    updated_at=github_data.get("updated_at", ""),
                                    is_featured=True,
                                    custom_description=meta.get("custom_description"),
                                    image_url=meta.get("image_url"),
                                    video_url=meta.get("video_url"),
                                    deploy_url=meta.get("deploy_url"),
                                    is_premium_only=meta.get("is_premium_only"),
                                )
                            )
                        else:
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
                                    is_featured=True,
                                    custom_description=meta.get("custom_description"),
                                    image_url=meta.get("image_url"),
                                    video_url=meta.get("video_url"),
                                    deploy_url=meta.get("deploy_url"),
                                    is_premium_only=meta.get("is_premium_only"),
                                )
                            )

            # 4. Sync the fully-merged and injected list to the database
            sync_repositories_to_db(db, repos)

        else:
            # Load from database repositories table as fallback
            repos = get_repositories_from_db(db)
            if not repos:
                project_logger.warning("RepositoryDB is empty! Using hardcoded fallback repositories.")
                repos = get_hardcoded_fallback_repositories()

        # Sort the final list: featured first, then by stars desc
        featured_names = [r.name for r in repos if r.is_featured]
        repos.sort(
            key=lambda r: (
                0 if r.is_featured else 1,
                featured_names.index(r.name) if r.is_featured and r.name in featured_names else -r.stargazers_count,
            )
        )

        # Filter premium-only repos for non-premium users
        is_premium = current_user and current_user.role == ROLE_PREMIUM
        if not is_premium:
            repos = [repo for repo in repos if not repo.is_premium_only]

        # Save to cache with size limit
        if len(_projects_cache) >= MAX_CACHE_SIZE:
            oldest_key = min(_cache_timestamps, key=_cache_timestamps.get)
            del _projects_cache[oldest_key]
            del _cache_timestamps[oldest_key]
            project_logger.info(f"Cache evicted oldest entry: {oldest_key}")

        _projects_cache[cache_key] = repos
        _cache_timestamps[cache_key] = now
        project_logger.info(f"Cache updated for user {user_id} (size: {len(_projects_cache)})")

        return repos
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        project_logger.error(f"Internal error in get_projects: {exc}", exc_info=True)
        try:
            # Final fallback to database in case of general failure
            repos = get_repositories_from_db(db)
            if repos:
                is_premium = current_user and current_user.role == ROLE_PREMIUM
                if not is_premium:
                    repos = [repo for repo in repos if not repo.is_premium_only]
                return repos
        except Exception as fallback_exc:
            project_logger.error(f"Failed to execute final database fallback: {fallback_exc}")
        raise HTTPException(
            status_code=500,
            detail="Erro ao obter repositórios. Serviço temporariamente indisponível.",
        )
    finally:
        db.close()
