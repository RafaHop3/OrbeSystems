##############################################################################
# dynamodb.tf — Tabela de Histórico de Conversas da IA
##############################################################################

resource "aws_dynamodb_table" "ai_conversations" {
  name         = "orbe_ai_conversations"
  billing_mode = "PAY_PER_REQUEST" # On-demand — sem capacity planning
  hash_key     = "UserID"
  range_key    = "Timestamp"

  # ── Chaves ────────────────────────────────────────────────────────────────
  attribute {
    name = "UserID"
    type = "S" # String — isolamento físico por usuário
  }

  attribute {
    name = "Timestamp"
    type = "S" # ISO8601 — para ordenação cronológica e range queries
  }

  # ── TTL — Expiração automática em 90 dias (sem custo operacional) ─────────
  # O atributo `expires_at` é um Unix timestamp (epoch seconds).
  # O Python deve computar: int(time.time()) + (90 * 24 * 3600)
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # ── GSI — Para queries por data (ex.: auditoria por range de tempo) ───────
  global_secondary_index {
    name            = "TimestampIndex"
    hash_key        = "Timestamp"
    range_key       = "UserID"
    projection_type = "ALL"
  }

  # ── Criptografia em repouso com chaves mantidas pela AWS ────────────────
  server_side_encryption {
    enabled = true
  }

  # ── Point-In-Time Recovery (PITR) ─────────────────────────────────────────
  point_in_time_recovery {
    enabled = true
  }

  # ── Atributos extras (não precisam ser declarados aqui no Terraform) ──────
  # Serão escritos diretamente pelo serviço Python:
  #   - ip_address   (String) — IP do cliente (X-Forwarded-For)
  #   - prompt       (String) — Pergunta do usuário
  #   - ai_response  (String) — Resposta gerada pela IA
  #   - model        (String) — Modelo utilizado (ex.: gemini-2.0-flash)
  #   - expires_at   (Number) — Unix timestamp para TTL

  tags = {
    Name      = "orbe-ai-conversations"
    Component = "ai"
    LGPD      = "true" # Dados pessoais sujeitos à LGPD
  }
}

# ── CloudWatch Alarms para DynamoDB ─────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttle" {
  alarm_name          = "orbe-dynamodb-throttled-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "DynamoDB throttling detectado — pode indicar burst de tráfego"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.ai_conversations.name
  }

  tags = { Name = "orbe-dynamodb-throttle-alarm" }
}

# ── Outputs ──────────────────────────────────────────────────────────────────
output "dynamodb_table_name" {
  description = "Nome da tabela DynamoDB de conversas da IA"
  value       = aws_dynamodb_table.ai_conversations.name
}

output "dynamodb_table_arn" {
  description = "ARN da tabela DynamoDB"
  value       = aws_dynamodb_table.ai_conversations.arn
}
