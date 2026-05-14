from pydantic import BaseModel
from typing import Optional


class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    custom_description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    deploy_url: Optional[str] = None
    html_url: str
    language: Optional[str] = None
    stargazers_count: int = 0
    forks_count: int = 0
    topics: list[str] = []
    updated_at: str
    is_featured: bool = False
    is_premium_only: bool = False
