#!/usr/bin/env python3
"""
run_migration.py — Executor de migração no Supabase
═══════════════════════════════════════════════════════
Uso:
  python run_migration.py "postgresql://postgres:SENHA@db.PROJECT.supabase.co:5432/postgres"

O script lê o arquivo supabase_migration.sql na mesma pasta e executa
cada statement individualmente, exibindo o resultado com cores no terminal.

Requisitos:
  pip install psycopg2-binary  (ou psycopg2)
"""

import sys
import os
import re

# ── Verificar dependência ────────────────────────────────────────────────────
try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("\n❌  psycopg2 não encontrado. Instalando...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2
    print("✅  psycopg2-binary instalado.\n")

# ── Cores ANSI ────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def banner():
    print(f"""
{BOLD}{CYAN}╔══════════════════════════════════════════════════════╗
║     🚀  Orbe Systems — Supabase Migration Runner      ║
║         Imobverse MVP — Tabelas proptech               ║
╚══════════════════════════════════════════════════════╝{RESET}
""")

def parse_statements(sql_text: str) -> list[str]:
    """
    Divide o SQL em statements individuais por ';', ignorando
    comentários e linhas em branco.
    """
    # Remove comentários de linha única
    cleaned = re.sub(r"--[^\n]*", "", sql_text)
    # Divide por ';' e filtra vazios
    raw = cleaned.split(";")
    statements = []
    for stmt in raw:
        stripped = stmt.strip()
        if stripped:
            statements.append(stripped)
    return statements

def run_migration(db_url: str, sql_path: str):
    banner()

    # ── Valida o arquivo SQL ──────────────────────────────────────────────────
    if not os.path.isfile(sql_path):
        print(f"{RED}❌  Arquivo não encontrado: {sql_path}{RESET}")
        sys.exit(1)

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    statements = parse_statements(sql_content)
    total = len(statements)
    print(f"{CYAN}📄  Arquivo:{RESET} {sql_path}")
    print(f"{CYAN}📊  Statements encontrados:{RESET} {total}\n")

    # ── Conectar ao Supabase ──────────────────────────────────────────────────
    # Corrige o prefixo postgres:// → postgresql:// para psycopg2
    connect_url = db_url.replace("postgres://", "postgresql://", 1)

    # Para Supabase, força SSL
    if "sslmode" not in connect_url:
        sep = "&" if "?" in connect_url else "?"
        connect_url += f"{sep}sslmode=require"

    print(f"{CYAN}🔌  Conectando ao Supabase...{RESET}")
    try:
        conn = psycopg2.connect(connect_url)
        conn.autocommit = False
        cursor = conn.cursor()
        print(f"{GREEN}✅  Conexão estabelecida com sucesso.{RESET}\n")
    except Exception as e:
        print(f"{RED}❌  Falha na conexão: {e}{RESET}")
        print(f"\n{YELLOW}💡  Verifique se a URL está correta:")
        print(f"    postgresql://postgres:[SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres{RESET}")
        sys.exit(1)

    # ── Executar cada statement ───────────────────────────────────────────────
    success_count = 0
    error_count = 0

    for i, stmt in enumerate(statements, start=1):
        # Exibe as primeiras 80 chars do statement como preview
        preview = stmt.replace("\n", " ").strip()[:80]
        print(f"  [{i:02d}/{total:02d}] {YELLOW}{preview}...{RESET}")

        try:
            cursor.execute(stmt)
            conn.commit()
            success_count += 1
            print(f"          {GREEN}✓ OK{RESET}")
        except psycopg2.Error as e:
            conn.rollback()
            error_count += 1

            err_msg = str(e).strip()

            # Ignora erros de "já existe" (idempotência)
            ignorable = [
                "already exists",
                "duplicate key",
                "relation already exists",
                "index already exists",
                "column already exists",
            ]
            if any(kw in err_msg.lower() for kw in ignorable):
                print(f"          {YELLOW}⚠ Já existia (ignorado): {err_msg[:120]}{RESET}")
                error_count -= 1
                success_count += 1
            else:
                print(f"          {RED}✗ ERRO: {err_msg[:200]}{RESET}")

        print()

    # ── Resumo final ──────────────────────────────────────────────────────────
    cursor.close()
    conn.close()

    print(f"{BOLD}{'═' * 54}{RESET}")
    print(f"{BOLD}  Resultado:{RESET}")
    print(f"  {GREEN}✅  {success_count} statements executados com sucesso{RESET}")
    if error_count > 0:
        print(f"  {RED}❌  {error_count} statements com erro (veja acima){RESET}")
    else:
        print(f"  {GREEN}🎉  Migração concluída sem erros!{RESET}")
    print(f"{BOLD}{'═' * 54}{RESET}\n")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"""
{BOLD}Uso:{RESET}
  python run_migration.py "DATABASE_URL"

{BOLD}Exemplo:{RESET}
  python run_migration.py "postgresql://postgres:minha_senha@db.abcdef.supabase.co:5432/postgres"

{YELLOW}Onde encontrar a URL:{RESET}
  Supabase Dashboard → Settings → Database → Connection string
  Mode: Session (porta 5432)
""")
        sys.exit(0)

    db_url   = sys.argv[1]
    # Busca o SQL relativo a este script
    sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "supabase_migration.sql")

    run_migration(db_url, sql_path)
