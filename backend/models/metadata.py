from sqlalchemy import Column, String, Text, Boolean
from database import Base

class ProjectMetadata(Base):
    __tablename__ = "projects_metadata"

    id = Column(String, primary_key=True, index=True)  # GitHub repo ID as string
    repo_name = Column(String, nullable=True, index=True)  # e.g. "OrbeSystems"
    custom_description = Column(String, nullable=True)
    image_url = Column(Text, nullable=True)
    video_url = Column(Text, nullable=True)
    deploy_url = Column(Text, nullable=True)
    is_featured = Column(Boolean, nullable=False, default=False, index=True)
    is_premium_only = Column(Boolean, nullable=False, default=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "repo_name": self.repo_name,
            "custom_description": self.custom_description,
            "image_url": self.image_url,
            "video_url": self.video_url,
            "deploy_url": self.deploy_url,
            "is_featured": self.is_featured,
            "is_premium_only": self.is_premium_only,
        }
