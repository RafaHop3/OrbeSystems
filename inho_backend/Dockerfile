# ══════════════════════════════════════════════════════════════════
# INHO API – Multi-Stage Docker Build
# Stage 1: Builder  — installs Python dependencies in an isolated venv
# Stage 2: Runtime  — lean image, non-root user, no build tools
# ══════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ─────────────────────────────────────────────
FROM python:3.12-slim AS builder

# System deps for psycopg2 compilation (asyncpg is pure Python, but
# psycopg2-binary bundles its own libs — kept slim here)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and activate a virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Only the minimal OS packages needed at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built venv from builder — no pip, no build tools
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY --from=builder $VIRTUAL_ENV $VIRTUAL_ENV

# Create a non-root application user (Cyber Safety)
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/false --create-home appuser

WORKDIR /app

# Copy application source (respects .dockerignore)
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8000

# Health check — matches the /health endpoint in main.py
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the ASGI server
# workers=1 for Fargate; horizontal scaling is handled by ECS desired_count
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
