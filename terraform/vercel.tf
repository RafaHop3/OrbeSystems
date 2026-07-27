##############################################################################
# vercel.tf — Vercel project environment variables
##############################################################################

# ── Production Environment Variables ─────────────────────────────────────────

resource "vercel_project_environment_variable" "api_url" {
  project_id = var.vercel_project_id
  key        = "NEXT_PUBLIC_API_URL"
  value      = aws_apigatewayv2_stage.default.invoke_url # Auto-fills Lambda URL
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "frontend_url" {
  project_id = var.vercel_project_id
  key        = "NEXT_PUBLIC_FRONTEND_URL"
  value      = var.frontend_url
  target     = ["production"]
}
