##############################################################################
# ec2_docker.tf — Servidor Docker (Substituindo o EKS)
##############################################################################

# AMI do Ubuntu 24.04 LTS mais recente na região us-east-1
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Instância EC2 (Docker Host) ──────────────────────────────────────────────
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public[0].id

  vpc_security_group_ids = [
    aws_security_group.ec2_docker.id
  ]

  # IAM Instance Profile para que o EC2 possa puxar imagens do ECR e ler Secrets
  iam_instance_profile = aws_iam_instance_profile.ec2_docker.name

  # Instalar Docker + Docker Compose no startup
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y ca-certificates curl gnupg unzip
              install -m 0755 -d /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
              chmod a+r /etc/apt/keyrings/docker.asc

              echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
                $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
                tee /etc/apt/sources.list.d/docker.list > /dev/null
              
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin awscli jq

              systemctl enable docker
              systemctl start docker

              # Fazer login no ECR antecipadamente (opcional, pode ser feito dps)
              usermod -aG docker ubuntu
              EOF

  tags = {
    Name = "orbe-docker-host"
  }
}

# ── Elastic IP ───────────────────────────────────────────────────────────────
# O Elastic IP garante que o IP não mude se o servidor for desligado.
resource "aws_eip" "app_server_ip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  tags = {
    Name = "orbe-docker-eip"
  }
}

# ── Outputs ──────────────────────────────────────────────────────────────────
output "app_server_public_ip" {
  description = "IP Público Reservado da máquina (Para ligar no domínio web)"
  value       = aws_eip.app_server_ip.public_ip
}
