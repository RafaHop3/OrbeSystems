##############################################################################
# ecr.tf — Amazon ECR com Scan on Push e lifecycle policy
##############################################################################

resource "aws_ecr_repository" "api" {
  name                 = "orbe-systems-api"
  image_tag_mutability = "MUTABLE"

  # Scan automático de vulnerabilidades em cada push
  image_scanning_configuration {
    scan_on_push = true
  }

  # Criptografia com chave gerenciada pela AWS
  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Name = "orbe-systems-api" }
}

# Lifecycle policy — manter apenas as 10 imagens tagged mais recentes
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}

# ECR Repository Policy — apenas o cluster EKS pode fazer pull
resource "aws_ecr_repository_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEKSNodeGroupPull"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ec2_docker.arn
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker push"
  value       = aws_ecr_repository.api.repository_url
}
