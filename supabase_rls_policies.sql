-- ════════════════════════════════════════════════════════════════════════════════
-- SUPABASE RLS LOCKDOWN — ORBE SYSTEMS
-- ════════════════════════════════════════════════════════════════════════════════
-- Contexto de arquitetura:
--   • O backend FastAPI conecta como role `postgres` (superuser) → bypassa RLS.
--   • O frontend NÃO usa @supabase/supabase-js; acesso ao banco é só via API.
--   • A chave `anon` do Supabase expõe o schema `public` via PostgREST.
--
-- Estratégia:
--   Ativar RLS em todas as tabelas sensíveis SEM policies para anon/authenticated.
--   Com RLS ativo e zero policies, PostgREST nega todo acesso externo.
--   NÃO use auth.uid() aqui — este projeto usa JWT próprio (FastAPI), não Supabase Auth.
--
-- Execução:
--   python run_migration.py "DATABASE_URL" --rls
-- ════════════════════════════════════════════════════════════════════════════════

-- ── Tabelas do Orbe Systems (presentes no código) ─────────────────────────────

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.math_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.math_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.imob_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.imob_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.imob_leads ENABLE ROW LEVEL SECURITY;

-- ── Tabelas financeiras (se existirem no mesmo projeto Supabase) ───────────────
-- Incluídas porque aparecem desprotegidas no dashboard; IF EXISTS evita erro.

ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.advance_write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank_statement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pdv_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_orders ENABLE ROW LEVEL SECURITY;

-- ── Infra / migração ──────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.alembic_version ENABLE ROW LEVEL SECURITY;

-- ── Policies explícitas de negação (defesa em profundidade) ───────────────────
-- Opcional mas recomendado: documenta a intenção e protege se alguém
-- criar uma policy permissiva por engano no dashboard.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users', 'user_roles', 'user_subscriptions', 'audit_logs',
    'projects_metadata', 'math_vectors', 'math_matrices',
    'imob_properties', 'imob_inspection_items', 'imob_leads',
    'transactions', 'recurring_transactions', 'scheduled_transactions',
    'advances', 'advance_write_offs', 'cash_registers',
    'accounts', 'bank_statement_entries', 'budgets', 'contracts',
    'pdv_sales', 'sales_orders', 'alembic_version'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS deny_postgrest_access ON public.%I', tbl);
      EXECUTE format(
        'CREATE POLICY deny_postgrest_access ON public.%I
           FOR ALL
           TO anon, authenticated
           USING (false)
           WITH CHECK (false)',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── Verificação (somente leitura; não altera estado) ─────────────────────────
-- Rode manualmente após aplicar:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
