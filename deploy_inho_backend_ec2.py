#!/usr/bin/env python3
"""
Deploy Script para INHO Backend em AWS EC2
Seguindo Manual de Arquitetura INHO - Gestão de Deploy EC2
"""

import boto3
import json
import time
import os
from typing import Dict, Any

# Configurações AWS
REGION = "us-east-1"
INSTANCE_ID = "i-058e26140671b3254"  # Instância do manual
SSM_DOCUMENT_NAME = "AWS-RunShellScript"

def create_deploy_command() -> str:
    """Cria o comando shell para deploy no EC2"""
    
    commands = [
        "# Navegar para diretório do projeto",
        "cd /home/ubuntu/orbe-systems",
        
        "# Pull das últimas alterações do GitHub",
        "git pull origin main",
        
        "# Navegar para backend INHO",
        "cd inho_backend",
        
        "# Parar container atual (se existir)",
        "docker stop inho-backend-green || true",
        
        "# Remover container antigo (se existir)",
        "docker rm inho-backend-green || true",
        
        "# Reconstruir imagem com código atualizado",
        "docker build -t inho-backend:latest .",
        
        "# Iniciar novo container com código atualizado",
        "docker run -d --name inho-backend-green \\",
        "  --restart unless-stopped \\",
        "  -p 8000:8000 \\",
        "  -v /home/ubuntu/orbe-systems/inho_backend:/app \\",
        "  --env-file /home/ubuntu/orbe-systems/inho_backend/.env \\",
        "  inho-backend:latest",
        
        "# Verificar status do novo container",
        "docker ps | grep inho-backend-green",
        
        "# Aguardar 5 segundos para inicialização",
        "sleep 5",
        
        "# Verificar logs do container",
        "docker logs inho-backend-green --tail 20"
    ]
    
    return "\n".join(commands)

def deploy_to_ec2() -> Dict[str, Any]:
    """Executa deploy via AWS Systems Manager (SSM)"""
    
    try:
        # Inicializar cliente SSM
        ssm_client = boto3.client('ssm', region_name=REGION)
        
        # Criar comando de deploy
        deploy_command = create_deploy_command()
        
        print("🚀 Iniciando deploy para EC2...")
        print(f"📦 Instância: {INSTANCE_ID}")
        print(f"🌍 Região: {REGION}")
        
        # Executar comando via SSM
        response = ssm_client.send_command(
            InstanceIds=[INSTANCE_ID],
            DocumentName=SSM_DOCUMENT_NAME,
            Parameters={
                'commands': [deploy_command]
            },
            TimeoutSeconds=300  # 5 minutos timeout
        )
        
        command_id = response['Command']['CommandId']
        print(f"✅ Comando enviado: {command_id}")
        
        # Aguardar execução do comando
        print("⏳ Aguardando execução do deploy...")
        time.sleep(10)
        
        # Verificar status do comando
        for attempt in range(30):  # 30 tentativas (5 minutos)
            try:
                result = ssm_client.get_command_invocation(
                    CommandId=command_id,
                    InstanceId=INSTANCE_ID
                )
                
                status = result['Status']
                print(f"📊 Status: {status}")
                
                if status == 'Success':
                    print("✅ Deploy concluído com sucesso!")
                    return {
                        'success': True,
                        'command_id': command_id,
                        'status': status,
                        'output': result.get('StandardOutputContent', '')
                    }
                elif status == 'Failed':
                    print("❌ Deploy falhou!")
                    return {
                        'success': False,
                        'command_id': command_id,
                        'status': status,
                        'error': result.get('StandardErrorContent', '')
                    }
                elif status in ['Pending', 'InProgress', 'Delayed']:
                    time.sleep(10)
                    continue
                else:
                    print(f"⚠️ Status inesperado: {status}")
                    return {
                        'success': False,
                        'command_id': command_id,
                        'status': status
                    }
                    
            except Exception as e:
                print(f"⚠️ Erro ao verificar status: {e}")
                time.sleep(10)
                continue
        
        # Timeout
        print("⏱️ Timeout aguardando deploy")
        return {
            'success': False,
            'command_id': command_id,
            'status': 'Timeout'
        }
        
    except Exception as e:
        print(f"❌ Erro no deploy: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def verify_backend_health() -> bool:
    """Verifica saúde do backend após deploy"""
    import requests
    
    try:
        # URL do backend em produção
        backend_url = "https://inho-api.orbesystems.com.br/health"
        
        print(f"🔍 Verificando saúde do backend: {backend_url}")
        response = requests.get(backend_url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Backend saudável!")
            return True
        else:
            print(f"⚠️ Backend retornou status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao verificar saúde: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 DEPLOY INHO BACKEND - AWS EC2")
    print("=" * 60)
    
    # Executar deploy
    result = deploy_to_ec2()
    
    if result.get('success'):
        print("\n" + "=" * 60)
        print("✅ DEPLOY CONCLUÍDO COM SUCESSO")
        print("=" * 60)
        
        # Verificar saúde após deploy
        time.sleep(30)  # Aguardar inicialização
        if verify_backend_health():
            print("🎉 Backend está operacional em produção!")
        else:
            print("⚠️ Backend pode não estar saudável - verifique logs")
    else:
        print("\n" + "=" * 60)
        print("❌ DEPLOY FALHOU")
        print("=" * 60)
        print(f"Erro: {result.get('error', 'Desconhecido')}")
        print(f"Status: {result.get('status', 'Desconhecido')}")
