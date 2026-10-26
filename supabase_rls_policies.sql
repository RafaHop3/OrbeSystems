-- ════════════════════════════════════════════════════════════════════════════════
-- SUPABASE RLS LOCKDOWN — ORBE SYSTEMS & MESH CORE (MODO DINÂMICO)
-- ════════════════════════════════════════════════════════════════════════════════
-- Contexto de arquitetura:
--   • O backend FastAPI conecta como role `postgres` (superuser) → bypassa RLS.
--   • O frontend NÃO usa @supabase/supabase-js; acesso ao banco é só via API.
--   • A chave `anon` do Supabase expõe os schemas via PostgREST.
--
-- Estratégia (sem lista hardcoded):
--   Este script itera DINAMICAMENTE sobre todas as tabelas dos schemas `public`
--   e `mesh_core` e aplica ENABLE ROW LEVEL SECURITY + uma policy deny-all para
--   anon/authenticated.
-- ════════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  rec       RECORD;
  tbl_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('public', 'mesh_core')
      AND table_type   = 'BASE TABLE'
    ORDER BY table_schema, table_name
  LOOP
    -- 1. Ativar Row Level Security
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', rec.table_schema, rec.table_name);

    -- 2. Remover policy anterior (idempotência)
    EXECUTE format('DROP POLICY IF EXISTS deny_postgrest_access ON %I.%I', rec.table_schema, rec.table_name);

    -- 3. Criar policy deny-all para anon e authenticated (PostgREST lockdown)
    EXECUTE format(
      $policy$
        CREATE POLICY deny_postgrest_access ON %I.%I
          FOR ALL
          TO anon, authenticated
          USING (false)
          WITH CHECK (false)
      $policy$,
      rec.table_schema,
      rec.table_name
    );

    tbl_count := tbl_count + 1;
  END LOOP;

  RAISE NOTICE 'RLS LOCKDOWN: % tabelas protegidas nos schemas public e mesh_core.', tbl_count;
END $$;
