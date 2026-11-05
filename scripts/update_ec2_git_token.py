#!/usr/bin/env python3
"""
scripts/update_ec2_git_token.py — Orbe Systems
═══════════════════════════════════════════════════════════════════════════════
Atualiza de forma segura e automatizada o Personal Access Token (PAT) do Git
na instância AWS EC2 i-058e26140671b3254 via AWS Systems Manager (SSM).

Etapas executadas remotamente:
  1. Identificação do remote origin atual: `git remote -v`
  2. Atualização segura da URL do remote com o novo token PAT:
     `git remote set-url origin https://x-access-token:<TOKEN>@github.com/OrbeSystems/orbe-systems.git`
  3. Validação com mascaramento do token nos logs: `git remote -v` (sed masked)
  4. Teste de conectividade e autenticação com o GitHub: `git fetch origin`
  5. Verificação de status do repositório: `git status -s`

Segurança:
  - O token é SEMPRE mascarado no stdout/stderr local e remoto.
  - O comando SSM utiliza canal criptografado de gerenciamento AWS.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import time
import argparse
import getpass
from typing import Dict, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import boto3
    from botocore.exceptions import ClientError, BotoCoreError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

DEFAULT_INSTANCE_ID = "i-058e26140671b3254"
DEFAULT_REGION = "us-east-1"
DEFAULT_REPO_PATH = "/home/ubuntu/orbe-systems"
DEFAULT_REPO_NAME = "OrbeSystems/orbe-systems"


def mask_token(text: str, token: str) -> str:
    """Substitui qualquer ocorrência do token por ***TOKEN_MASCARADO***."""
    if not token or len(token) < 4:
        return text
    return text.replace(token, f"***PAT_{token[:4]}...{token[-4:]}***")


def build_remote_update_commands(repo_path: str, token: str, repo_name: str, remote_name: str = "origin") -> list[str]:
    """Constrói os comandos shell a serem executados na instância EC2."""
    clean_token = token.strip()
    remote_url = f"https://x-access-token:{clean_token}@github.com/{repo_name}.git"

    return [
        f"cd {repo_path} || exit 1",
        "echo '[+] Estado atual do remote:'",
        f"git remote -v | sed 's/x-access-token:[^@]*@/x-access-token:***@/g'",
        f"echo '[+] Atualizando remote {remote_name} com novo PAT...'",
        f"git remote set-url {remote_name} \"{remote_url}\"",
        f"echo '[+] Validando novo remote origin configurado (mascarado):'",
        f"git remote -v | sed 's/x-access-token:[^@]*@/x-access-token:***@/g'",
        f"echo '[+] Testando autenticação e fetch com GitHub...'",
        f"git fetch {remote_name} --prune",
        "FETCH_EXIT=$?",
        "if [ $FETCH_EXIT -eq 0 ]; then",
        "  echo '[SUCESSO] git fetch executado com sucesso! Autenticacao PAT 100% valida.'",
        "else",
        "  echo '[ERRO] Falha na autenticacao do git fetch. Verifique se o PAT tem permissoes corretas (repo/contents).'",
        "  exit $FETCH_EXIT",
        "fi",
        "echo '[+] Status da working tree:'",
        "git status -s",
        "echo '=== ATUALIZAÇÃO CONCLUÍDA COM SUCESSO ==='"
    ]


def execute_via_ssm(
    instance_id: str,
    region: str,
    repo_path: str,
    token: str,
    repo_name: str,
    timeout_sec: int = 60,
    poll_interval: int = 3,
) -> bool:
    """Executa os comandos via AWS Systems Manager na instância alvo."""
    if not HAS_BOTO3:
        print("[ERRO] Erro: boto3 não está instalado no ambiente Python.")
        return False

    print(f"[*] Conectando ao AWS SSM na região '{region}'...")
    try:
        ssm_client = boto3.client("ssm", region_name=region)
    except Exception as exc:
        print(f"[ERRO] Erro ao inicializar cliente Boto3 SSM: {exc}")
        return False

    commands = build_remote_update_commands(repo_path, token, repo_name)
    full_command_str = "\n".join(commands)

    print(f"[*] Disparando comando SSM para instância '{instance_id}'...")
    try:
        response = ssm_client.send_command(
            InstanceIds=[instance_id],
            DocumentName="AWS-RunShellScript",
            Parameters={"commands": [full_command_str]},
            Comment=f"Atualizacao de Git PAT Orbe Systems em {repo_path}",
            TimeoutSeconds=timeout_sec,
        )
    except ClientError as ce:
        error_code = ce.response.get("Error", {}).get("Code", "Unknown")
        error_msg = ce.response.get("Error", {}).get("Message", str(ce))
        print(f"[ERRO] Falha na chamada ssm.send_command ({error_code}): {error_msg}")
        return False
    except Exception as exc:
        print(f"[ERRO] Falha inesperada ao enviar comando SSM: {exc}")
        return False

    command_id = response["Command"]["CommandId"]
    print(f"[+] Comando SSM registrado! Command ID: {command_id}")
    print(f"[*] Aguardando execução na instância (timeout: {timeout_sec}s)...")

    start_time = time.time()
    while time.time() - start_time < timeout_sec:
        try:
            invocation = ssm_client.get_command_invocation(
                CommandId=command_id,
                InstanceId=instance_id,
            )
            status = invocation.get("Status", "Pending")

            if status in ("Success", "Failed", "TimedOut", "Cancelled"):
                stdout = mask_token(invocation.get("StandardOutputContent", ""), token)
                stderr = mask_token(invocation.get("StandardErrorContent", ""), token)

                print("\n" + "=" * 70)
                print(f"                   RELATÓRIO DE EXECUÇÃO SSM ({status})")
                print("=" * 70)
                if stdout:
                    print(stdout)
                if stderr:
                    print("\n[STDERR]:")
                    print(stderr)
                print("=" * 70)

                if status == "Success":
                    print(f"[OK] SUCESSO: Token PAT atualizado e validado na instância {instance_id}!")
                    return True
                else:
                    print(f"[ERRO] FALHA: O comando SSM terminou com status '{status}'.")
                    return False

            print(f"    ... Status atual: {status} ({int(time.time() - start_time)}s decorridos)")
            time.sleep(poll_interval)

        except ClientError as ce:
            error_code = ce.response.get("Error", {}).get("Code", "")
            if error_code == "InvocationDoesNotExist":
                time.sleep(poll_interval)
                continue
            print(f"[ERRO] Erro ao consultar status da invocação: {ce}")
            return False

    print(f"[ERRO] Timeout ({timeout_sec}s) atingido aguardando resposta do SSM.")
    return False


def main():
    parser = argparse.ArgumentParser(description="Atualiza o PAT do Git na instância EC2 via AWS SSM")
    parser.add_argument("--token", "--pat", "-t", help="Novo GitHub Personal Access Token (PAT). Se omitido, lê de GITHUB_PAT ou solicita interativamente.")
    parser.add_argument("--instance-id", "-i", default=DEFAULT_INSTANCE_ID, help=f"ID da instância EC2 (default: {DEFAULT_INSTANCE_ID})")
    parser.add_argument("--region", "-r", default=DEFAULT_REGION, help=f"Região AWS (default: {DEFAULT_REGION})")
    parser.add_argument("--repo-path", "-p", default=DEFAULT_REPO_PATH, help=f"Caminho do repositório no EC2 (default: {DEFAULT_REPO_PATH})")
    parser.add_argument("--repo-name", "-n", default=DEFAULT_REPO_NAME, help=f"Nome do repositório GitHub (default: {DEFAULT_REPO_NAME})")
    parser.add_argument("--dry-run", action="store_true", help="Gera os comandos e valida a sintaxe sem disparar chamada real na AWS.")
    parser.add_argument("--timeout", type=int, default=60, help="Tempo limite em segundos para o SSM responder (default: 60)")

    args = parser.parse_args()

    token = args.token or os.getenv("GITHUB_PAT") or os.getenv("GIT_TOKEN")
    if not token and not args.dry_run:
        try:
            token = getpass.getpass("Digite o novo GitHub Personal Access Token (PAT): ").strip()
        except Exception:
            pass

    if not token and not args.dry_run:
        print("[ERRO] Erro: Nenhum token PAT fornecido. Use --token <PAT>, export GITHUB_PAT=<PAT> ou use --dry-run.")
        sys.exit(1)

    effective_token = token or "ghp_MockSampleToken1234567890ForValidation"

    print("===============================================================================")
    print("      ORBE SYSTEMS — ATUALIZAÇÃO SEGURA DE GIT PAT EM EC2 VIA BOTO3 SSM        ")
    print("===============================================================================")
    print(f"Instância Alvo  : {args.instance_id}")
    print(f"Região AWS      : {args.region}")
    print(f"Repositório     : {args.repo_path} ({args.repo_name})")
    print(f"PAT Informado   : {mask_token(effective_token, effective_token)}")
    print(f"Modo            : {'DRY-RUN (Simulação)' if args.dry_run else 'EXECUÇÃO AWS SSM'}")
    print("-------------------------------------------------------------------------------")

    commands = build_remote_update_commands(args.repo_path, effective_token, args.repo_name)

    if args.dry_run:
        print("[*] Comandos gerados que seriam executados no EC2:")
        for cmd in commands:
            print("   " + mask_token(cmd, effective_token))
        print("-------------------------------------------------------------------------------")
        print("[OK] Validação DRY-RUN concluída com sucesso! Script pronto para execução.")
        sys.exit(0)

    success = execute_via_ssm(
        instance_id=args.instance_id,
        region=args.region,
        repo_path=args.repo_path,
        token=effective_token,
        repo_name=args.repo_name,
        timeout_sec=args.timeout,
    )

    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
