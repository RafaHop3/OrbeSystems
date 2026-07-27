##############################################################################
# outputs.tf — Useful values after `terraform apply`
##############################################################################

output "api_gateway_url" {
  description = "Public URL of the FastAPI backend (set this as NEXT_PUBLIC_API_URL in Vercel)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_name" {
  description = "Lambda function name (for manual invocations or CI/CD)"
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.api.arn
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for Lambda logs"
  value       = aws_cloudwatch_log_group.api.name
}
