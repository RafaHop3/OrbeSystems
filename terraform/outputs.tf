##############################################################################
# outputs.tf — Outputs consolidados de todos os módulos
##############################################################################

output "vpc_id" {
  description = "ID da VPC principal"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs das subnets públicas"
  value       = aws_subnet.public[*].id
}

output "docker_host_ip" {
  description = "IP Público Reservado da máquina (Para ligar no domínio web ou SSH)"
  value       = aws_eip.app_server_ip.public_ip
}

output "ecr_login_command" {
  description = "Comando para autenticar Docker no ECR localmente"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.api.repository_url}"
}

output "ec2_docker_role_arn" {
  description = "ARN do IAM role para o EC2 Docker"
  value       = aws_iam_role.ec2_docker.arn
}

output "deployment_summary" {
  description = "Resumo dos principais endpoints após apply"
  sensitive   = false
  value = {
    ec2_ip   = "IP da Máquina Prod: ${aws_eip.app_server_ip.public_ip}"
    dynamodb = "Disponível em dynamodb_table_name output"
    ecr      = "Disponível em ecr_repository_url output"
    next_steps = [
      "1. Configure Route 53 (se necessário): CNAME da API apontando pro IP acima",
      "2. Faça o Build da imagem Docker da nossa API, do DB e Redis local e suba via docker-compose",
      "3. Conecte SSH usando SSM: aws ssm start-session --target i-0XXXXXXX",
      "4. Dentro do EC2, dê `docker compose up -d` E voilá!",
    ]
  }
}
