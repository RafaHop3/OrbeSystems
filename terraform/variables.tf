##############################################################################
# variables.tf — Orbe Systems Free Tier Stack
##############################################################################

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region principal"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block da VPC principal"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Domínio principal da aplicação"
  type        = string
  default     = "orbesystems.com.br"
}

variable "frontend_url" {
  description = "URL de produção do frontend"
  type        = string
  default     = "https://orbesystems.com.br"
}
