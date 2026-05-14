import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

# Handle PostgreSQL URLs for Render and Supabase
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Enforce SSL for Supabase (required for external connections from Vercel)
if "supabase" in db_url and "sslmode=require" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url += f"{separator}sslmode=require"

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

from sqlalchemy.pool import NullPool

# Use pool_pre_ping to check connection liveness (critical for Render's idle spin-downs)
# Use pool_recycle to proactively recycle connections before Render closes them
# For Vercel/Supabase pooler (port 6543), we MUST use NullPool because PgBouncer in transaction mode breaks SQLAlchemy pooling.
if "pooler.supabase.com" in db_url:
    engine = create_engine(
        db_url, 
        connect_args=connect_args,
        poolclass=NullPool
    )
else:
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
