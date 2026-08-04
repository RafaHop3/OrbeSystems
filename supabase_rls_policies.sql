-- ════════════════════════════════════════════════════════════════════════════════
-- SUPABASE RLS LOCKDOWN — ORBE SYSTEMS (MODO DINÂMICO)
-- ════════════════════════════════════════════════════════════════════════════════
-- Contexto de arquitetura:
--   • O backend FastAPI conecta como role `postgres` (superuser) → bypassa RLS.
--   • O frontend NÃO usa @supabase/supabase-js; acesso ao banco é só via API.
--   • A chave `anon` do Supabase expõe o schema `public` via PostgREST.
--
-- Estratégia (sem lista hardcoded):
--   Este script itera DINAMICAMENTE sobre todas as tabelas do schema `public`
--   e aplica ENABLE ROW LEVEL SECURITY + uma policy deny-all para anon/authenticated.
--   Novas tabelas são protegidas automaticamente sem nenhuma manutenção manual.
--
-- Execução:
--   python run_migration.py "DATABASE_URL" --rls
-- ════════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl       TEXT;
  tbl_count INTEGER := 0;
BEGIN
  -- Itera sobre TODAS as tabelas BASE no schema public
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type   = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- 1. Ativar Row Level Security
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- 2. Remover policy anterior (idempotência)
    EXECUTE format('DROP POLICY IF EXISTS deny_postgrest_access ON public.%I', tbl);

    -- 3. Criar policy deny-all para anon e authenticated (PostgREST lockdown)
    EXECUTE format(
      $policy$
        CREATE POLICY deny_postgrest_access ON public.%I
          FOR ALL
          TO anon, authenticated
          USING (false)
          WITH CHECK (false)
      $policy$,
      tbl
    );

    tbl_count := tbl_count + 1;
  END LOOP;

  RAISE NOTICE 'RLS LOCKDOWN: % tabelas protegidas no schema public.', tbl_count;
END $$;

-- ── Verificação (somente leitura; não altera estado) ─────────────────────────
-- Rode manualmente após aplicar para confirmar que rowsecurity = true em todas:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;

