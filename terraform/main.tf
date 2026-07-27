##############################################################################
# main.tf — Orbe Systems Infrastructure
# Stack: Vercel (frontend) + AWS Lambda (FastAPI backend) + API Gateway HTTP
##############################################################################

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.14"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Uncomment to store state in S3 (recommended for team use)
  # backend "s3" {
  #   bucket = "orbe-systems-tfstate"
  #   key    = "orbe-systems/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "orbe-systems"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id # optional — leave empty if no team
}
