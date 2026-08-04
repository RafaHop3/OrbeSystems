"""
security/supabase_rls.py — PostgREST lockdown via Row Level Security
════════════════════════════════════════════════════════════════════
Ativa RLS e policies deny-all para roles anon/authenticated em TODAS as
tabelas do schema public. O backend (role postgres) bypassa RLS; PostgREST
fica completamente bloqueado.

Estratégia (sem lista hardcoded):
  • Descobre dinamicamente as tabelas em information_schema.tables.
  • Aplica ENABLE ROW LEVEL SECURITY + policy deny-all em cada uma.
  • Novas tabelas são protegidas automaticamente no próximo startup.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

from config import settings


# Tabelas a EXCLUIR do lockdown (ex: tabelas de sistema que não devem ser tocadas).
# Deixe vazio para proteger tudo no schema public.
_RLS_EXCLUDE: frozenset[str] = frozenset()


def is_supabase_postgres() -> bool:
    url = settings.DATABASE_URL or ""
    if url.startswith("sqlite"):
        return False
    return "supabase" in url


def ensure_supabase_rls(engine: Engine) -> None:
    """
    Idempotent RLS lockdown — safe to run on every startup.

    Dynamically discovers all tables in the 'public' schema and applies:
      1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
      2. A deny-all policy for roles 'anon' and 'authenticated'

    This approach requires zero maintenance: every new table added to the
    schema is automatically secured on the next application boot.
    """
    if not is_supabase_postgres():
        return

    print("INFO: [RLS] Supabase detectado — aplicando lockdown PostgREST (modo dinâmico)...")

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            )
        )
        all_tables: list[str] = [row[0] for row in rows]

        enabled = 0
        skipped = 0
        for table in all_tables:
            if table in _RLS_EXCLUDE:
                skipped += 1
                continue

            # Use format identifier to safely quote the table name
            conn.execute(
                text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')
            )
            conn.execute(
                text(f'DROP POLICY IF EXISTS deny_postgrest_access ON public."{table}"')
            )
            conn.execute(
                text(
                    f"""
                    CREATE POLICY deny_postgrest_access ON public."{table}"
                      FOR ALL
                      TO anon, authenticated
                      USING (false)
                      WITH CHECK (false)
                    """
                )
            )
            enabled += 1

    if skipped:
        print(f"INFO: [RLS] {skipped} tabela(s) excluída(s) do lockdown (lista de exclusão).")
    print(f"INFO: [RLS] Lockdown dinâmico aplicado em {enabled} tabela(s) públicas.")
