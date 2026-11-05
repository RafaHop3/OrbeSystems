"""
INHO – Supabase Security Hardening, RLS Restrictive Policies, Helper Functions & FK Indexing
Alinhado com os Manuais 02, 06, 08, 10 e 16 (Plano de Melhorias e Testes E2E — 04/11/2026).

Garante de forma idempotente:
1. REVOKE ALL de `anon` e `authenticated` em `public.users`, `public.api_tokens` e `public.bank_integrations` (e demais tabelas de `public`).
2. Conversão de `deny_postgrest_access` para `AS RESTRICTIVE` em todas as tabelas do schema `public`.
3. Alinhamento estrutural entre `public.business_operators` e `inho.business_operators` (coluna `role VARCHAR(50) NOT NULL DEFAULT 'operator'`).
4. Funções helpers `inho.is_business_owner(uuid)` e `inho.can_access_business(uuid)` com `SECURITY DEFINER` e `search_path = inho, public`.
5. `GRANT USAGE ON SCHEMA inho TO authenticated` e `GRANT` granulares nas tabelas operacionais de `inho`, mantendo `inho.api_tokens`, `inho.bank_integrations` e `inho.webhook_logs` 100% bloqueadas (`REVOKE ALL` + política `AS RESTRICTIVE` explícita para zerar o alerta `0008_rls_enabled_no_policy`).
6. Políticas RLS Multi-Tenant em todas as tabelas operacionais do schema `inho`.
7. Criação automática de índices `BTREE` em todas as chaves estrangeiras sem índice de `inho` (zerando o alerta `0001_unindexed_foreign_keys`).
"""

SUPABASE_HARDENING_SQL_STATEMENTS = [
    # 1. Alinhamento estrutural businesses e business_operators (public vs inho)
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'inho' AND table_name = 'businesses'
        ) THEN
            ALTER TABLE inho.businesses
                ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(40) NOT NULL DEFAULT 'INHO_ESSENCIAL',
                ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
                ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER NOT NULL DEFAULT 29000,
                ADD COLUMN IF NOT EXISTS max_operators INTEGER NOT NULL DEFAULT 3,
                ADD COLUMN IF NOT EXISTS ai_rag_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS cbm_predictive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS cooperativa_module_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS monthly_ai_quota INTEGER NOT NULL DEFAULT 500;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'businesses'
        ) THEN
            ALTER TABLE public.businesses
                ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(40) NOT NULL DEFAULT 'INHO_ESSENCIAL',
                ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
                ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER NOT NULL DEFAULT 29000,
                ADD COLUMN IF NOT EXISTS max_operators INTEGER NOT NULL DEFAULT 3,
                ADD COLUMN IF NOT EXISTS ai_rag_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS cbm_predictive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS cooperativa_module_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS monthly_ai_quota INTEGER NOT NULL DEFAULT 500;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'inho' AND table_name = 'business_operators'
        ) THEN
            ALTER TABLE inho.business_operators
                ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'operator';
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'business_operators'
        ) THEN
            ALTER TABLE public.business_operators
                ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'operator';
        END IF;
    END $$;
    """,

    # 2. REVOKE ALL de anon e authenticated em public.users, public.api_tokens, public.bank_integrations e todo o schema public,
    #    e conversão de deny_postgrest_access para AS RESTRICTIVE
    """
    DO $$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
        LOOP
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', r.tablename);
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

            -- Se existir deny_postgrest_access como PERMISSIVE, recria como AS RESTRICTIVE
            IF EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = r.tablename
                  AND policyname = 'deny_postgrest_access'
                  AND permissive = 'PERMISSIVE'
            ) THEN
                EXECUTE format('DROP POLICY deny_postgrest_access ON public.%I;', r.tablename);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = r.tablename
                  AND policyname = 'deny_postgrest_access'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY deny_postgrest_access ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
                    r.tablename
                );
            END IF;
        END LOOP;
    END $$;
    """,

    # 3. Funções Helpers Multi-Tenant no schema inho: inho.is_business_owner e inho.can_access_business
    """
    CREATE OR REPLACE FUNCTION inho.current_jwt_user_id()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = inho, public
    AS $$
        SELECT COALESCE(
            NULLIF(current_setting('request.jwt.claim.sub', true), ''),
            NULLIF((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')
        );
    $$;
    """,
    """
    CREATE OR REPLACE FUNCTION inho.is_business_owner(p_business_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = inho, public
    AS $$
        SELECT EXISTS (
            SELECT 1
            FROM inho.businesses b
            WHERE b.id = p_business_id
              AND b.user_id::text = inho.current_jwt_user_id()
        );
    $$;
    """,
    """
    CREATE OR REPLACE FUNCTION inho.can_access_business(p_business_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = inho, public
    AS $$
        SELECT (
            inho.is_business_owner(p_business_id)
            OR EXISTS (
                SELECT 1
                FROM inho.business_operators bo
                WHERE bo.business_id = p_business_id
                  AND bo.user_id::text = inho.current_jwt_user_id()
            )
        );
    $$;
    """,

    # 4. GRANT USAGE / GRANT granulares no schema inho e bloqueio estrito de inho.api_tokens, inho.bank_integrations e inho.webhook_logs
    """
    DO $$
    DECLARE
        r RECORD;
        sensitive_tables text[] := ARRAY['api_tokens', 'bank_integrations', 'webhook_logs'];
    BEGIN
        -- Anon nunca acessa o schema inho diretamente
        REVOKE ALL ON SCHEMA inho FROM anon;
        GRANT USAGE ON SCHEMA inho TO authenticated;
        GRANT EXECUTE ON FUNCTION inho.current_jwt_user_id() TO authenticated;
        GRANT EXECUTE ON FUNCTION inho.is_business_owner(uuid) TO authenticated;
        GRANT EXECUTE ON FUNCTION inho.can_access_business(uuid) TO authenticated;

        FOR r IN
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'inho'
        LOOP
            EXECUTE format('ALTER TABLE inho.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
            EXECUTE format('REVOKE ALL ON TABLE inho.%I FROM anon;', r.tablename);

            IF r.tablename = ANY(sensitive_tables) THEN
                -- Tabelas sensíveis permanecem 100% bloqueadas para anon e authenticated
                EXECUTE format('REVOKE ALL ON TABLE inho.%I FROM anon, authenticated;', r.tablename);

                IF EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'inho'
                      AND tablename = r.tablename
                      AND policyname = 'deny_postgrest_sensitive_access'
                      AND permissive = 'PERMISSIVE'
                ) THEN
                    EXECUTE format('DROP POLICY deny_postgrest_sensitive_access ON inho.%I;', r.tablename);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE schemaname = 'inho'
                      AND tablename = r.tablename
                      AND policyname = 'deny_postgrest_sensitive_access'
                ) THEN
                    EXECUTE format(
                        'CREATE POLICY deny_postgrest_sensitive_access ON inho.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
                        r.tablename
                    );
                END IF;
            ELSE
                -- Tabelas operacionais recebem GRANT granular para authenticated (protegidas por RLS)
                EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inho.%I TO authenticated;', r.tablename);
            END IF;
        END LOOP;
    END $$;
    """,

    # 5. Políticas RLS Multi-Tenant nas tabelas operacionais do schema inho (zerando 0008_rls_enabled_no_policy)
    """
    DO $$
    DECLARE
        r RECORD;
        has_biz_col boolean;
    BEGIN
        -- 5.1 Tabela inho.businesses (id = business_id)
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'businesses') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'inho' AND tablename = 'businesses' AND policyname = 'tenant_isolation_businesses'
            ) THEN
                CREATE POLICY tenant_isolation_businesses ON inho.businesses
                    FOR ALL TO authenticated
                    USING (inho.can_access_business(id))
                    WITH CHECK (inho.is_business_owner(id) OR user_id::text = inho.current_jwt_user_id());
            END IF;
        END IF;

        -- 5.2 Tabelas com coluna business_id direta
        FOR r IN
            SELECT c.table_name
            FROM information_schema.columns c
            JOIN pg_tables t ON t.schemaname = c.table_schema AND t.tablename = c.table_name
            WHERE c.table_schema = 'inho'
              AND c.column_name = 'business_id'
              AND c.table_name NOT IN ('api_tokens', 'bank_integrations', 'webhook_logs')
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE schemaname = 'inho'
                  AND tablename = r.table_name
                  AND policyname = 'tenant_isolation_policy'
            ) THEN
                EXECUTE format(
                    'CREATE POLICY tenant_isolation_policy ON inho.%I FOR ALL TO authenticated USING (inho.can_access_business(business_id)) WITH CHECK (inho.can_access_business(business_id));',
                    r.table_name
                );
            END IF;
        END LOOP;

        -- 5.3 Tabelas filhas sem business_id direto (pdv_sales, pco_questions, pco_responses, pco_answers, data_brokers, privacy_requests)
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'pdv_sales') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'inho' AND tablename = 'pdv_sales' AND policyname = 'tenant_isolation_pdv_sales') THEN
                CREATE POLICY tenant_isolation_pdv_sales ON inho.pdv_sales
                    FOR ALL TO authenticated
                    USING (EXISTS (SELECT 1 FROM inho.cash_registers cr WHERE cr.id = cash_register_id AND inho.can_access_business(cr.business_id)))
                    WITH CHECK (EXISTS (SELECT 1 FROM inho.cash_registers cr WHERE cr.id = cash_register_id AND inho.can_access_business(cr.business_id)));
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'pco_questions') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'inho' AND tablename = 'pco_questions' AND policyname = 'tenant_isolation_pco_questions') THEN
                CREATE POLICY tenant_isolation_pco_questions ON inho.pco_questions
                    FOR ALL TO authenticated
                    USING (EXISTS (SELECT 1 FROM inho.pco_surveys s WHERE s.id = survey_id AND inho.can_access_business(s.business_id)))
                    WITH CHECK (EXISTS (SELECT 1 FROM inho.pco_surveys s WHERE s.id = survey_id AND inho.can_access_business(s.business_id)));
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'pco_responses') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'inho' AND tablename = 'pco_responses' AND policyname = 'tenant_isolation_pco_responses') THEN
                CREATE POLICY tenant_isolation_pco_responses ON inho.pco_responses
                    FOR ALL TO authenticated
                    USING (EXISTS (SELECT 1 FROM inho.pco_surveys s WHERE s.id = survey_id AND inho.can_access_business(s.business_id)))
                    WITH CHECK (EXISTS (SELECT 1 FROM inho.pco_surveys s WHERE s.id = survey_id AND inho.can_access_business(s.business_id)));
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'pco_answers') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'inho' AND tablename = 'pco_answers' AND policyname = 'tenant_isolation_pco_answers') THEN
                CREATE POLICY tenant_isolation_pco_answers ON inho.pco_answers
                    FOR ALL TO authenticated
                    USING (EXISTS (
                        SELECT 1 FROM inho.pco_responses r
                        JOIN inho.pco_surveys s ON s.id = r.survey_id
                        WHERE r.id = response_id AND inho.can_access_business(s.business_id)
                    ))
                    WITH CHECK (EXISTS (
                        SELECT 1 FROM inho.pco_responses r
                        JOIN inho.pco_surveys s ON s.id = r.survey_id
                        WHERE r.id = response_id AND inho.can_access_business(s.business_id)
                    ));
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'data_brokers') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'inho' AND tablename = 'data_brokers' AND policyname = 'read_active_data_brokers') THEN
                CREATE POLICY read_active_data_brokers ON inho.data_brokers
                    FOR SELECT TO authenticated
                    USING (is_active = true);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'inho' AND tablename = 'privacy_requests') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'inho' AND tablename = 'privacy_requests' AND policyname = 'own_privacy_requests') THEN
                CREATE POLICY own_privacy_requests ON inho.privacy_requests
                    FOR ALL TO authenticated
                    USING (user_id::text = inho.current_jwt_user_id())
                    WITH CHECK (user_id::text = inho.current_jwt_user_id());
            END IF;
        END IF;

        -- Catch-all de segurança: qualquer outra tabela em inho que ainda esteja com RLS ativo mas sem policy
        FOR r IN
            SELECT t.tablename
            FROM pg_tables t
            WHERE t.schemaname = 'inho'
              AND NOT EXISTS (
                  SELECT 1 FROM pg_policies p
                  WHERE p.schemaname = 'inho' AND p.tablename = t.tablename
              )
        LOOP
            EXECUTE format(
                'CREATE POLICY deny_default_unmapped ON inho.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
                r.tablename
            );
        END LOOP;
    END $$;
    """,

    # 6. Criação automática de índices BTREE para todas as FKs sem índice no schema inho (zerando 0001_unindexed_foreign_keys)
    """
    DO $$
    DECLARE
        fk RECORD;
        idx_name text;
    BEGIN
        FOR fk IN
            SELECT
                ns.nspname AS schema_name,
                cl.relname AS table_name,
                co.conname AS constraint_name,
                string_agg(quote_ident(att.attname), ', ' ORDER BY ord.n) AS fk_cols,
                string_agg(att.attname, '_' ORDER BY ord.n) AS fk_cols_slug
            FROM pg_constraint co
            JOIN pg_class cl ON cl.oid = co.conrelid
            JOIN pg_namespace ns ON ns.oid = cl.relnamespace
            CROSS JOIN LATERAL unnest(co.conkey) WITH ORDINALITY AS ord(attnum, n)
            JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ord.attnum
            WHERE co.contype = 'f'
              AND ns.nspname = 'inho'
              AND NOT EXISTS (
                  SELECT 1
                  FROM pg_index ix
                  WHERE ix.indrelid = cl.oid
                    AND ix.indisvalid
                    AND ix.indpred IS NULL
                    AND (ix.indkey::smallint[])[0:cardinality(co.conkey)-1] = co.conkey
              )
            GROUP BY ns.nspname, cl.relname, co.conname, co.conkey
        LOOP
            idx_name := left('ix_fk_' || fk.table_name || '_' || fk.fk_cols_slug, 63);
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I.%I USING btree (%s);',
                idx_name, fk.schema_name, fk.table_name, fk.fk_cols
            );
        END LOOP;
    END $$;
    """,
]
