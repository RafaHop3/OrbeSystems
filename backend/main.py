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
from routes.admin_database import router as admin_database_router
from routes.analytics import router as analytics_router
from routes.upload import router as upload_router
from routes.users import router as users_router
from routes.checkout import router as checkout_router
from routes.webhooks import router as webhooks_router
from routes.imortal import router as imortal_router
from routes.imobverse import router as imobverse_router
from security.auth import verify_password
from security.supabase_rls import ensure_supabase_rls
from sqlalchemy import inspect, text
from database import engine, Base
import models.metadata  # Import to register models
import models.users      # Import to register User tables
import models.math_vectors  # Import to register math_vectors table
import models.math_matrices  # Import to register math_matrices table
import models.audit_log    # Import to register audit_log table
import models.imobverse   # Import to register imob_* tables
import models.repository_db # Import to register github_repositories table

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

        # Ensure IMORTAL project metadata exists for the premium portal
        exists = conn.execute(text("SELECT 1 FROM projects_metadata WHERE id = 'imortal'")).fetchone()
        if not exists:
            print("INFO: [Migration] Registering IMORTAL Premium Project...")
            conn.execute(text(
                "INSERT INTO projects_metadata (id, repo_name, custom_description, deploy_url, is_featured, is_premium_only) "
                "VALUES ('imortal', 'IMORTAL', 'AI-Powered Formal Verification Toolchain for Embedded Systems (Z3 Solver + Stochastic Fuzzing)', '/imortal', 1, 1)"
            ))
        else:
            conn.execute(text(
                "UPDATE projects_metadata SET deploy_url = '/imortal' WHERE id = 'imortal'"
            ))

        # Registrar o Imobverse na tabela de metadados
        imobverse_exists = conn.execute(text("SELECT 1 FROM projects_metadata WHERE id = 'imobverse'")).fetchone()
        if not imobverse_exists:
            print("INFO: [Migration] Registering IMOBVERSE Premium Project...")
            conn.execute(text(
                "INSERT INTO projects_metadata (id, repo_name, custom_description, deploy_url, is_featured, is_premium_only) "
                "VALUES ('imobverse', 'Imobverse', 'Plataforma Proptech com Motor de Reputacao, Vistoria Fotografica Inteligente e Geracao de Leads', '/ferramentas-premium/imobverse', 1, 1)"
            ))

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
        ensure_supabase_rls(engine)
    except Exception as e:
        print(f"ERROR: [Database] Failed to init DB: {e}")
    
    yield
    
    # Shutdown
    print(" OrbeSystems API shutting down...")


# ── App ────────────────────────────────────────────────────────────
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

# ── CORS Middleware ────────────────────────────────────────────────────────
# IMPORTANT: Must be registered FIRST, before any exception handlers.
# This ensures CORS headers are present even on 500 error responses.
# Without this, the browser blocks the response before the JS can read the error.
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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global handler: logs full traceback server-side, returns the real error message to clients."""
    err_msg = traceback.format_exc()
    print(f"CRITICAL UNHANDLED ERROR: {err_msg}")
    # Return the real error detail to help debug api/repo issues.
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# ── Rate Limiting (SlowAPI) ───────────────────────────────────────────────────
app.state.limiter = auth_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Secure Docs ──────────────────────────────────────────────────────────

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


# ── Routers ───────────────────────────────────────────────────────────
app.include_router(projects_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(auth_public_router, prefix="/api/auth", tags=["auth-public"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(admin_projects_router, prefix="/api/admin", tags=["admin-projects"])
app.include_router(admin_users_router, prefix="/api/admin", tags=["admin-users"])
app.include_router(admin_database_router, prefix="/api/admin", tags=["admin-database"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(upload_router, prefix="/api/admin", tags=["admin-upload"])
# ── User Domain (RBAC) ───────────────────────────────────────────────────────
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(checkout_router, prefix="/api/users", tags=["users-checkout"])
app.include_router(webhooks_router, prefix="/api", tags=["webhooks"])
app.include_router(imortal_router, prefix="/api", tags=["imortal"])
app.include_router(imobverse_router, prefix="/api", tags=["imobverse"])


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


# SECURITY NOTE: The /debug/github-lookup endpoint has been removed.
# Debug routes must never be public — use /docs (HTTP Basic protected) for manual testing.
