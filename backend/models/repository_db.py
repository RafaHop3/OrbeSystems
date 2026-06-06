from sqlalchemy import Column, String, Integer, Text, Boolean, JSON
from database import Base

class RepositoryDB(Base):
    __tablename__ = "github_repositories"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    custom_description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    deploy_url = Column(Text, nullable=True)
    html_url = Column(String, nullable=False)
    language = Column(String, nullable=True)
    stargazers_count = Column(Integer, default=0)
    forks_count = Column(Integer, default=0)
    topics = Column(JSON, nullable=True)  # Will store list of strings
    updated_at = Column(String, nullable=True)
    is_featured = Column(Boolean, default=False, index=True)
    is_premium_only = Column(Boolean, default=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "full_name": self.full_name,
            "description": self.description,
            "custom_description": self.custom_description,
            "image_url": self.image_url,
            "video_url": self.video_url,
            "deploy_url": self.deploy_url,
            "html_url": self.html_url,
            "language": self.language,
            "stargazers_count": self.stargazers_count,
            "forks_count": self.forks_count,
            "topics": self.topics or [],
            "updated_at": self.updated_at or "",
            "is_featured": self.is_featured,
            "is_premium_only": self.is_premium_only,
        }
