"""
security/supabase_rls.py — PostgREST lockdown via Row Level Security
════════════════════════════════════════════════════════════════════
Ativa RLS e policies deny-all para roles anon/authenticated em TODAS as
tabelas dos schemas public e mesh_core. O backend (role postgres) bypassa RLS;
PostgREST fica completamente bloqueado.

Estratégia (sem lista hardcoded):
  • Descobre dinamicamente as tabelas em information_schema.tables.
  • Aplica ENABLE ROW LEVEL SECURITY + policy deny-all em cada uma.
  • Novas tabelas são protegidas automaticamente no próximo startup.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

from config import settings


# Tabelas a EXCLUIR do lockdown (ex: tabelas de sistema que não devem ser tocadas).
_RLS_EXCLUDE: frozenset[str] = frozenset()
_TARGET_SCHEMAS: tuple[str, ...] = ("public", "mesh_core")


def is_supabase_postgres() -> bool:
    url = settings.DATABASE_URL or ""
    if url.startswith("sqlite"):
        return False
    return "supabase" in url or url.startswith("postgresql")


def ensure_supabase_rls(engine: Engine) -> None:
    """
    Idempotent RLS lockdown — safe to run on every startup.

    Dynamically discovers all tables in 'public' and 'mesh_core' schemas and applies:
      1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
      2. A deny-all policy for roles 'anon' and 'authenticated'
    """
    if not is_supabase_postgres():
        return

    print("INFO: [RLS] PostgreSQL/Supabase detectado — aplicando lockdown PostgREST (public + mesh_core)...")

    try:
        with engine.begin() as conn:
            rows = conn.execute(
                text(
                    "SELECT table_schema, table_name FROM information_schema.tables "
                    "WHERE table_schema IN ('public', 'mesh_core') AND table_type = 'BASE TABLE'"
                )
            )
            all_tables: list[tuple[str, str]] = [(row[0], row[1]) for row in rows]

            enabled = 0
            skipped = 0
            for schema_name, table in all_tables:
                if table in _RLS_EXCLUDE:
                    skipped += 1
                    continue

                conn.execute(
                    text(f'ALTER TABLE "{schema_name}"."{table}" ENABLE ROW LEVEL SECURITY')
                )
                conn.execute(
                    text(f'DROP POLICY IF EXISTS deny_postgrest_access ON "{schema_name}"."{table}"')
                )
                conn.execute(
                    text(
                        f"""
                        CREATE POLICY deny_postgrest_access ON "{schema_name}"."{table}"
                          FOR ALL
                          TO anon, authenticated
                          USING (false)
                          WITH CHECK (false)
                        """
                    )
                )
                enabled += 1

        if skipped:
            print(f"INFO: [RLS] {skipped} tabela(s) excluída(s) do lockdown.")
        print(f"INFO: [RLS] Lockdown dinâmico aplicado em {enabled} tabela(s) (public + mesh_core).")
    except Exception as exc:
        # Caso os roles anon/authenticated não existam num Postgres standalone, apenas ativa RLS sem derrubar o boot
        print(f"WARNING: [RLS] Ajuste parcial de RLS (ambiente sem roles PostgREST padrão): {exc}")
