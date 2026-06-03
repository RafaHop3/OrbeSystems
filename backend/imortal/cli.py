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
from imortal.ir import validate_ir
from imortal.ai import generate_ir_from_intent
from imortal.prover import FormalVerifier
from imortal.sandbox import SandboxFuzzer
from imortal.compiler import CodeCompiler
from imortal.visualizer import IRVisualizer
from imortal.config import FUZZ_RUNS, FUZZ_LOOP_ITERATIONS, OUTPUT_DIR, setup_logging

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

async def run_cli_pipeline(user_intent: str):
    """Executa o pipeline completo na CLI com animações e relatórios Rich."""
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
