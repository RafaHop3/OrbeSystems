import json
import logging
import asyncio
import urllib.request
import re
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from security.auth import require_premium
from models.users import User
from config import settings

router = APIRouter(prefix="/powershell-bot", tags=["PowerShell Bot"])
logger = logging.getLogger(__name__)

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class PowerShellChatRequest(BaseModel):
    prompt: str

class ScriptAnalysisRequest(BaseModel):
    script_content: str

# ── Prompts do Sistema ────────────────────────────────────────────────────────
POWERSHELL_SYSTEM_PROMPT = """Você é o OrbePSShield, um assistente especialista e amigável em PowerShell, Administração de Sistemas Windows e Segurança (SecDevOps) da Orbe Systems.
Sua missão é ajudar o usuário a criar comandos e scripts PowerShell altamente seguros, robustos e eficientes.
Você DEVE SEMPRE priorizar a segurança operacional:
1. Detectar e alertar se a intenção do usuário envolve comandos perigosos (ex: exclusão recursiva forçada, desabilitação de firewall, bypass de políticas de execução global, leitura/escrita de senhas em texto plano, execução remota insegura como Invoke-Expression / iex, desativação de antivírus/Windows Defender).
2. Se houver algum risco, explique de forma amigável o perigo e ofereça uma versão segura ou mitigada (ex: sugerir -WhatIf, -Confirm, ou uso de credenciais seguras com Get-Credential / Export-Clixml).
3. Gerar a resposta estritamente formatada em JSON com as chaves correspondentes abaixo. Não use markdown, code fences ou texto fora do JSON.

Retorne APENAS um objeto JSON válido com a seguinte estrutura:
{
  "is_safe": <boolean>,
  "risk_score": <integer 0-100, onde 100 é extremamente perigoso>,
  "explanation": "<explicação amigável e educativa sobre o comando/script e como funciona, em português>",
  "warnings": ["<aviso de segurança 1>", "<aviso de segurança 2>"],
  "secured_command": "<o comando ou linha de comando PowerShell segura consolidada>",
  "safe_prompt_templates": [
    {"title": "<título do template de prompt>", "prompt": "<instruções prontas para uso seguro>"}
  ],
  "scripts": {
    "ps1": "<script PowerShell (.ps1) completo com blocos try/catch, tratamento de erros, parâmetros formais, comentários explicativos e logging apropriado>",
    "bat": "<wrapper em lote (.bat) para execução segura no Windows (ex: powershell -NoProfile -ExecutionPolicy Bypass -File ...)>",
    "sh": "<equivalente ou script bash auxiliar (.sh) para ambientes híbridos se aplicável, ou script de automação CLI>",
    "json": "<arquivo de configuração de entrada ou metadados (.json) para o script>",
    "yml": "<arquivo YAML (.yml) para pipeline CI/CD (GitHub Actions) ou Ansible se aplicável>",
    "md": "<manual de instruções (.md) explicando como executar com segurança, pré-requisitos e parâmetros>"
  }
}
Lembre-se:
- Seja extremamente amigável, instrutivo e profissional no tom.
- O script .ps1 gerado deve ser "de produção", robusto, incluindo 'Write-Output', tratamento de exceções (try/catch) e validação de parâmetros.
- Responda apenas em português do Brasil.
- Garanta que todo o JSON seja perfeitamente escapado e válido.
"""

# ── Mock Database de Respostas para Execução Offline/Fallback ──────────────────
def generate_mock_powershell_response(prompt: str) -> Dict[str, Any]:
    p = prompt.lower()
    
    # 1. Caso Inseguro: Bypass de Execution Policy ou Execução de Script Remoto (iex)
    if any(x in p for x in ["bypass", "iex", "invoke-expression", "remote script", "baixar e rodar", "desativar firewall", "disable-netfirewall"]):
        return {
            "is_safe": False,
            "risk_score": 95,
            "explanation": "Detectamos uma tentativa de execução de comando ou alteração de política potencialmente perigosa. Desabilitar o firewall (Disable-NetFirewall) ou executar scripts diretamente da internet usando Invoke-Expression (iex) expõe o sistema a ataques de execução remota de código (RCE). A alteração irrestrita da Execution Policy para Bypass também remove camadas cruciais de segurança locais.",
            "warnings": [
                "O comando original tenta contornar políticas de segurança locais.",
                "Executar scripts baixados diretamente da internet (IEX) sem auditoria prévia é uma prática insegura.",
                "Desativar defesas ativas (firewall/antivírus) aumenta a superfície de ataque do host."
            ],
            "secured_command": "powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\\Verify-ScriptBeforeExecution.ps1",
            "safe_prompt_templates": [
                {"title": "Executar Script Baixado com Segurança", "prompt": "Como baixar um script PowerShell em arquivo temporário, auditar suas linhas por comandos perigosos e executá-lo apenas após validação de hash SHA256?"}
            ],
            "scripts": {
                "ps1": """# Verify-ScriptBeforeExecution.ps1
# Script para baixar e auditar scripts remotos antes da execução
[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$Uri,
    [Parameter(Mandatory=$false)]
    [string]$ExpectedHash
)

try {
    $tempFile = [System.IO.Path]::GetTempFileName() + ".ps1"
    Write-Output "[*] Baixando arquivo para inspeção: $tempFile"
    Invoke-WebRequest -Uri $Uri -OutFile $tempFile -UseBasicParsing -ErrorAction Stop

    # Calcular Hash se especificado
    if ($ExpectedHash) {
        $hash = Get-FileHash -Path $tempFile -Algorithm SHA256
        if ($hash.Hash -ne $ExpectedHash) {
            throw "O hash do arquivo ($($hash.Hash)) nao coincide com o esperado ($ExpectedHash)."
        }
        Write-Output "[+] Hash SHA256 validado com sucesso."
    }

    # Analise estatica simples
    $dangerousCmdlets = @("Invoke-Expression", "iex", "Disable-NetFirewall", "Set-MpPreference")
    $content = Get-Content -Path $tempFile -Raw
    foreach ($cmdlet in $dangerousCmdlets) {
        if ($content -match $cmdlet) {
            throw "ALERTA DE SEGURANÇA: O script contem o cmdlet perigoso '$cmdlet'. Execucao abortada."
        }
    }

    Write-Output "[+] Script auditado e limpo. Executando..."
    & $tempFile
}
catch {
    Write-Error "Erro na execucao segura: $_"
}
finally {
    if (Test-Path $tempFile) {
        Remove-Item -Path $tempFile -Force
        Write-Output "[*] Arquivo temporario removido."
    }
}""",
                "bat": "@echo off\nrem Wrapper para rodar o auditor de script\npowershell -NoProfile -ExecutionPolicy RemoteSigned -File \"%~dp0Verify-ScriptBeforeExecution.ps1\" -Uri \"https://exemplo.com/script.ps1\"",
                "sh": "#!/bin/bash\necho \"PowerShell Core Unix Wrapper\"\npwsh -NoProfile -ExecutionPolicy RemoteSigned -File \"./Verify-ScriptBeforeExecution.ps1\" -Uri \"https://exemplo.com/script.ps1\"",
                "json": "{\n  \"description\": \"Configuração para execução segura de script remoto\",\n  \"audit_level\": \"strict\"\n}",
                "yml": "name: Guarded PS execution\non: [workflow_dispatch]\njobs:\n  run-script:\n    runs-on: windows-latest\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v3\n      - name: Run Safe PS\n        shell: powershell\n        run: |\n          ./Verify-ScriptBeforeExecution.ps1 -Uri 'https://exemplo.com/script.ps1'",
                "md": "# Auditor de Scripts Remotos\n\n### Pré-requisitos\nPowerShell 5.1 ou superior.\n\n### Como rodar\n```cmd\npush_fixes.bat\n```\nOu diretamente no PowerShell:\n```powershell\n.\\Verify-ScriptBeforeExecution.ps1 -Uri 'https://url' -ExpectedHash 'SHA256'\n```"
            }
        }
        
    # 2. Caso de Backup / Cópia
    if any(x in p for x in ["backup", "copiar", "salvar", "zip", "compactar"]):
        return {
            "is_safe": True,
            "risk_score": 15,
            "explanation": "A criação de rotinas de backup é uma excelente prática de resiliência e recuperação de desastres. Para torná-la segura, estruturamos o script com validação de caminhos para evitar escrita fora de áreas permitidas, tratamento de erros via try-catch para capturar falhas de I/O, e registro de logs da operação.",
            "warnings": [
                "Certifique-se de que o usuário executor tem permissões NTFS restritas de leitura na origem e escrita no destino.",
                "Não salve backups em partições de sistema operacional sem monitoramento de espaço em disco."
            ],
            "secured_command": "powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\\Secure-Backup.ps1 -SourcePath 'D:\\Dados' -DestinationPath 'E:\\Backups'",
            "safe_prompt_templates": [
                {"title": "Rotativo de Backups Semanais", "prompt": "Como configurar um script PowerShell de backup incremental rotativo de 7 dias com expiração automática de arquivos antigos?"}
            ],
            "scripts": {
                "ps1": """# Secure-Backup.ps1
# Script de Backup Seguro com tratamento de logs e integridade
[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,
    [Parameter(Mandatory=$true)]
    [string]$DestinationPath
)

$logFile = Join-Path $DestinationPath "backup_log.txt"

function Write-Log([string]$message) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $logLine = "[$timestamp] $message"
    Write-Output $logLine
    $logLine | Out-File -FilePath $logFile -Append -Encoding utf8
}

try {
    # Validar caminhos
    if (-not (Test-Path $SourcePath)) {
        throw "Diretorio de origem nao encontrado: $SourcePath"
    }

    if (-not (Test-Path $DestinationPath)) {
        Write-Output "[*] Criando diretorio de destino..."
        New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    }

    Write-Log "Iniciando backup de $SourcePath para $DestinationPath..."
    
    # Criar nome de arquivo único temporal
    $dateStr = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $zipName = "Backup_$dateStr.zip"
    $targetZip = Join-Path $DestinationPath $zipName

    # Executar compactação segura
    Compress-Archive -Path $SourcePath -DestinationPath $targetZip -Force -ErrorAction Stop
    
    # Validar integridade
    if (Test-Path $targetZip) {
        $fileSize = (Get-Item $targetZip).Length
        Write-Log "Backup concluido com sucesso! Arquivo gerado: $zipName ($fileSize bytes)"
    } else {
        throw "Arquivo de backup nao foi localizado apos compactacao."
    }
}
catch {
    $err = $_.Exception.Message
    Write-Log "ERRO CRITICO DURANTE O BACKUP: $err"
    throw $_
}""",
                "bat": "@echo off\nrem Wrapper para agendamento de tarefas no Windows Task Scheduler\npowershell -NoProfile -ExecutionPolicy RemoteSigned -File \"%~dp0Secure-Backup.ps1\" -SourcePath \"D:\\Dados\" -DestinationPath \"E:\\Backups\"",
                "sh": "#!/bin/bash\n# Wrapper para sistemas Unix rodando pwsh\npwsh -NoProfile -ExecutionPolicy RemoteSigned -File \"./Secure-Backup.ps1\" -SourcePath \"/var/data\" -DestinationPath \"/mnt/backup\"",
                "json": "{\n  \"source\": \"D:\\\\Dados\",\n  \"destination\": \"E:\\\\Backups\",\n  \"retention_days\": 14\n}",
                "yml": "name: Nightly Backup Sync\non:\n  schedule:\n    - cron: '0 2 * * *'\njobs:\n  backup:\n    runs-on: windows-latest\n    steps:\n      - name: Run Backup Script\n        run: |\n          .\\Secure-Backup.ps1 -SourcePath 'C:\\workspace' -DestinationPath 'D:\\backups'",
                "md": "# Utilitário de Backup Seguro\n\n### Execução Manual\n```powershell\n.\\Secure-Backup.ps1 -SourcePath 'C:\\Origem' -DestinationPath 'D:\\Destino'\n```\n\n### Monitoramento\nTodos os logs são salvos em `backup_log.txt` na pasta de destino."
            }
        }
        
    # 3. Caso Padrão
    return {
        "is_safe": True,
        "risk_score": 10,
        "explanation": "Este é um utilitário amigável para geração de comandos PowerShell. O script proposto utiliza parâmetros formais fortemente tipados e tratamento estruturado de erros com Try-Catch, garantindo que qualquer falha operacional seja capturada sem derrubar o processo de execução.",
        "warnings": [
            "Lembre-se sempre de testar scripts em ambiente de homologação (Sandbox) antes de executá-los em servidores de produção.",
            "Evite rodar scripts com privilégios de Administrador global (Administrator/SYSTEM) a menos que estritamente necessário."
        ],
        "secured_command": "powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\\Get-SystemInfoSecure.ps1",
        "safe_prompt_templates": [
            {"title": "Coleta de Logs de Erro do Event Viewer", "prompt": "Como extrair com segurança os últimos 50 eventos críticos de sistema do Event Viewer filtrando apenas erros de hardware?"}
        ],
        "scripts": {
            "ps1": """# Get-SystemInfoSecure.ps1
# Script amigável para coletar informações básicas de telemetria do sistema
[CmdletBinding()]
param()

try {
    Write-Output "[*] Coletando informacoes de hardware e rede..."
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
    $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction Stop
    
    $report = [PSCustomObject]@{
        OSName       = $os.Caption
        Version      = $os.Version
        Manufacturer = $cs.Manufacturer
        Model        = $cs.Model
        MemoryGB     = [Math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
        LogicalDisks = $disks | ForEach-Object { "$($_.DeviceID) Free: $([Math]::Round($_.FreeSpace / 1GB, 2))GB" }
    }
    
    $report | Format-List
}
catch {
    Write-Error "Falha ao coletar dados do sistema: $_"
}""",
            "bat": "@echo off\npowershell -NoProfile -ExecutionPolicy Bypass -File \"%~dp0Get-SystemInfoSecure.ps1\"",
            "sh": "#!/bin/bash\npwsh -NoProfile -ExecutionPolicy Bypass -File \"./Get-SystemInfoSecure.ps1\"",
            "json": "{\n  \"collect_network\": true,\n  \"collect_hardware\": true\n}",
            "yml": "name: Verify Host Health\non: [workflow_dispatch]\njobs:\n  health:\n    runs-on: windows-latest\n    steps:\n      - name: System Report\n        run: |\n          .\\Get-SystemInfoSecure.ps1",
            "md": "# Coleta de Informações do Sistema\n\nExecuta `Get-CimInstance` de forma passiva, sem alterar estados de registros do Windows."
        }
    }

# ── API Endpoint: Chat ────────────────────────────────────────────────────────
@router.post("/chat")
async def chat_powershell_bot(data: PowerShellChatRequest, current_user: User = Depends(require_premium)):
    """
    Endpoint de chat inteligente e amigável para PowerShell.
    Analisa a segurança do comando solicitado, explica perigos e gera múltiplos formatos de arquivos.
    """
    prompt = data.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="O prompt de comando não pode ser vazio.")
        
    # Chamada Inteligente com Gemini / Ollama (Self-hosted)
    # Caso as credenciais da API estejam configuradas, tenta chamar o Gemini (Cloud).
    # Caso contrário, tenta chamar o Ollama local (Self-hosted).
    # Caso ambos falhem ou estejam inacessíveis, utiliza o mock generator offline local.
    from imortal.config import GEMINI_API_KEY, GEMINI_MODEL, PRODUCTION_MODE
    
    # 1. Tenta Gemini (Cloud API)
    if (PRODUCTION_MODE and GEMINI_API_KEY) or settings.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            body = {
                "system_instruction": {"parts": [{"text": POWERSHELL_SYSTEM_PROMPT}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.15,
                    "maxOutputTokens": 4000,
                    "responseMimeType": "application/json"
                },
            }
            data_bytes = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"}, method="POST")
            
            def perform_request():
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return resp.read().decode("utf-8")
                    
            res_str = await asyncio.to_thread(perform_request)
            res_json = json.loads(res_str)
            text_response = res_json["candidates"][0]["content"]["parts"][0]["text"]
            
            # Limpar markdown fences se o modelo ignorou a instrução mimeType
            text_response = text_response.strip()
            if text_response.startswith("```"):
                lines = text_response.split("\n")
                lines = lines[1:] if lines[0].startswith("```") else lines
                lines = lines[:-1] if lines and lines[-1].startswith("```") else lines
                text_response = "\n".join(lines).strip()
                
            return json.loads(text_response)
        except Exception as e:
            logger.error(f"[PowerShell Bot] Falha ao comunicar com Gemini Cloud: {e}. Executando fallback para IA local (Ollama)...")
            
    # 2. Tenta Ollama (Local / Self-hosted) com cascata de modelos para hardware de baixo custo
    try:
        from imortal.config import OLLAMA_HIGH_LEVEL_MODEL
        
        # Lista ordenada de modelos a tentar (do mais completo ao mais leve)
        models_cascade = [OLLAMA_HIGH_LEVEL_MODEL, "qwen2.5-coder:1.5b", "deepseek-coder:1.3b"]
        unique_models = []
        for m in models_cascade:
            if m and m not in unique_models:
                unique_models.append(m)
                
        ollama_res = None
        for model_name in unique_models:
            try:
                logger.info(f"[PowerShell Bot] Tentando gerar scripts usando o modelo local: {model_name}")
                from imortal.ai import call_ollama_json
                
                ollama_res = await call_ollama_json(
                    system_instruction=POWERSHELL_SYSTEM_PROMPT,
                    user_prompt=prompt,
                    model_name=model_name
                )
                if isinstance(ollama_res, dict) and "scripts" in ollama_res:
                    logger.info(f"[PowerShell Bot] Sucesso na geracao local com o modelo: {model_name}")
                    return ollama_res
            except Exception as model_err:
                logger.warning(f"[PowerShell Bot] Modelo local {model_name} falhou ou nao esta disponivel: {model_err}")
                continue
                
    except Exception as ollama_err:
        logger.error(f"[PowerShell Bot] Falha geral no gerenciamento do Ollama Local: {ollama_err}")
            
    # 3. Fallback para o Mock Generator
    return generate_mock_powershell_response(prompt)

# ── API Endpoint: Analisador Estático de Scripts (.ps1) ──────────────────────
@router.post("/analyze-script")
async def analyze_powershell_script(data: ScriptAnalysisRequest, current_user: User = Depends(require_premium)):
    """
    Análise estática (Static Application Security Testing - SAST) para scripts PowerShell.
    Varre o script por políticas fracas, comandos perigosos e más práticas comuns.
    """
    content = data.script_content
    findings = []
    score = 100
    
    # 1. Checar por Invoke-Expression / iex
    if re.search(r"\b(iex|invoke-expression)\b", content, re.IGNORECASE):
        findings.append({
            "severity": "CRITICAL",
            "rule": "Avoid-InvokeExpression",
            "description": "Uso de 'Invoke-Expression' ou seu alias 'iex' detectado. Isso permite execução de código arbitrário e facilita injeção de scripts (RCE). Use cmdlets nativos ou operadores de chamada (&) específicos.",
            "line": "Detectado no corpo do script"
        })
        score -= 40
        
    # 2. Checar por Set-ExecutionPolicy Bypass
    if re.search(r"executionpolicy\s+bypass", content, re.IGNORECASE):
        findings.append({
            "severity": "HIGH",
            "rule": "ExecutionPolicy-Bypass-Override",
            "description": "Script configura a Execution Policy global do host para 'Bypass'. Isso anula as travas padrão do sistema contra scripts maliciosos não assinados.",
            "line": "Detectado no script"
        })
        score -= 25

    # 3. Checar por desativação do firewall / antivírus
    if re.search(r"\b(disable-netfirewall|set-mppreference|disable-realtime-monitoring)\b", content, re.IGNORECASE):
        findings.append({
            "severity": "CRITICAL",
            "rule": "Disable-Defenses",
            "description": "Comando para desativar o Windows Firewall ou o Microsoft Defender Antivírus detectado. Isso diminui drasticamente a segurança do servidor ou da estação.",
            "line": "Comandos de desligamento de defesas ativos"
        })
        score -= 35

    # 4. Checar por credenciais ou senhas gravadas em texto limpo
    pwd_pattern = r"(password|senha|secret|cred|client_secret)\s*=\s*['\"][^'\"]+['\"]"
    if re.search(pwd_pattern, content, re.IGNORECASE):
        findings.append({
            "severity": "HIGH",
            "rule": "Hardcoded-Credentials",
            "description": "Possível senha ou segredo em texto limpo atribuído diretamente a uma variável. Recomenda-se utilizar credenciais seguras do Windows (PSCredential) ou cofre de chaves (SecretManagement).",
            "line": "Atribuição literal de credencial detectada"
        })
        score -= 20

    # 5. Conexões http sem criptografia (inseguras)
    if re.search(r"['\"]http://[a-zA-Z0-9\-\.]+", content, re.IGNORECASE):
        findings.append({
            "severity": "MEDIUM",
            "rule": "Insecure-HTTP-Protocol",
            "description": "Conexão de rede ou download HTTP (sem criptografia TLS) detectada. Use HTTPS para evitar interceptação (Man-in-the-Middle).",
            "line": "URL http:// encontrada"
        })
        score -= 10

    # 6. Uso forçado de remoção de itens
    if re.search(r"\bremove-item\b.*-force\b", content, re.IGNORECASE) and not re.search(r"-confirm\b|-whatif\b", content, re.IGNORECASE):
        findings.append({
            "severity": "LOW",
            "rule": "Forced-Delete-Without-Confirmation",
            "description": "Uso de 'Remove-Item' com '-Force' sem passar '-Confirm:$false' ou '-WhatIf' explicitamente. Pode resultar em exclusão acidental catastrófica se os caminhos de origem estiverem incorretos ou nulos.",
            "line": "Remoção forçada detectada"
        })
        score -= 5

    # Limitar o score mínimo
    score = max(0, score)
    
    # Determinar nível de risco geral
    if score >= 85:
        risk_level = "LOW"
    elif score >= 60:
        risk_level = "MEDIUM"
    elif score >= 35:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"
        
    return {
        "security_score": score,
        "risk_level": risk_level,
        "findings": findings,
        "is_safe": score >= 75
    }
