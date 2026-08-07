##############################################################################
# iam.tf — IAM Roles para Amazon EC2 (Docker Host)
##############################################################################

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2_docker" {
  name               = "orbe-ec2-docker-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Permissão Base para SSM (Acesso via AWS Systems Manager)
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_docker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Permissão para ECR (Docker pull image)
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_docker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# DynamoDB para histórico de conversas da IA
data "aws_iam_policy_document" "dynamodb" {
  statement {
    sid    = "DynamoDBConversationHistory"
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:DeleteItem",
    ]
    resources = [
      aws_dynamodb_table.ai_conversations.arn,
      "${aws_dynamodb_table.ai_conversations.arn}/index/*",
    ]
  }
}

resource "aws_iam_policy" "dynamodb_policy" {
  name        = "orbe-ec2-dynamodb-policy"
  description = "Policy for DynamoDB from EC2"
  policy      = data.aws_iam_policy_document.dynamodb.json
}

resource "aws_iam_role_policy_attachment" "dynamodb_attach" {
  role       = aws_iam_role.ec2_docker.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

resource "aws_iam_instance_profile" "ec2_docker" {
  name = "orbe-ec2-docker-profile"
  role = aws_iam_role.ec2_docker.name
}
