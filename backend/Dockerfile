# ─────────────────────────────────────────────────────────────────────────────
# Orbe Systems — FastAPI Backend
# Build: docker build -t orbe-api .
# Run:   docker run -p 8000:8000 --env-file .env orbe-api
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: dependency builder (keeps final image lean)
FROM python:3.11-slim AS builder

WORKDIR /build

# Copy only requirements first for better layer caching
COPY requirements.txt .

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev libffi-dev && \
    pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: production image
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Security: run as non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    chown -R appuser /app
USER appuser

EXPOSE 8000

# Use uvicorn; Mangum is only active on AWS Lambda
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
