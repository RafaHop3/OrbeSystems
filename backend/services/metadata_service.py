from typing import Dict, Optional
from sqlalchemy.orm import Session
from models.metadata import ProjectMetadata


def get_all_metadata(db: Session) -> Dict[str, dict]:
    """Returns all project metadata indexed by GitHub repo ID.
    
    The caller is responsible for providing and closing the DB session.
    """
    results = db.query(ProjectMetadata).all()
    return {
        item.id: {
            "repo_name": item.repo_name,
            "custom_description": item.custom_description,
            "image_url": item.image_url,
            "video_url": item.video_url,
            "deploy_url": item.deploy_url,
            "is_featured": bool(item.is_featured),
            "is_premium_only": bool(item.is_premium_only),
        }
        for item in results
    }


def get_project_metadata(repo_id: int, db: Session) -> Optional[dict]:
    """Returns custom metadata for a specific repository."""
    item = db.query(ProjectMetadata).filter(ProjectMetadata.id == str(repo_id)).first()
    if item:
        return {
            "repo_name": item.repo_name,
            "custom_description": item.custom_description,
            "image_url": item.image_url,
            "video_url": item.video_url,
            "deploy_url": item.deploy_url,
            "is_featured": bool(item.is_featured),
            "is_premium_only": bool(item.is_premium_only),
        }
    return None


def get_featured_repo_names(db: Session) -> list[str]:
    """Returns repo names marked as featured in the DB."""
    results = (
        db.query(ProjectMetadata.repo_name)
        .filter(
            ProjectMetadata.is_featured.is_(True),
            ProjectMetadata.repo_name.isnot(None),
        )
        .all()
    )
    return [r.repo_name for r in results if r.repo_name]


def save_project_metadata(repo_id: int, metadata: dict, db: Session) -> None:
    """Creates or updates custom metadata for a specific repository.
    
    Commits the transaction. The caller is responsible for the session lifecycle.
    Preserves existing values when new value is None (allows explicit clearing with empty string "").
    """
    repo_id_str = str(repo_id)
    db_item = db.query(ProjectMetadata).filter(ProjectMetadata.id == repo_id_str).first()

    if db_item:
        # Update repo_name if provided
        if "repo_name" in metadata and metadata["repo_name"] is not None:
            db_item.repo_name = metadata["repo_name"]
        
        # Update other fields only if explicitly provided (not None)
        # This preserves existing values when field is not sent
        if "custom_description" in metadata:
            db_item.custom_description = metadata["custom_description"]
        if "image_url" in metadata:
            db_item.image_url = metadata["image_url"]
        if "video_url" in metadata:
            db_item.video_url = metadata["video_url"]
        if "deploy_url" in metadata:
            db_item.deploy_url = metadata["deploy_url"]
        if "is_featured" in metadata:
            db_item.is_featured = bool(metadata["is_featured"])
        if "is_premium_only" in metadata:
            db_item.is_premium_only = bool(metadata["is_premium_only"])
    else:
        db_item = ProjectMetadata(
            id=repo_id_str,
            repo_name=metadata.get("repo_name"),
            custom_description=metadata.get("custom_description"),
            image_url=metadata.get("image_url"),
            video_url=metadata.get("video_url"),
            deploy_url=metadata.get("deploy_url"),
            is_featured=bool(metadata.get("is_featured", False)),
            is_premium_only=bool(metadata.get("is_premium_only", False)),
        )
        db.add(db_item)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"CRITICAL: Failed to save metadata to DB: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Erro interno ao salvar metadados.")
