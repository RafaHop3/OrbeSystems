##############################################################################
# variables.tf — Orbe Systems
##############################################################################

# ── General ──────────────────────────────────────────────────────────────────

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for Lambda and API Gateway"
  type        = string
  default     = "us-east-1"
}

# ── AWS Credentials ───────────────────────────────────────────────────────────
# These are read from environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# Do NOT set them here — configure via `aws configure` or env vars.

# ── Vercel ────────────────────────────────────────────────────────────────────

variable "vercel_api_token" {
  description = "Vercel API token (Settings > Tokens)"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (leave empty for personal accounts)"
  type        = string
  default     = ""
}

variable "vercel_project_id" {
  description = "Vercel project ID (from project settings)"
  type        = string
  default     = "orbe-systems-fuc5"
}

# ── Backend — Admin Auth ──────────────────────────────────────────────────────

variable "admin_username" {
  description = "Admin login username"
  type        = string
  default     = "rafael_admin"
}

variable "admin_password_hash" {
  description = "bcrypt hash of admin password (generate with: python -c \"import bcrypt; print(bcrypt.hashpw(b'PASS', bcrypt.gensalt()).decode())\")"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "JWT signing secret (generate with: python -c \"import secrets; print(secrets.token_hex(32))\")"
  type        = string
  sensitive   = true
}

# ── Backend — External Services ───────────────────────────────────────────────

variable "database_url" {
  description = "PostgreSQL connection string (Supabase: postgresql://user:pass@host/db)"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token for repo API"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudinary_url" {
  description = "Cloudinary URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key (sk_live_... or sk_test_...)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret (whsec_...)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_premium_price_id" {
  description = "Stripe Price ID for the Premium plan (price_...)"
  type        = string
  default     = ""
}

variable "gemini_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "siem_webhook_url" {
  description = "External SIEM webhook URL (optional)"
  type        = string
  default     = ""
}

variable "frontend_url" {
  description = "Production frontend URL for Stripe redirects"
  type        = string
  default     = "https://orbesystems.com.br"
}
