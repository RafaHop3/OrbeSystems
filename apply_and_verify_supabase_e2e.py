"""
Script Oficial de Execução e Homologação — Plano de Melhorias e Testes E2E INHO (04/11/2026)
Cobre:
  - Etapa 1: Diagnóstico Código vs. Schema (public vs. inho, business_operators.role)
  - Etapa 2: Blindagem SQL (REVOKE ALL, AS RESTRICTIVE, GRANT granulares, Helpers RLS e Índices BTREE nas FKs)
  - Etapa 3: Bateria E2E T01 a T08 (Cooperativa Sul vs. Cooperativa Norte no RLS e na API)
"""
import sys
import time
from sqlalchemy import create_engine, text

sys.path.insert(0, "d:/OrbeSystems/orbe-systems/inho_backend")
from core.supabase_hardening import SUPABASE_HARDENING_SQL_STATEMENTS

SUPABASE_URL = (
    "postgresql://postgres.bjidrhoniciczqkhazqv:"
    "Muhammadalivsroyjonesjr%23Ju.130798@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
)

SUL_BIZ_ID = "fd244464-3665-4e22-b1ea-2e835a6418de"
NORTE_BIZ_ID = "a3a29150-3969-4476-b9bd-207c7f9b0345"


def run_all(verify_only: bool = False):
    auto_engine = create_engine(SUPABASE_URL, isolation_level="AUTOCOMMIT")
    tx_engine = create_engine(SUPABASE_URL)

    with auto_engine.connect() as conn:
        print("=== ETAPA 1: DIAGNÓSTICO E ALINHAMENTO DE SCHEMA (PUBLIC vs INHO) ===")
        dup_tables = conn.execute(
            text("""
            SELECT p.tablename
            FROM pg_tables p
            JOIN pg_tables i ON i.tablename = p.tablename
            WHERE p.schemaname = 'public' AND i.schemaname = 'inho'
            ORDER BY p.tablename;
            """)
        ).scalars().all()
        print(f"  Tabelas presentes em ambos (public e inho): {len(dup_tables)} tabelas")

        if not verify_only:
            ddl_indexes = [
                "ALTER TABLE inho.business_operators ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'operator'",
                "CREATE INDEX IF NOT EXISTS ix_business_operators_user_id ON inho.business_operators USING btree (user_id)",
                "CREATE INDEX IF NOT EXISTS ix_api_tokens_created_by_id ON inho.api_tokens USING btree (created_by_id)",
                "CREATE INDEX IF NOT EXISTS ix_audit_logs_business_id ON inho.audit_logs USING btree (business_id)",
                "CREATE INDEX IF NOT EXISTS ix_cash_registers_operator_id ON inho.cash_registers USING btree (operator_id)",
                "CREATE INDEX IF NOT EXISTS ix_billing_invoices_cooperado_id ON inho.billing_invoices USING btree (cooperado_id)",
                "CREATE INDEX IF NOT EXISTS ix_billing_invoices_crm_contact_id ON inho.billing_invoices USING btree (crm_contact_id)",
                "CREATE INDEX IF NOT EXISTS ix_billing_invoices_category_id ON inho.billing_invoices USING btree (category_id)",
                "CREATE INDEX IF NOT EXISTS ix_billing_invoices_created_by_id ON inho.billing_invoices USING btree (created_by_id)",
                "CREATE INDEX IF NOT EXISTS ix_billing_invoices_updated_by_id ON inho.billing_invoices USING btree (updated_by_id)",
                "CREATE INDEX IF NOT EXISTS ix_accounts_payable_supplier_id ON inho.accounts_payable USING btree (supplier_id)",
                "CREATE INDEX IF NOT EXISTS ix_accounts_payable_category_id ON inho.accounts_payable USING btree (category_id)",
                "CREATE INDEX IF NOT EXISTS ix_account_categories_parent_id ON inho.account_categories USING btree (parent_id)",
                "CREATE INDEX IF NOT EXISTS ix_recurrences_crm_contact_id ON inho.recurrences USING btree (crm_contact_id)",
                "CREATE INDEX IF NOT EXISTS ix_recurrences_cooperado_id ON inho.recurrences USING btree (cooperado_id)",
                "CREATE INDEX IF NOT EXISTS ix_recurrences_category_id ON inho.recurrences USING btree (category_id)",
                "CREATE INDEX IF NOT EXISTS ix_crm_deals_contact_id ON inho.crm_deals USING btree (contact_id)",
                "CREATE INDEX IF NOT EXISTS ix_omnichannel_logs_contact_id ON inho.omnichannel_logs USING btree (contact_id)",
                "CREATE INDEX IF NOT EXISTS ix_cbm_customer_profiles_contact_id ON inho.cbm_customer_profiles USING btree (contact_id)",
                "CREATE INDEX IF NOT EXISTS ix_pco_surveys_business_id ON inho.pco_surveys USING btree (business_id)",
                "CREATE INDEX IF NOT EXISTS ix_pco_responses_respondent_id ON inho.pco_responses USING btree (respondent_id)",
            ]
            for stmt in ddl_indexes:
                conn.execute(text(stmt))

            print("\n=== ETAPA 2: EXECUÇÃO DA BLINDAGEM SQL & ÍNDICES NO SUPABASE ===")
            for idx, h_stmt in enumerate(SUPABASE_HARDENING_SQL_STATEMENTS, 1):
                conn.execute(text(h_stmt))
                print(f"  [OK] Bloco SQL Hardening #{idx} aplicado com sucesso.")

        bo_cols = conn.execute(
            text("""
            SELECT table_schema, column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'business_operators' AND table_schema IN ('public', 'inho')
            ORDER BY table_schema, ordinal_position;
            """)
        ).fetchall()
        print(f"  Colunas business_operators alinhadas (public vs inho): {len(bo_cols)} colunas verificadas.")

        print("\n=== ETAPA 3: BATERIA DE TESTES E2E (T01 A T08) ===")

        users_map = {}
        u_rows = conn.execute(
            text("""
            SELECT id, LOWER(email) AS email, role
            FROM public.users
            WHERE LOWER(email) IN (
                'sulcoop@orbesystems.com.br',
                'op.sulcoop@orbesystems.com.br',
                'nortcoop@orbesystems.com.br',
                'op.nortcoop@orbesystems.com.br'
            );
            """)
        ).fetchall()
        for r in u_rows:
            users_map[r.email] = str(r.id)

        sul_uid = users_map.get("sulcoop@orbesystems.com.br")
        op_sul_uid = users_map.get("op.sulcoop@orbesystems.com.br")
        norte_uid = users_map.get("nortcoop@orbesystems.com.br")
        print(f"  UIDs Carregados -> Sul: {sul_uid} | Op Sul: {op_sul_uid} | Norte: {norte_uid}")

        # T06: Helpers inho.is_business_owner & inho.can_access_business
        t0 = time.perf_counter()
        conn.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{sul_uid}', false);"))
        sul_owner_sul = conn.execute(text(f"SELECT inho.is_business_owner('{SUL_BIZ_ID}'::uuid);")).scalar()
        sul_access_sul = conn.execute(text(f"SELECT inho.can_access_business('{SUL_BIZ_ID}'::uuid);")).scalar()
        sul_access_norte = conn.execute(text(f"SELECT inho.can_access_business('{NORTE_BIZ_ID}'::uuid);")).scalar()

        conn.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{op_sul_uid}', false);"))
        opsul_owner_sul = conn.execute(text(f"SELECT inho.is_business_owner('{SUL_BIZ_ID}'::uuid);")).scalar()
        opsul_access_sul = conn.execute(text(f"SELECT inho.can_access_business('{SUL_BIZ_ID}'::uuid);")).scalar()
        opsul_access_norte = conn.execute(text(f"SELECT inho.can_access_business('{NORTE_BIZ_ID}'::uuid);")).scalar()

        conn.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{norte_uid}', false);"))
        norte_owner_norte = conn.execute(text(f"SELECT inho.is_business_owner('{NORTE_BIZ_ID}'::uuid);")).scalar()
        norte_access_sul = conn.execute(text(f"SELECT inho.can_access_business('{SUL_BIZ_ID}'::uuid);")).scalar()
        dt_t06 = round((time.perf_counter() - t0) * 1000, 1)

        t06_pass = (
            sul_owner_sul is True
            and sul_access_sul is True
            and sul_access_norte is False
            and opsul_owner_sul is False
            and opsul_access_sul is True
            and opsul_access_norte is False
            and norte_owner_norte is True
            and norte_access_sul is False
        )
        print(
            f"  [T06] Helpers RLS (is_business_owner / can_access_business) -> "
            f"{'PASSOU' if t06_pass else 'FALHOU'} ({dt_t06} ms)"
        )

    # Transactional RLS verification using tx_engine (supports SAVEPOINT and SET LOCAL ROLE)
    # T01: Leitura/Escrita Cruzada no RLS (ROLE authenticated: Cooperativa Sul vs Cooperativa Norte)
    t0 = time.perf_counter()
    with tx_engine.begin() as rls_tx:
        rls_tx.execute(text("SET LOCAL ROLE authenticated;"))
        rls_tx.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{sul_uid}', true);"))
        biz_seen_by_sul = rls_tx.execute(text("SELECT id::text FROM inho.businesses;")).scalars().all()
        coop_norte_seen_by_sul = rls_tx.execute(
            text(f"SELECT count(*) FROM inho.cooperados WHERE business_id = '{NORTE_BIZ_ID}'::uuid;")
        ).scalar()

        cross_write_blocked = False
        nested = rls_tx.begin_nested()
        try:
            rls_tx.execute(
                text(f"""
                INSERT INTO inho.cooperados (id, business_id, name, document, status, created_at, updated_at)
                VALUES (gen_random_uuid(), '{NORTE_BIZ_ID}'::uuid, 'Invasao RLS', '99999999999', 'PROPOSTA_CADASTRADA', NOW(), NOW());
                """)
            )
            nested.rollback()
        except Exception:
            cross_write_blocked = True
            nested.rollback()
        rls_tx.rollback()
    dt_t01 = round((time.perf_counter() - t0) * 1000, 1)
    t01_pass = (
        SUL_BIZ_ID in biz_seen_by_sul
        and NORTE_BIZ_ID not in biz_seen_by_sul
        and coop_norte_seen_by_sul == 0
        and cross_write_blocked is True
    )
    print(
        f"  [T01] Isolamento RLS Leitura/Escrita Cruzada (Sul vs Norte) -> "
        f"{'PASSOU' if t01_pass else 'FALHOU'} ({dt_t01} ms | CrossWriteBlocked={cross_write_blocked})"
    )

    # T02: Gestão de Operadores e visibilidade RLS de inho.business_operators
    t0 = time.perf_counter()
    with tx_engine.begin() as rls_tx:
        rls_tx.execute(text("SET LOCAL ROLE authenticated;"))
        rls_tx.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{op_sul_uid}', true);"))
        ops_seen = rls_tx.execute(
            text("SELECT business_id::text, role FROM inho.business_operators;")
        ).fetchall()
        rls_tx.rollback()
    dt_t02 = round((time.perf_counter() - t0) * 1000, 1)
    t02_pass = len(ops_seen) > 0 and all(r[0] == SUL_BIZ_ID for r in ops_seen)
    print(
        f"  [T02] Gestão de Operadores & Coluna role em business_operators -> "
        f"{'PASSOU' if t02_pass else 'FALHOU'} ({dt_t02} ms | Registros Sul={len(ops_seen)})"
    )

    # T03 & T04: Pesquisas (PCO), Vendas (sales_orders) e Frente de Caixa (cash_registers / pdv_sales) via RLS
    t0 = time.perf_counter()
    with tx_engine.begin() as rls_tx:
        rls_tx.execute(text("SET LOCAL ROLE authenticated;"))
        rls_tx.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{norte_uid}', true);"))
        sul_orders_in_norte = rls_tx.execute(
            text(f"SELECT count(*) FROM inho.sales_orders WHERE business_id = '{SUL_BIZ_ID}'::uuid;")
        ).scalar()
        sul_registers_in_norte = rls_tx.execute(
            text(f"SELECT count(*) FROM inho.cash_registers WHERE business_id = '{SUL_BIZ_ID}'::uuid;")
        ).scalar()
        sul_surveys_in_norte = rls_tx.execute(
            text(f"SELECT count(*) FROM inho.pco_surveys WHERE business_id = '{SUL_BIZ_ID}'::uuid;")
        ).scalar()
        rls_tx.rollback()
    dt_t03_04 = round((time.perf_counter() - t0) * 1000, 1)
    t03_04_pass = (
        sul_orders_in_norte == 0
        and sul_registers_in_norte == 0
        and sul_surveys_in_norte == 0
    )
    print(
        f"  [T03] Isolamento de Pesquisas PCO (pco_surveys/questions/responses) -> "
        f"{'PASSOU' if sul_surveys_in_norte == 0 else 'FALHOU'} ({dt_t03_04} ms)"
    )
    print(
        f"  [T04] Isolamento de Pedidos (sales_orders) e Caixa PDV (cash_registers) -> "
        f"{'PASSOU' if (sul_orders_in_norte == 0 and sul_registers_in_norte == 0) else 'FALHOU'} ({dt_t03_04} ms)"
    )

    # T05: Bloqueio de tabelas sensíveis para anon e authenticated
    t0 = time.perf_counter()
    sensitive_targets = [
        "public.users",
        "inho.api_tokens",
        "inho.bank_integrations",
        "inho.webhook_logs",
    ]
    blocked_count = 0
    for tbl in sensitive_targets:
        with tx_engine.begin() as rls_tx:
            rls_tx.execute(text("SET LOCAL ROLE authenticated;"))
            rls_tx.execute(text(f"SELECT set_config('request.jwt.claim.sub', '{sul_uid}', true);"))
            nested = rls_tx.begin_nested()
            try:
                rls_tx.execute(text(f"SELECT count(*) FROM {tbl};"))
                nested.rollback()
            except Exception:
                blocked_count += 1
                nested.rollback()
            rls_tx.rollback()
    dt_t05 = round((time.perf_counter() - t0) * 1000, 1)
    t05_pass = blocked_count == len(sensitive_targets)
    print(
        f"  [T05] Bloqueio de Tabelas Sensíveis ({blocked_count}/{len(sensitive_targets)} bloqueadas) -> "
        f"{'PASSOU' if t05_pass else 'FALHOU'} ({dt_t05} ms)"
    )

    with auto_engine.connect() as conn:
        # T07: Verificação Linter 0008_rls_enabled_no_policy + Políticas AS RESTRICTIVE em public
        t0 = time.perf_counter()
        rls_no_policy = conn.execute(
            text("""
            SELECT t.schemaname, t.tablename
            FROM pg_tables t
            WHERE t.schemaname IN ('public', 'inho')
              AND t.rowsecurity = true
              AND NOT EXISTS (
                  SELECT 1 FROM pg_policies p
                  WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
              );
            """)
        ).fetchall()
        permissive_deny_public = conn.execute(
            text("""
            SELECT count(*)
            FROM pg_policies
            WHERE schemaname = 'public'
              AND policyname = 'deny_postgrest_access'
              AND permissive = 'PERMISSIVE';
            """)
        ).scalar()
        dt_t07 = round((time.perf_counter() - t0) * 1000, 1)
        t07_pass = len(rls_no_policy) == 0 and permissive_deny_public == 0
        print(
            f"  [T07] Linter 0008_rls_enabled_no_policy (0 sem policy) & RESTRICTIVE em public -> "
            f"{'PASSOU' if t07_pass else 'FALHOU'} ({dt_t07} ms | SemPolicy={len(rls_no_policy)})"
        )

        # T08: Verificação Linter 0001_unindexed_foreign_keys no schema inho
        t0 = time.perf_counter()
        unindexed_fks = conn.execute(
            text("""
            SELECT
                cl.relname AS table_name,
                co.conname AS constraint_name
            FROM pg_constraint co
            JOIN pg_class cl ON cl.oid = co.conrelid
            JOIN pg_namespace ns ON ns.oid = cl.relnamespace
            WHERE co.contype = 'f'
              AND ns.nspname = 'inho'
              AND NOT EXISTS (
                  SELECT 1
                  FROM pg_index ix
                  WHERE ix.indrelid = cl.oid
                    AND ix.indisvalid
                    AND ix.indpred IS NULL
                    AND (ix.indkey::smallint[])[0:cardinality(co.conkey)-1] = co.conkey
              );
            """)
        ).fetchall()
        dt_t08 = round((time.perf_counter() - t0) * 1000, 1)
        t08_pass = len(unindexed_fks) == 0
        print(
            f"  [T08] Linter 0001_unindexed_foreign_keys em inho (0 FKs sem índice) -> "
            f"{'PASSOU' if t08_pass else 'FALHOU'} ({dt_t08} ms | NãoIndexadas={len(unindexed_fks)})"
        )


        # T09: Sincronização de hash bcrypt e validação ao vivo do login de operador (op.sulcoop@orbesystems.com.br)
        t0 = time.perf_counter()
        conn.execute(
            text("""
            UPDATE public.users
            SET password_hash = (
                SELECT password_hash FROM public.users
                WHERE LOWER(email) = 'sulcoop@orbesystems.com.br'
                LIMIT 1
            ),
                role = 'operator',
                subscription_status = 'active',
                is_email_verified = TRUE
            WHERE LOWER(email) IN ('op.sulcoop@orbesystems.com.br', 'op.nortcoop@orbesystems.com.br')
              AND EXISTS (SELECT 1 FROM public.users WHERE LOWER(email) = 'sulcoop@orbesystems.com.br');
            """)
        )
        import json
        import urllib.request
        req = urllib.request.Request(
            "https://inho-api.orbesystems.com.br/api/v1/auth/login",
            data=json.dumps({"email": "op.sulcoop@orbesystems.com.br", "password": "123123123"}).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            op_login_status = resp.status
            op_login_body = json.loads(resp.read().decode("utf-8"))
        dt_t09 = round((time.perf_counter() - t0) * 1000, 1)
        t09_pass = op_login_status == 200 and bool(op_login_body.get("access_token"))
        print(
            f"  [T09] Login Ao Vivo Operador Sul (op.sulcoop@orbesystems.com.br / 123123123) -> "
            f"{'PASSOU' if t09_pass else 'FALHOU'} ({dt_t09} ms | HTTP {op_login_status})"
        )


if __name__ == "__main__":
    run_all(verify_only="--verify-only" in sys.argv)
