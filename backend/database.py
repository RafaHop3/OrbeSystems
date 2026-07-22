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

# SQLite handles threads differently than PostgreSQL. Add a 30s timeout to prevent locking.
connect_args = {"check_same_thread": False, "timeout": 30} if db_url.startswith("sqlite") else {}

# Ensure SQLite directory exists
if db_url.startswith("sqlite"):
    # If running on Vercel or other Serverless, force database to live in /tmp
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        db_url = "sqlite:////tmp/projects.db"
        print(f"[Database] Serverless environment detected. Redirected SQLite URL to: {db_url}")

    db_path = db_url.replace("sqlite:///", "").replace("./", "")
    if db_path.startswith("/"):
        db_dir = os.path.dirname(db_path)
    else:
        db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        try:
            os.makedirs(db_dir, exist_ok=True)
            print(f"[Database] Created directory: {db_dir}")
        except Exception as e:
            print(f"[Database] Warning: Could not create directory {db_dir}: {e}")

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

# Auto-initialize database on demand (critical for Vercel Serverless environment where lifespan is not run)
_db_initialized = False

def init_db():
    print("[Database] Dynamic database initialization started...")
    # Import models locally to prevent circular import issues on module load
    import models.metadata
    import models.users
    import models.math_vectors
    import models.math_matrices
    import models.audit_log
    import models.imobverse
    import models.repository_db
    import models.test_event
    import models.analytics
    import models.security_alert
    
    # Create all tables if not exists
    Base.metadata.create_all(bind=engine)
    print("[Database] Base tables verified/created.")
    
    # Run self-healing schema migrations
    try:
        from main import run_migrations
        run_migrations()
    except Exception as e:
        print(f"[Database] Warning: failed to run self-healing migrations: {e}")
        
    # Apply Supabase Row-Level Security if applicable
    try:
        from security.supabase_rls import ensure_supabase_rls
        ensure_supabase_rls(engine)
    except Exception as e:
        print(f"[Database] Warning: failed to apply Supabase RLS: {e}")

class AppSessionLocal(sessionmaker):
    def __call__(self, *args, **kwargs):
        global _db_initialized
        if not _db_initialized:
            _db_initialized = True  # Avoid infinite recursion to allow init_db to query database if needed
            try:
                init_db()
            except Exception as e:
                _db_initialized = False  # Reset on failure
                print(f"[Database] Error in dynamic database initialization: {e}")
        return super().__call__(*args, **kwargs)

SessionLocal = AppSessionLocal(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
