##############################################################################
# main.tf — Orbe Systems Infrastructure (EC2 Docker $0 Cost Stack)
##############################################################################

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }

  backend "s3" {
    bucket         = "orbe-systems-tfstate"
    key            = "orbe-systems/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "orbe-systems-tf-locks"
    encrypt        = true
  }
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

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "orbe-systems"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
