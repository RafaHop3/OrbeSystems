import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Resolve absolute path to INHO DB dynamically based on environment
INHO_DB_URL = os.environ.get("INHO_DATABASE_URL")
if not INHO_DB_URL:
    # Local development logic: resolve parallel inho_backend folder
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
    inho_db_path = os.path.join(base_dir, "inho_backend", "inho_dev.db")
    INHO_DB_URL = f"sqlite:///{inho_db_path}"

if INHO_DB_URL.startswith("postgres://"):
    INHO_DB_URL = INHO_DB_URL.replace("postgres://", "postgresql://", 1)

if "supabase" in INHO_DB_URL and "sslmode=require" not in INHO_DB_URL:
    separator = "&" if "?" in INHO_DB_URL else "?"
    INHO_DB_URL += f"{separator}sslmode=require"

connect_args = {"check_same_thread": False, "timeout": 30} if INHO_DB_URL.startswith("sqlite") else {}

# Use NullPool for supabase pooler if needed, similar to master DB
from sqlalchemy.pool import NullPool

if "pooler.supabase.com" in INHO_DB_URL:
    inho_engine = create_engine(
        INHO_DB_URL, 
        connect_args=connect_args,
        poolclass=NullPool
    )
else:
    inho_engine = create_engine(
        INHO_DB_URL, 
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=3600
    )

InhoSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=inho_engine)

def get_inho_db():
    db = InhoSessionLocal()
    try:
        yield db
    finally:
        db.close()
