##############################################################################
# lambda.tf — FastAPI backend on AWS Lambda + HTTP API Gateway
##############################################################################

# ── IAM Role for Lambda ───────────────────────────────────────────────────────

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "orbe-systems-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ── Lambda Package ────────────────────────────────────────────────────────────
# Before `terraform apply`, run:
#   cd backend && pip install -r requirements.txt -t package/ && zip -r ../terraform/lambda.zip . -x "*.pyc" -x "__pycache__/*" -x ".venv/*"

resource "aws_lambda_function" "api" {
  function_name    = "orbe-systems-api"
  filename         = "${path.module}/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda.zip")
  handler          = "main.handler" # Mangum entry point
  runtime          = "python3.12"
  role             = aws_iam_role.lambda_exec.arn
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      # Admin Auth
      ADMIN_USERNAME      = var.admin_username
      ADMIN_PASSWORD_HASH = var.admin_password_hash
      SECRET_KEY          = var.secret_key

      # Database
      DATABASE_URL = var.database_url

      # External services
      GITHUB_TOKEN            = var.github_token
      CLOUDINARY_URL          = var.cloudinary_url
      STRIPE_SECRET_KEY       = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET   = var.stripe_webhook_secret
      STRIPE_PREMIUM_PRICE_ID = var.stripe_premium_price_id
      GEMINI_API_KEY          = var.gemini_api_key
      SIEM_WEBHOOK_URL        = var.siem_webhook_url
      FRONTEND_URL            = var.frontend_url

      # Lambda specific
      ENVIRONMENT         = var.environment
      NUM_TRUSTED_PROXIES = "1"
      ACCESS_TOKEN_EXPIRE_MINUTES = "60"
      CLOUDINARY_CLOUD_NAME = "doxx9wyvw"
      ALLOWED_ORIGINS = "https://orbesystems.com.br,https://www.orbesystems.com.br,https://orbe-systems.vercel.app"
    }
  }
}

# ── CloudWatch Log Group ──────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 14
}

# ── HTTP API Gateway (v2) ─────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "api" {
  name          = "orbe-systems-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [
      "https://orbesystems.com.br",
      "https://www.orbesystems.com.br",
      "http://localhost:3000",
    ]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-CSRF-Token"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ── Lambda Permission for API Gateway ────────────────────────────────────────

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
