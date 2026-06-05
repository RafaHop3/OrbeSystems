"""
security/supabase_rls.py — PostgREST lockdown via Row Level Security
════════════════════════════════════════════════════════════════════
Ativa RLS e policies deny-all para roles anon/authenticated em tabelas
sensíveis. O backend (role postgres) bypassa RLS; PostgREST fica bloqueado.
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine

from config import settings

RLS_TABLES = (
    "users",
    "user_roles",
    "user_subscriptions",
    "audit_logs",
    "projects_metadata",
    "math_vectors",
    "math_matrices",
    "imob_properties",
    "imob_inspection_items",
    "imob_leads",
    "transactions",
    "recurring_transactions",
    "scheduled_transactions",
    "advances",
    "advance_write_offs",
    "cash_registers",
    "accounts",
    "bank_statement_entries",
    "budgets",
    "contracts",
    "pdv_sales",
    "sales_orders",
    "alembic_version",
)


def is_supabase_postgres() -> bool:
    url = settings.DATABASE_URL or ""
    if url.startswith("sqlite"):
        return False
    return "supabase" in url


def ensure_supabase_rls(engine: Engine) -> None:
    """Idempotent RLS lockdown — safe to run on every startup."""
    if not is_supabase_postgres():
        return

    print("INFO: [RLS] Supabase detectado — aplicando lockdown PostgREST...")

    with engine.begin() as conn:
        existing = {
            row[0]
            for row in conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public'"
                )
            )
        }

        enabled = 0
        for table in RLS_TABLES:
            if table not in existing:
                continue
            conn.execute(text(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY"))
            conn.execute(text(f"DROP POLICY IF EXISTS deny_postgrest_access ON public.{table}"))
            conn.execute(
                text(
                    f"""
                    CREATE POLICY deny_postgrest_access ON public.{table}
                      FOR ALL
                      TO anon, authenticated
                      USING (false)
                      WITH CHECK (false)
                    """
                )
            )
            enabled += 1

    print(f"INFO: [RLS] Lockdown aplicado em {enabled} tabela(s).")
