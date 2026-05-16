import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import settings
from routes.projects import router as projects_router
from routes.auth import router as auth_router, limiter as auth_limiter
from routes.auth_public import router as auth_public_router
from routes.admin import router as admin_router
from routes.admin_projects import router as admin_projects_router
from routes.admin_users import router as admin_users_router
from routes.analytics import router as analytics_router
from routes.upload import router as upload_router
from routes.users import router as users_router
from routes.checkout import router as checkout_router
from routes.webhooks import router as webhooks_router
from security.auth import verify_password
from sqlalchemy import inspect, text
from database import engine, Base
import models.metadata  # Import to register models
import models.users      # Import to register User tables
import models.math_vectors  # Import to register math_vectors table
import models.math_matrices  # Import to register math_matrices table
import models.audit_log  # Import to register audit_log table

def run_migrations():
    """ 
    Self-healing migration: Automatically adds missing columns 
    without requiring Alembic. Critical for non-destructive schema updates.
    """
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('projects_metadata')]
    
    with engine.begin() as conn:
        if 'deploy_url' not in columns:
            print("INFO: [Migration] Adding 'deploy_url' column...")
            conn.execute(text("ALTER TABLE projects_metadata ADD COLUMN deploy_url TEXT"))

        if 'is_featured' not in columns:
            print("INFO: [Migration] Adding 'is_featured' column...")
            conn.execute(text("ALTER TABLE projects_metadata ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT 0"))

        if 'repo_name' not in columns:
            print("INFO: [Migration] Adding 'repo_name' column...")
            conn.execute(text("ALTER TABLE projects_metadata ADD COLUMN repo_name TEXT"))

        if 'is_premium_only' not in columns:
            print("INFO: [Migration] Adding 'is_premium_only' column...")
            conn.execute(text("ALTER TABLE projects_metadata ADD COLUMN is_premium_only BOOLEAN NOT NULL DEFAULT 0"))

        # Check if index exists
        indices = inspector.get_indexes('projects_metadata')
        index_names = [idx['name'] for idx in indices]
        if 'ix_projects_metadata_is_featured' not in index_names:
            print("INFO: [Migration] Adding index for 'is_featured'...")
            conn.execute(text("CREATE INDEX ix_projects_metadata_is_featured ON projects_metadata (is_featured)"))
        if 'ix_projects_metadata_is_premium_only' not in index_names:
            print("INFO: [Migration] Adding index for 'is_premium_only'...")
            conn.execute(text("CREATE INDEX ix_projects_metadata_is_premium_only ON projects_metadata (is_premium_only)"))

    print("INFO: [Migration] Schema is up to date.")

# Task List:
# - [x] Install/Add Backend dependency (`cloudinary`)
# - [x] Update `backend/config.py` with Cloudinary fields
# - [x] Create `backend/services/upload_service.py`
# - [x] Create `backend/routes/upload.py`
# - [x] Integrate upload route in `backend/main.py`
# - [/] Create Frontend `FileUploader` component
# - [ ] Integrate `FileUploader` into `app/admin/page.tsx`
# - [ ] Verify upload flow to production CDN
# - [ ] Integrate Tracking Script in Global Layout
# - [ ] Verify with Subagent test

security_basic = HTTPBasic()

# ── Lifespan (startup/shutdown hooks) ─────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup hooks."""
    print(" OrbeSystems API starting up...")
    
    # Validate all configurations
    try:
        settings.validate_all()
        print(" Configuration validated")
    except ValueError as e:
        print(f" Configuration error: {e}")
        # Vercel: We do not raise here so the function can still boot and return meaningful errors.
    
    # Run migrations safely
    try:
        print(f"INFO: [Database] Initializing tables...")
        Base.metadata.create_all(bind=engine)
        run_migrations()
    except Exception as e:
        print(f"ERROR: [Database] Failed to init DB: {e}")
    
    yield
    
    # Shutdown
    print(" OrbeSystems API shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────
import traceback
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Orbe Systems API",
    description="Secured API Gateway for Orbe Systems.",
    version="1.0.0",
    docs_url=None,   # Native docs disabled for security
    redoc_url=None,
    lifespan=lifespan,
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    err_msg = traceback.format_exc()
    print(f"CRITICAL UNHANDLED ERROR: {err_msg}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error_type": str(type(exc)), "error_msg": str(exc), "traceback": err_msg}
    )

@app.get("/api/admin/migrate-db")
async def force_migrate_db():
    """Temporary endpoint to force database migration on serverless environments."""
    try:
        Base.metadata.create_all(bind=engine)
        run_migrations()
        return {"status": "success", "message": "Database tables created and migrated successfully on production!"}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

# ── CORS Middleware ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://orbesystems.com.br",
        "https://www.orbesystems.com.br",
        "https://orbe-systems.vercel.app",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting (SlowAPI) ───────────────────────────────────────────────────
app.state.limiter = auth_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Secure Docs ───────────────────────────────────────────────────────────────

def get_current_admin_docs(credentials: HTTPBasicCredentials = Depends(security_basic)):
    correct_username = secrets.compare_digest(credentials.username, settings.ADMIN_USERNAME)
    correct_password = False
    if correct_username:
        correct_password = verify_password(credentials.password, settings.ADMIN_PASSWORD_HASH)
        
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.get("/docs", include_in_schema=False)
async def get_documentation(username: str = Depends(get_current_admin_docs)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="Secure Docs")

@app.get("/openapi.json", include_in_schema=False)
async def openapi(username: str = Depends(get_current_admin_docs)):
    return get_openapi(title=app.title, version=app.version, routes=app.routes)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(projects_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(auth_public_router, prefix="/api/auth", tags=["auth-public"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(admin_projects_router, prefix="/api/admin", tags=["admin-projects"])
app.include_router(admin_users_router, prefix="/api/admin", tags=["admin-users"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(upload_router, prefix="/api/admin", tags=["admin-upload"])
# ── User Domain (RBAC) ────────────────────────────────────────────────────────
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(checkout_router, prefix="/api/users", tags=["users-checkout"])
app.include_router(webhooks_router, prefix="/api", tags=["webhooks"])


@app.get("/health", tags=["health"])
async def health_check():
    """Lightweight health probe for Render keep-alive pings."""
    from datetime import datetime
    return {
        "status": "operational",
        "service": "orbe-systems-api",
        "version": "1.3.0",
        "deployed_at": datetime.utcnow().isoformat()
    }


@app.get("/debug/github-lookup", tags=["debug"])
async def debug_github_lookup(repo_name: str = "PDF8EVER"):
    """Debug endpoint to test GitHub repo lookup directly."""
    from services.github_service import fetch_single_repo
    try:
        result = await fetch_single_repo(repo_name)
        return {
            "repo_name": repo_name,
            "found": result is not None,
            "data": result,
            "github_token_configured": settings.GITHUB_TOKEN != "token_de_fallback_inseguro"
        }
    except Exception as e:
        return {
            "repo_name": repo_name,
            "found": False,
            "error": str(e),
            "github_token_configured": settings.GITHUB_TOKEN != "token_de_fallback_inseguro"
        }
