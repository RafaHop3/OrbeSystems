# Diretrizes de Infraestrutura AWS (Custo Zero)

Este documento sumariza as boas práticas e decisões arquiteturais tomadas para garantir que a infraestrutura da Orbe Systems rode **estritamente dentro da AWS Free Tier ($0 de custo fixo mensal)**.

## 🚫 Serviços Proibidos (Alto Custo)
Para mantermos o orçamento zerado, a hospedagem de componentes gerenciados "Enterprise" não é permitida sem liberação expressa:
- **Amazon EKS (Kubernetes)**: Taxa fixa de $73/mês por cluster, sem free tier.
- **NAT Gateways**: ~ $32/mês por Availability Zone.
- **RDS Aurora / RDS Multi-AZ**: Aurora não possui free tier.
- **ElastiCache (Redis)**: Sem tier gratuito permanente.
- **VPC Interface Endpoints**: ~$7.30/mês cada + custo de tráfego.
- **AWS Secrets Manager**: $0.40/mês por secret isolado.

## ✅ Serviços Aprovados (Free Tier Compatíveis)
- **Compute**: Máquinas `t2.micro` ou `t3.micro` EC2. Toda a aplicação (API, Bancos PostgreSQL, Redis) deve ser conteinerizada via **Docker Compose** e orquestrada diretamente neste *single-node*.
- **Networking**: VPC básica com Sub-redes exclusivas **Públicas** e Internet Gateway. Sem redes privadas complexas para evitar NAT. Gateway Endpoints para S3 e DynamoDB são recomendados pois são 100% gratuitos.
- **NoSQL**: **DynamoDB** (Até 25GB de armazenamento grátis vitalício).
- **Security**: **AWS próprias Managed Keys (KMS)** padrão.
- **Containers Registry**: **Amazon ECR** (Banda gratúita e limite de size inclusos no Free Tier ou via Public Registry se viável).

## Práticas de Segurança no Paradigma `$0`
- O banco de dados fica na mesma instância EC2 que a API e deve aceitar conexão **apenas do localhost (127.0.0.1) ou das redes internas do Docker (`orbe-network`)**. A porta 5432 **não** deve ser exposta globalmente no EC2 Security Group.
- As variáveis e segredos (`.env`) que antes ficavam no Secrets Manager agora devem ser mantidos e injetados de forma segura na EC2 via SSH / AWS SSM (Systems Manager Session Manager).

---
> *Nota: Quando o volume de tráfego justificar a saída do plano gratuito, os serviços nativos poderão ser reintroduzidos incrementalmente começando pelo banco de dados (RDS).*
