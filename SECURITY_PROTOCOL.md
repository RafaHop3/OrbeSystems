# 🔒 Orbe Systems — Security Protocol
> **Version:** 1.0 | **Date:** 2026-05-21 | **Author:** Rafael / Antigravity AI

This document defines the **mandatory security baseline** for all Orbe Systems projects.
Every new project, feature, and deployment MUST pass this checklist before merging.

---

## 📋 Pre-Commit Checklist

Before every `git commit`, verify:

- [ ] No `.env` files staged: `git status` shows no `.env*` files
- [ ] No hardcoded secrets, tokens, passwords, or API keys in source files
- [ ] All new secret fields use environment variables (not default values in code)
- [ ] No new debug/test endpoints are left public and unauthenticated
- [ ] No `traceback` or internal error details are returned in HTTP responses

```bash
# Quick pre-commit check: scan for secrets
grep -rn "ghp_\|sk_live_\|sk_test_\|whsec_\|password=\|api_key=" --include="*.py" --include="*.ts" --include="*.js" .
```

---

## 🌍 Environment Variables Rules

### The Golden Rule
> **Source code NEVER contains real secrets.** It only contains structure.

| ✅ Allowed in source | ❌ Forbidden in source |
|---|---|
| Variable names (e.g., `GITHUB_TOKEN: str`) | Real values (e.g., `ghp_abc123...`) |
| `.env.example` with FAKE/placeholder values | `.env` files with real values |
| Validation logic for secret format | Default values that are real secrets |

### File Naming Convention

| File | Commit to Git? | Purpose |
|---|---|---|
| `.env` | **NO** ❌ | Local development secrets |
| `.env.local` | **NO** ❌ | Local Next.js overrides |
| `.env.example` | **YES** ✅ | Template with fake values for onboarding |
| `.env.production.example` | **YES** ✅ | Production template (no real values) |

### Required Variables Per Project

**Backend (FastAPI)**:
```
SECRET_KEY         # python -c "import secrets; print(secrets.token_hex(32))"
ADMIN_USERNAME     # your chosen admin username
ADMIN_PASSWORD_HASH # python generate_hash.py
GITHUB_TOKEN       # from github.com/settings/tokens
DATABASE_URL       # sqlite:///./data/projects.db (local) or PostgreSQL URL
```

**Frontend (Next.js)**:
```
NEXT_PUBLIC_API_URL  # http://localhost:8000 (dev) or Render URL (prod)
```

---

## 🚫 Forbidden Patterns

### 1. Hardcoded Fallback Secrets
```python
# ❌ FORBIDDEN — insecure default
GITHUB_TOKEN: str = "ghp_my_real_token"

# ✅ CORRECT — no default, Pydantic fails on missing value
GITHUB_TOKEN: str
```

### 2. Exposing Debug Info in HTTP Responses
```python
# ❌ FORBIDDEN — leaks internal details to attackers
return JSONResponse(status_code=500, content={
    "traceback": traceback.format_exc(),  # Never!
    "error_msg": str(exc),                # Never!
})

# ✅ CORRECT — log internally, return generic message
print(f"INTERNAL ERROR: {traceback.format_exc()}")
return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
```

### 3. Unauthenticated Debug/Admin Endpoints
```python
# ❌ FORBIDDEN — publicly exposes configuration
@app.get("/debug-config")
async def debug_config():
    return {"admin_username": settings.ADMIN_USERNAME}

# ✅ CORRECT — use the protected /docs endpoint for debugging
# Or add admin token dependency: Depends(get_current_admin)
```

### 4. Verbose Auth Logging
```python
# ❌ FORBIDDEN — leaks expected credentials in logs
print(f"[AUTH] Expected: '{ADMIN_USERNAME}'")
print(f"[AUTH] Password result: {is_valid}")

# ✅ CORRECT — minimal, non-revealing logs
print("[AUTH] Login attempt received.")
```

---

## 🔐 Deployment Checklist (Render / Vercel)

### Before every production deployment:

- [ ] All env vars set in Render/Vercel dashboard (NOT in `render.yaml` as `value:`)
- [ ] `SECRET_KEY` is a cryptographically random 64-char hex string
- [ ] `ADMIN_PASSWORD_HASH` is a bcrypt hash (not the plaintext password)
- [ ] `GITHUB_TOKEN` is a real PAT with minimal scopes (`read:user`, `public_repo`)
- [ ] Stripe keys are production keys (`sk_live_`, `whsec_`)
- [ ] CORS `allow_origins` is locked to production domain(s) only

### Generating Secrets Safely
```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# ADMIN_PASSWORD_HASH
cd backend && python generate_hash.py

# Verify bcrypt hash is valid
python -c "import bcrypt; print(bcrypt.checkpw(b'mypassword', b'$2b$12$...yourhashere...'))"
```

---

## 🔑 Access Control Rules

| Endpoint Category | Auth Required |
|---|---|
| `GET /health` | None (keep-alive probe) |
| `GET /api/projects` | None (public portfolio) |
| `POST /api/auth/login` | Rate-limited (5/min) |
| `GET /docs` | HTTP Basic (admin only) |
| `GET /api/admin/*` | JWT Bearer token |
| `GET /debug/*` | **MUST NOT EXIST in production** |

---

## 🗂️ Git History — Leaked Secrets Response

If a secret is ever committed by mistake:

1. **Immediately revoke** the token/key from its provider (GitHub, Stripe, Cloudinary)
2. Generate a new secret
3. **Remove from git history** (if needed):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/.env" \
     --prune-empty --tag-name-filter cat -- --all
   git push origin --force --all
   ```
4. Update the `.gitignore` to prevent recurrence
5. Document the incident in the project changelog

---

## 📦 New Project Onboarding Template

When starting a new Orbe Systems project, run this setup:

```bash
# 1. Copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.production.example frontend/.env.local

# 2. Fill in real values in the .env files

# 3. Verify gitignore is in place
cat .gitignore | grep "\.env"

# 4. Confirm nothing is staged
git status
```

---

*This protocol is enforced by the Orbe Systems development standard.
Violations should be caught in code review before merge.*
