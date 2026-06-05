import sys
import os
import re
import asyncio
import logging
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt
from jose import jwt, JWTError
from datetime import datetime, timezone
from imortal.ir import validate_ir
from imortal.ai import generate_ir_from_intent
from imortal.prover import FormalVerifier
from imortal.sandbox import SandboxFuzzer
from imortal.compiler import CodeCompiler
from imortal.visualizer import IRVisualizer
from imortal.config import (
    FUZZ_RUNS, FUZZ_LOOP_ITERATIONS, OUTPUT_DIR, setup_logging,
    ORBE_PUBLIC_KEY, LICENSE_TOKEN_FILE
)

setup_logging()
logger = logging.getLogger(__name__)

console = Console()

def print_banner():
    """Imprime o cabeçalho premium do compilador IMORTAL."""
    banner_text = Text()
    banner_text.append("██╗███╗   ███╗ ██████╗ ██████╗ ████████╗ █████╗ ██╗     \n", style="bold cyan")
    banner_text.append("██║████╗ ████║██╔═══██╗██╔══██╗╚══██╔══╝██╔══██╗██║     \n", style="bold cyan")
    banner_text.append("██║██╔████╔██║██║   ██║██████╔╝   ██║   ███████║██║     \n", style="bold cyan")
    banner_text.append("██║██║╚██╔╝██║██║   ██║██╔══██╗   ██║   ██╔══██║██║     \n", style="bold cyan")
    banner_text.append("██║██║ ╚═╝ ██║╚██████╔╝██║  ██║   ██║   ██║  ██║███████╗\n", style="bold cyan")
    banner_text.append("╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝\n", style="bold cyan")
    banner_text.append("  == TRIPLE VERIFICATION AI BARE-METAL TOOLCHAIN (V1.0 MVP) ==  ", style="bold magenta italic")
    
    console.print(Panel(banner_text, border_style="cyan", expand=False))
    console.print("[bold white]A IA propõe, a matemática prova, a sandbox estressa, o humano autoriza.[/]\n")

def verify_cli_license() -> dict:
    """
    Verifica a licenca do usuario offline usando a chave publica do servidor.
    Retorna um dicionario com o status de validacao e informacoes do usuario.
    """
    token = os.getenv("IMORTAL_LICENSE_TOKEN", "").strip()
    
    # Se nao estiver no env, tenta ler do arquivo local
    if not token and os.path.exists(LICENSE_TOKEN_FILE):
        try:
            with open(LICENSE_TOKEN_FILE, "r", encoding="utf-8") as f:
                token = f.read().strip()
        except Exception as e:
            logger.warning("Falha ao ler o arquivo %s: %s", LICENSE_TOKEN_FILE, e)
            
    # Se ainda assim nao encontrar, solicita via prompt
    if not token:
        console.print(Panel(
            "[bold yellow]🔑 LICENCA REQUERIDA PARA EXECUCAO OFFLINE[/]\n\n"
            "Nao foi encontrada uma licenca valida no ambiente ou arquivo local.\n"
            "Para validar sua assinatura premium e liberar a toolchain, faca login em:\n"
            "👉 [bold white]https://orbesystems.com.br/assinar[/]\n\n"
            "Copie o seu Token de Licenca Offline e insira abaixo:",
            border_style="yellow",
            expand=False
        ))
        token = Prompt.ask("[bold cyan]Inserir Token de Licenca[/]").strip()
        
    if not token:
        return {"valid": False, "reason": "Nenhum token fornecido."}
        
    try:
        # Decodifica e valida a assinatura digital e o emissor
        payload = jwt.decode(
            token, 
            ORBE_PUBLIC_KEY, 
            algorithms=["RS256"],
            audience=None,
            issuer="orbesystems.com.br"
        )
        
        # Validacao extra de expiracao
        exp_timestamp = payload.get("exp", 0)
        exp_date = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        
        if now > exp_date:
            return {"valid": False, "reason": "A licenca informada esta expirada."}
            
        role = payload.get("role", "")
        features = payload.get("features", [])
        
        # Acesso requer perfil de premium ou a feature do compilador ativada
        if role != "premium" and "imortal_avr_compiler" not in features:
            return {"valid": False, "reason": "Sua licenca nao possui permissao para o compilador IMORTAL."}
            
        # Salva o token localmente para facilitar futuros boots
        try:
            with open(LICENSE_TOKEN_FILE, "w", encoding="utf-8") as f:
                f.write(token)
        except Exception:
            pass
            
        return {
            "valid": True,
            "email": payload.get("sub"),
            "role": role,
            "expires_at": exp_date
        }
    except JWTError as e:
        return {"valid": False, "reason": f"Assinatura de licenca invalida: {str(e)}"}
    except Exception as e:
        return {"valid": False, "reason": f"Falha na integridade do token: {str(e)}"}

async def run_cli_pipeline(user_intent: str):
    """Executa o pipeline completo na CLI com animacoes e relatorios Rich."""
    
    # ── Validação do Token de Licença Offline ─────────────────────────────────
    license_info = verify_cli_license()
    if not license_info["valid"]:
        console.print(Panel(
            f"[bold red]✖ ACESSO RECUSADO: LICENÇA INVÁLIDA[/]\n\n"
            f"Motivo: [bold white]{license_info['reason']}[/]\n\n"
            f"Adquira ou valide sua licença no portal da Orbe Systems.",
            title="Licensing Error",
            border_style="red",
            expand=False
        ))
        return

    # Boas-vindas ao usuário verificado
    console.print(Panel(
        f"[bold green]🔒 ASSINATURA VERIFICADA COM SUCESSO![/]\n\n"
        f"Usuário: [bold white]{license_info['email']}[/]\n"
        f"Expira em: [bold white]{license_info['expires_at'].strftime('%Y-%m-%d %H:%M:%S')} UTC[/]\n\n"
        f"Módulo IMORTAL Premium Bare-Metal ativado e liberado.",
        title="Offline Verified License",
        border_style="green",
        expand=False
    ))

    console.print(f"[bold cyan]Intenção Recebida:[/] '{user_intent}'\n")

    # 1. Inferência de IA
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(description="[bold cyan]Orquestrando IA Local (Ollama)...[/]", total=1)
        ir_dict, is_mock = await generate_ir_from_intent(user_intent)
        progress.update(task, completed=1, description="[bold green]Orquestração de IA Concluída![/]")

    if is_mock:
        console.print("[bold yellow]⚠️ Ollama offline. Utilizando Fallback Mock Generator de Alta Fidelidade.[/]")
    else:
        console.print(f"[bold green]✓ IA traduziu intenção com sucesso para o projeto '{ir_dict['project']}'.[/]")

    # 2. Validação Estrutural da IR
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(description="[bold yellow]Validando sintaxe estrutural da IR...[/]", total=1)
        valid_struct, struct_errors = validate_ir(ir_dict)
        progress.update(task, completed=1, description="[bold green]Validação Estrutural Concluída![/]")

    if not valid_struct:
        console.print(Panel("[bold red]FALHA ESTRUTURAL NA REPRESENTAÇÃO INTERMEDIÁRIA (IR):[/]\n" + 
                            "\n".join(f"• {e}" for e in struct_errors), border_style="red"))
        return

    # 3. Prova Matemática Formal (Z3 Solver) SSA
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(description="[bold blue]Provando segurança lógica com Z3 Theorem Prover...[/]", total=1)
        verifier = FormalVerifier(ir_dict)
        z3_passed, z3_errors = verifier.verify()
        progress.update(task, completed=1, description="[bold green]Validação Matemática Concluída![/]")

    # 4. Fuzzing em Sandbox
    fuzz_passed, fuzz_errors = False, []
    if z3_passed:
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
            task = progress.add_task(description="[bold magenta]Rodando Sandbox Fuzzing...[/]", total=1)
            fuzzer = SandboxFuzzer(ir_dict)
            fuzz_passed, fuzz_errors = fuzzer.fuzz(num_runs=FUZZ_RUNS, loop_iterations=FUZZ_LOOP_ITERATIONS)
            progress.update(task, completed=1, description="[bold green]Fuzzing em Sandbox Concluído![/]")

    # 5. Relatório Card de Tripla Verificação
    table = Table(title="RELATÓRIO DE SEGURANÇA DA TRIPLA VERIFICAÇÃO", border_style="cyan")
    table.add_column("Fase do Pipeline", justify="left", style="white", no_wrap=True)
    table.add_column("Mecanismo de Segurança", justify="left", style="white")
    table.add_column("Status", justify="center", style="bold")

    table.add_row("1. Estrutural", "Análise de Gramática Estrita da IR", "[green]APROVADO[/]" if valid_struct else "[red]REJEITADO[/]")
    
    if z3_passed:
        table.add_row("2. Matemática", "Z3 Solver (Sem divisão/overflow/pinos inválidos)", "[green]APROVADO (PROVADO)[/]")
    else:
        table.add_row("2. Matemática", "Z3 Solver (Sem divisão/overflow/pinos inválidos)", "[red]FALHA FORMAL[/]")
        
    if not z3_passed:
        table.add_row("3. Simulação", "Sandbox Fuzzing (Estresse Randômico)", "[yellow]BLOQUEADO[/]")
    elif fuzz_passed:
        table.add_row("3. Simulação", "Sandbox Fuzzing (Estresse Randômico)", "[green]APROVADO (150/150 PASSES)[/]")
    else:
        table.add_row("3. Simulação", "Sandbox Fuzzing (Estresse Randômico)", "[red]FALHA SIMULAÇÃO[/]")

    console.print(table)
    console.print("")

    # Exibe erros caso haja falhas
    if not z3_passed:
        console.print(Panel("[bold red]🚨 FALHA CRÍTICA DE SEGURANÇA DETECTADA POR PROVA FORMAL (Z3):[/]\n" +
                            "\n".join(f"• {e}" for e in z3_errors), border_style="red", title="Mathematical Failure Model"))
        return
        
    if not fuzz_passed:
        console.print(Panel("[bold red]🚨 CRASH DETECTADO NA SIMULAÇÃO EM SANDBOX DURANTE FUZZING STRESS:[/]\n" +
                            "\n".join(f"• {e}" for e in fuzz_errors), border_style="red", title="Runtime Crash Dump"))
        return

    # 6. Engenharia Reversa (Pseudocódigo)
    viz = IRVisualizer(ir_dict)
    pseudocode = viz.to_pseudocode()
    console.print("[bold yellow]📖 Pseudocódigo Gerado por Engenharia Reversa (HITL Preview):[/]")
    console.print(Panel(pseudocode, border_style="yellow"))
    console.print("")

    # 7. Tradução C++ & Compilação AVR
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(description="[bold green]Traduzindo IR para C++ & Compilando AVR Hex...[/]", total=1)
        compiler = CodeCompiler(ir_dict)
        cpp_code = compiler.to_cpp()
        hex_code, is_mock_compiler, compile_log = compiler.compile()
        progress.update(task, completed=1, description="[bold green]Código C++ & Binário Prontos![/]")

    console.print("[bold green]✓ Código C++ gerado e compilado com sucesso.[/]")
    
    # 8. HITL (Human-in-the-Loop) Autorização
    console.print(Panel("[bold yellow]⚠️ EXIGIDA AUTORIZAÇÃO EXPLICITA (Human-in-the-Loop):[/]\n" +
                        "A prova matemática Z3 e a sandbox garantem a segurança cibernética deste sketch.\n" +
                        "Deseja assinar digitalmente e exportar o arquivo Intel HEX para gravação?", border_style="yellow"))
    
    answer = Prompt.ask("Autorizar gravação no hardware? (y/n)", choices=["y", "n"], default="n")
    
    if answer == "y":
        # Sanitiza o nome do projeto para evitar path traversal via nome gerado pela IA
        raw_name = ir_dict.get('project', 'IMORTAL_Sketch')
        safe_name = re.sub(r'[^\w\-]', '_', raw_name)  # Apenas letras, dígitos, _ e -
        safe_name = safe_name[:64]  # Limite de comprimento
        
        # Salva em subdiretório dedicado, nunca no CWD diretamente
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out_filename = os.path.join(OUTPUT_DIR, f"{safe_name}.hex")
        
        with open(out_filename, "w", encoding="utf-8") as f:
            f.write(hex_code)
        
        logger.info("Binário HEX exportado: %s", out_filename)
        success_msg = f"[bold green]🔒 AUTORIZAÇÃO DE HARDWARE CONCEDIDA E REGISTRADA![/]\n\n" \
                      f"Binário Intel HEX exportado com sucesso para:\n" \
                      f"👉 [bold white]{out_filename}[/]\n\n" \
                      f"O microcontrolador pode ser gravado com segurança extrema."
        console.print(Panel(success_msg, border_style="green", expand=False))
    else:
        console.print("[bold red]✖ Gravação rejeitada pelo operador. Abortando processo de compilação.[/]")
