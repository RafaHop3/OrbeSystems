from fastapi import APIRouter, Depends, HTTPException
from services.github_service import fetch_repositories, fetch_single_repo
from services.metadata_service import get_all_metadata
from models.repository import Repository
from database import SessionLocal
from security.auth import get_current_user_optional
from models.user import User
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
        repos = await fetch_repositories()
        metadata = get_all_metadata(db)

        # Create a set of existing repo IDs for quick lookup
        existing_ids = {repo.id for repo in repos}

        # Merge metadata with fetched repos
        for repo in repos:
            custom = metadata.get(str(repo.id))
            if custom:
                repo.custom_description = custom.get("custom_description")
                repo.image_url = custom.get("image_url")
                repo.video_url = custom.get("video_url")
                repo.deploy_url = custom.get("deploy_url")
                repo.is_premium_only = custom.get("is_premium_only")

        # Add manually injected repos that are not in the GitHub API results
        for repo_id_str, meta in metadata.items():
            repo_id = int(repo_id_str)
            if repo_id not in existing_ids and meta.get("is_featured"):
                # Fetch fresh data from GitHub for this repo
                try:
                    repo_name = meta.get("repo_name")
                    if repo_name:
                        project_logger.info(f"Fetching injected repo: {repo_name}")
                        # Try to fetch from GitHub to get updated stats
                        github_data = await fetch_single_repo(repo_name)
                        if github_data:
                            project_logger.info(f"Successfully fetched: {github_data['name']}")
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
                            project_logger.warning(f"Failed to fetch repo: {repo_name} (not found)")
                except Exception as e:
                    project_logger.error(f"Failed to fetch injected repo {repo_id}: {e}")

        # Filter premium-only repos for non-premium users
        is_premium = current_user and current_user.role == ROLE_PREMIUM
        if not is_premium:
            repos = [repo for repo in repos if not repo.is_premium_only]

        # Save to cache with size limit
        if len(_projects_cache) >= MAX_CACHE_SIZE:
            # Remove oldest entry
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
        project_logger.error(f"Internal error in get_projects: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error: {str(exc)}",
        )
    finally:
        db.close()
