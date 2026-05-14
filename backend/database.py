import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

# Handle PostgreSQL URLs for Render (replace postgres:// with postgresql:// if needed)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# SQLite handles threads differently than PostgreSQL
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

# Ensure SQLite directory exists
if db_url.startswith("sqlite"):
    # Extract path from sqlite:///./data/projects.db
    db_path = db_url.replace("sqlite:///", "").replace("./", "")
    if db_path.startswith("/"):
        db_dir = os.path.dirname(db_path)
    else:
        db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        print(f"[Database] Created directory: {db_dir}")

# Use pool_pre_ping to check connection liveness (critical for Render's idle spin-downs)
# Use pool_recycle to proactively recycle connections before Render closes them
engine = create_engine(
    db_url, 
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=3600
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
